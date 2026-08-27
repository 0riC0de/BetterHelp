import fs from "node:fs/promises";
import path from "node:path";

import qrcode from "qrcode-terminal";
import * as Whaileys from "whaileys";

import { HttpError } from "../errors/http-error.js";
import { getErrorMessage } from "../utils/errors.js";
import { publishTicketEvent } from "../realtime/ticket-events.js";
import { configureProfilePictureUrlProvider } from "../packages/profile-pictures/profile-picture.service.js";
import { createPendingOutgoingMessage, markOutgoingMessage } from "./ticket.service.js";
import { getMediaPlaceholder, isSupportedMediaMimeType, MAXIMUM_MEDIA_BYTES, normalizeMediaMimeType } from "../domain/media.js";
import { normalizeChatId } from "./whatsapp/whatsapp.shared.js";
import { WhatsAppMediaDownloader } from "./whatsapp/whatsapp-media-downloader.js";
import { WhatsAppMessageProcessor } from "./whatsapp/whatsapp-message-processor.js";

const WHATSAPP_AUTH_DIRECTORY = path.resolve("data/whatsapp-auth");
const makeWASocket = (Whaileys as any).default as any;
const { Browsers, DisconnectReason, useMultiFileAuthState } = Whaileys;

type WhatsAppSocket = any;

class WhatsAppService {
  private socket: WhatsAppSocket | undefined;

  private initializationPromise: Promise<WhatsAppSocket> | undefined;

  private isShuttingDown = false;

  private readonly activeMessageTasks = new Set<Promise<void>>();

  private mediaDownloader: WhatsAppMediaDownloader | undefined;

  private messageProcessor: WhatsAppMessageProcessor | undefined;

  private pendingOpenResolver: ((socket: WhatsAppSocket) => void) | undefined;

  private pendingOpenRejecter: ((error: unknown) => void) | undefined;

  public async refreshWhatsAppProfilePictureUrl(chatId: string): Promise<string | null> {
    if (!this.socket) return null;

    try {
      return (await this.socket.profilePictureUrl(chatId, "image")) || null;
    } catch (error: unknown) {
      console.warn("WhatsApp profile picture lookup failed", { chatId, reason: getErrorMessage(error) });
      return null;
    }
  }

  private createWhatsAppSocket(auth: unknown): WhatsAppSocket {
    return makeWASocket({
      auth,
      printQRInTerminal: false,
      browser: Browsers.macOS("Desktop"),
      markOnlineOnConnect: false,
    });
  }

  private buildMediaMessagePayload(
    mimeType: string,
    media: { data: Buffer; fileName: string },
    caption: string,
  ): Record<string, unknown> {
    if (mimeType.startsWith("image/")) {
      return { image: media.data, caption, mimetype: mimeType, fileName: media.fileName };
    }

    if (mimeType.startsWith("video/")) {
      return { video: media.data, caption, mimetype: mimeType, fileName: media.fileName };
    }

    if (mimeType.startsWith("audio/")) {
      return { audio: media.data, mimetype: mimeType, fileName: media.fileName };
    }

    return { document: media.data, caption, mimetype: mimeType, fileName: media.fileName };
  }

  private registerSocketEventHandlers(socket: WhatsAppSocket): void {
    socket.ev.on("connection.update", (update: { connection?: string; qr?: string; lastDisconnect?: { error?: { output?: { statusCode?: number } } } }) => {
      if (update.qr) {
        console.log("Scan this QR code with WhatsApp to authenticate:");
        qrcode.generate(update.qr, { small: true });
      }

      if (update.connection === "open") {
        console.log("WhatsApp socket is ready.");
        const resolver = this.pendingOpenResolver;
        this.pendingOpenResolver = undefined;
        this.pendingOpenRejecter = undefined;
        resolver?.(socket);
        return;
      }

      if (update.connection === "close") {
        const statusCode = update.lastDisconnect?.error?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        console.warn("WhatsApp socket disconnected", { loggedOut, statusCode });

        if (this.socket === socket) {
          this.socket = undefined;
          this.mediaDownloader = undefined;
          this.messageProcessor = undefined;
        }

        const rejecter = this.pendingOpenRejecter;
        if (rejecter) {
          this.pendingOpenResolver = undefined;
          this.pendingOpenRejecter = undefined;
          rejecter(new Error(loggedOut ? "WhatsApp logged out" : "WhatsApp disconnected before startup completed"));
        }
      }
    });

    socket.ev.on("messages.upsert", ({ messages }: { messages: any[] }) => {
      if (this.isShuttingDown || !this.messageProcessor) {
        return;
      }

      for (const message of messages) {
        const messageTask = this.messageProcessor.handleIncomingMessage(message);
        this.activeMessageTasks.add(messageTask);

        void messageTask
          .catch((error: unknown) => {
            console.error("Failed to process incoming WhatsApp message:", getErrorMessage(error));
          })
          .finally(() => {
            this.activeMessageTasks.delete(messageTask);
          });
      }
    });

    socket.ev.on("creds.update", async () => {
      // `useMultiFileAuthState` persists credentials for us via the returned save function.
    });

    socket.ev.on("messages.update", () => {
      // no-op: keep the socket alive and allow future extension points
    });
  }

  public async initialize(): Promise<WhatsAppSocket> {
    if (this.isShuttingDown) {
      throw new Error("WhatsApp service is shutting down");
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    await fs.mkdir(WHATSAPP_AUTH_DIRECTORY, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(WHATSAPP_AUTH_DIRECTORY);

    const socket = this.createWhatsAppSocket(state);
    this.socket = socket;
    this.mediaDownloader = new WhatsAppMediaDownloader(socket);
    this.messageProcessor = new WhatsAppMessageProcessor(socket, this.mediaDownloader);

    socket.ev.on("creds.update", saveCreds);
    this.registerSocketEventHandlers(socket);

    this.initializationPromise = new Promise<WhatsAppSocket>((resolve, reject) => {
      this.pendingOpenResolver = resolve;
      this.pendingOpenRejecter = reject;
    }).catch(async (error: unknown) => {
      if (this.socket === socket) {
        this.socket = undefined;
        this.mediaDownloader = undefined;
        this.messageProcessor = undefined;
        this.initializationPromise = undefined;
      }
      throw error;
    });

    return this.initializationPromise;
  }

  public async sendWhatsAppMessage(recipient: string, text: string): Promise<any> {
    if (!this.socket) {
      throw new Error("WhatsApp client has not been initialized");
    }

    return this.socket.sendMessage(normalizeChatId(recipient), { text });
  }

  public async sendTicketReply(
    ticketId: number,
    technicianId: number,
    text: string,
    clientRequestId: string,
  ) {
    const pending = await createPendingOutgoingMessage(
      ticketId,
      technicianId,
      text,
      clientRequestId,
    );
    if (!pending.isNew) return pending.message;

    const pendingMessage =
      pending.message.deliveryStatus === "PENDING"
        ? pending.message
        : await markOutgoingMessage(pending.message.id, "PENDING");

    publishTicketEvent({ type: "message", ticket: pending.ticket, message: pendingMessage });

    let sent: any;
    try {
      sent = await this.sendWhatsAppMessage(pending.ticket.chatId ?? pending.ticket.userPhone, text);
    } catch (error: unknown) {
      const message = await markOutgoingMessage(pending.message.id, "FAILED");
      publishTicketEvent({ type: "message", ticket: pending.ticket, message });
      throw new HttpError(503, `WhatsApp message could not be sent: ${getErrorMessage(error)}`);
    }

    try {
      const message = await markOutgoingMessage(pending.message.id, "SENT", sent.key?.id ?? null);
      publishTicketEvent({ type: "message", ticket: pending.ticket, message });
      return message;
    } catch (error: unknown) {
      throw new HttpError(
        500,
        `WhatsApp delivered the message but history could not be updated: ${getErrorMessage(error)}`,
      );
    }
  }

  public async sendTicketMedia(
    ticketId: number,
    technicianId: number,
    media: { data: Buffer; mimeType: string; fileName: string },
    caption: string,
    clientRequestId: string,
  ) {
    if (!this.socket) throw new HttpError(503, "WhatsApp client has not been initialized");

    const mimeType = normalizeMediaMimeType(media.mimeType);
    if (!isSupportedMediaMimeType(mimeType)) throw new HttpError(400, "Unsupported media type");
    if (!media.data.byteLength || media.data.byteLength > MAXIMUM_MEDIA_BYTES) {
      throw new HttpError(400, "Media must be between 1 byte and 16 MB");
    }

    const body = caption || getMediaPlaceholder(mimeType);
    const pending = await createPendingOutgoingMessage(
      ticketId,
      technicianId,
      body,
      clientRequestId,
      { mimeType, data: media.data.toString("base64"), fileName: media.fileName },
    );
    if (!pending.isNew) return pending.message;

    const pendingMessage = pending.message.deliveryStatus === "PENDING"
      ? pending.message
      : await markOutgoingMessage(pending.message.id, "PENDING");
    publishTicketEvent({ type: "message", ticket: pending.ticket, message: pendingMessage });

    let sent: any;
    try {
      sent = await this.socket.sendMessage(
        normalizeChatId(pending.ticket.chatId ?? pending.ticket.userPhone),
        this.buildMediaMessagePayload(mimeType, media, caption),
      );
    } catch (error: unknown) {
      const message = await markOutgoingMessage(pending.message.id, "FAILED");
      publishTicketEvent({ type: "message", ticket: pending.ticket, message });
      throw new HttpError(503, `WhatsApp media could not be sent: ${getErrorMessage(error)}`);
    }

    try {
      const message = await markOutgoingMessage(pending.message.id, "SENT", sent.key?.id ?? null);
      publishTicketEvent({ type: "message", ticket: pending.ticket, message });
      return message;
    } catch (error: unknown) {
      throw new HttpError(
        500,
        `WhatsApp delivered the media but history could not be updated: ${getErrorMessage(error)}`,
      );
    }
  }

  public async destroy(): Promise<void> {
    this.isShuttingDown = true;

    if (this.initializationPromise) {
      await Promise.allSettled([this.initializationPromise]);
    }

    await Promise.allSettled([...this.activeMessageTasks]);

    const socket = this.socket;
    if (!socket) return;

    try {
      socket.ev?.removeAllListeners?.();
      socket.ws?.close?.();
    } finally {
      if (this.socket === socket) {
        this.socket = undefined;
        this.mediaDownloader = undefined;
        this.messageProcessor = undefined;
        this.initializationPromise = undefined;
      }
    }
  }
}

const whatsappService = new WhatsAppService();

configureProfilePictureUrlProvider((chatId) => whatsappService.refreshWhatsAppProfilePictureUrl(chatId));

export async function refreshWhatsAppProfilePictureUrl(chatId: string): Promise<string | null> {
  return whatsappService.refreshWhatsAppProfilePictureUrl(chatId);
}

export function initializeWhatsApp(): Promise<WhatsAppSocket> {
  return whatsappService.initialize();
}

export async function sendWhatsAppMessage(recipient: string, text: string): Promise<any> {
  return whatsappService.sendWhatsAppMessage(recipient, text);
}

export async function sendTicketReply(
  ticketId: number,
  technicianId: number,
  text: string,
  clientRequestId: string,
) {
  return whatsappService.sendTicketReply(ticketId, technicianId, text, clientRequestId);
}

export async function sendTicketMedia(
  ticketId: number,
  technicianId: number,
  media: { data: Buffer; mimeType: string; fileName: string },
  caption: string,
  clientRequestId: string,
) {
  return whatsappService.sendTicketMedia(ticketId, technicianId, media, caption, clientRequestId);
}

export async function destroyWhatsApp(): Promise<void> {
  await whatsappService.destroy();
}
