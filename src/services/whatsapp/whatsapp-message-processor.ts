import type { Prisma as PrismaTypes } from "@prisma/client";
import type { WAMessage } from "whaileys";

import prisma from "../../db/prisma.js";
import { getMediaPlaceholder, isSupportedMediaMimeType, MAXIMUM_MEDIA_BYTES } from "../../domain/media.js";
import { createMediaFileName, inferMediaMimeType } from "../../domain/infer-media-mime-type.js";
import { createMediaStorageKey, saveMediaFile } from "../../domain/media-storage.js";
import { TICKET_VIEW_SELECT, toTicketDto, type TicketDto } from "../../domain/ticket-view.js";
import { publishTicketEvent } from "../../realtime/ticket-events.js";
import { getErrorMessage } from "../../utils/errors.js";
import { triageIssueWithGemini } from "../gemini.service.js";
import { findMachineIdForPcNumber, getInventoryContext } from "../inventory.service.js";
import { acceptIncomingMessage, recordAutomaticReply } from "../ticket.service.js";
import { shouldSendWhatsAppAutoReplies } from "../../config/environment.js";
import { downloadProfilePictureFromUrl } from "../../packages/profile-pictures/profile-picture.service.js";
import {
  MAXIMUM_PROCESSED_MESSAGE_IDS,
  getMessageId,
  getMessageIgnoreReason,
  getMessageReference,
  getNumberProperty,
  getRecord,
  getStringProperty,
  getUserName,
  getUserPhone,
  toJsonObject,
  type IncomingTicketRequest,
  type WhatsAppMediaMetadata,
} from "./whatsapp.shared.js";
import type { WhatsAppMediaDownloader } from "./whatsapp-media-downloader.js";
import type { TriageResult } from "../../domain/triage.js";

function getMessageContentType(message: WAMessage): string {
  const content = message.message ?? {};
  return Object.keys(content)[0] ?? "unknown";
}

const MEDIA_MESSAGE_TYPES = new Set([
  "imageMessage",
  "videoMessage",
  "audioMessage",
  "documentMessage",
  "stickerMessage",
]);

function unwrapMessageContent(content: unknown): Record<string, unknown> | null {
  const record = getRecord(content);
  if (!record) return null;

  const nested = record.message;
  if (nested && typeof nested === "object") {
    return getRecord(nested) ?? record;
  }

  return record;
}

function getMessageBody(message: WAMessage): string {
  const content = unwrapMessageContent(message.message);
  if (!content) return "";

  return (
    getStringProperty(content, "text") ??
    getStringProperty(content, "caption") ??
    getStringProperty(content, "conversation") ??
    getStringProperty(content, "selectedDisplayText") ??
    ""
  );
}

function getMediaMetadata(message: WAMessage): WhatsAppMediaMetadata {
  const content = unwrapMessageContent(message.message);
  return {
    messageType: getMessageContentType(message),
    hasMedia: Boolean(content),
    declaredMimeType: getStringProperty(content, "mimetype"),
    fileName: getStringProperty(content, "fileName"),
    size: getNumberProperty(content, "fileLength"),
    mediaStage: getStringProperty(content, "mediaStage"),
    hasDirectPath: Boolean(getStringProperty(content, "directPath")),
    hasMediaKey: Boolean(getStringProperty(content, "mediaKey")),
    hasFileHash: Boolean(getStringProperty(content, "filehash")),
    hasEncFileHash: Boolean(getStringProperty(content, "encFilehash")),
    messageIdInfo: {
      idType: typeof message.key?.id,
      idKeys: message.key ? Object.keys(message.key).sort() : [],
      hasSerialized: typeof message.key?.id === "string",
      serializedValue: typeof message.key?.id === "string" ? message.key.id : null,
      rawIdValue: typeof message.key?.id === "string" ? message.key.id : null,
    },
  };
}

export class WhatsAppMessageProcessor {
  private readonly processedMessageIds = new Set<string>();

  constructor(
    private readonly socket: any,
    private readonly mediaDownloader: WhatsAppMediaDownloader,
  ) {}

  private rememberMessage(messageId: string): void {
    this.processedMessageIds.add(messageId);

    if (this.processedMessageIds.size <= MAXIMUM_PROCESSED_MESSAGE_IDS) {
      return;
    }

    const oldestMessageId = this.processedMessageIds.values().next().value;
    if (oldestMessageId !== undefined) {
      this.processedMessageIds.delete(oldestMessageId);
    }
  }

  private async saveTicketTriage(ticketId: number, triage: TriageResult): Promise<TicketDto> {
    const machineId = await findMachineIdForPcNumber(triage.pcNumber);
    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        pcNumber: triage.pcNumber,
        summary: triage.userFriendlySummary,
        aiDecision: triage.classification,
        aiConfidence: triage.confidenceScore,
        suggestedScript: triage.suggestedScript,
        machineId,
      },
      select: TICKET_VIEW_SELECT,
    });

    return toTicketDto(ticket);
  }

  private createTriageReply(triage: TriageResult): string {
    if (triage.needsPcClarification) {
      return "We received your request. Please reply with your computer/workstation number so IT can continue.";
    }

    const pcReference = triage.pcNumber === null ? "your workstation" : `PC #${triage.pcNumber}`;

    if (triage.classification === "CAN_AUTO_FIX") {
      return `We received your request for ${pcReference}. Automated diagnostics are now running.`;
    }

    return `Your IT ticket is open for ${pcReference}. An IT technician has been notified.`;
  }

  private async extractTicketRequest(message: WAMessage, messageReference: string): Promise<IncomingTicketRequest> {
    const chatId = message.key.remoteJid ?? "";
    const userPhone = getUserPhone(message as any, null);
    const userName = message.pushName ? getUserName({ name: message.pushName, notify: message.pushName }) : null;

    let profilePictureUrl: string | null = null;
    let profilePictureMimeType: string | null = null;
    let profilePictureData: string | null = null;

    try {
      profilePictureUrl = await this.socket.profilePictureUrl(chatId, "image");
      if (profilePictureUrl) {
        const profilePicture = await downloadProfilePictureFromUrl(profilePictureUrl);
        profilePictureMimeType = profilePicture?.mimeType ?? null;
        profilePictureData = profilePicture?.buffer.toString("base64") ?? null;
      }
    } catch {
      profilePictureUrl = null;
    }

    let mediaMimeType: string | null = null;
    let mediaData: string | null = null;
    let mediaFileName: string | null = null;
    let mediaStorageKeyForMessage: string | null = null;
    let mediaError: string | null = null;
    let mediaMetadata: PrismaTypes.InputJsonValue | null = null;

    const initialMetadata = getMediaMetadata(message);

    if (MEDIA_MESSAGE_TYPES.has(initialMetadata.messageType)) {
      console.log("WhatsApp inbound media metadata", { messageReference, ...initialMetadata });

      try {
        const mediaDownload = await this.mediaDownloader.downloadMessageMediaWithRetry(message, messageReference);
        const { media } = mediaDownload;
        const byteLength = media?.data?.byteLength ?? 0;
        const mimeType = inferMediaMimeType(
          media?.mimetype ?? initialMetadata.declaredMimeType,
          initialMetadata.messageType,
          media?.filename ?? initialMetadata.fileName,
        );

        console.log("WhatsApp media download inspected", {
          messageReference,
          messageType: initialMetadata.messageType,
          declaredMimeType: media?.mimetype ?? initialMetadata.declaredMimeType,
          inferredMimeType: mimeType || null,
          fileName: media?.filename ?? initialMetadata.fileName,
          byteLength,
        });

        if (media && isSupportedMediaMimeType(mimeType) && byteLength > 0 && byteLength <= MAXIMUM_MEDIA_BYTES) {
          mediaMimeType = mimeType;
          mediaData = media.data.toString("base64");
          mediaFileName = createMediaFileName(messageReference, mimeType, media.filename ?? initialMetadata.fileName);
          const mediaStorageExtension = mimeType?.split("/")[1]?.split(";")[0] ?? null;
          const mediaStorageKey = createMediaStorageKey(`${messageReference}:${message.messageTimestamp ?? Date.now()}`, mediaStorageExtension);
          saveMediaFile(mediaStorageKey, media.data, mimeType);
          mediaStorageKeyForMessage = mediaStorageKey;
          mediaMetadata = toJsonObject({
            initialMetadata,
            attempts: mediaDownload.attempts,
            rawFallback: mediaDownload.rawFallback,
            saved: { mimeType, fileName: mediaFileName, byteLength },
          });
        } else if (message.message) {
          mediaError = !media ? "download_returned_no_media" : !byteLength ? "download_returned_empty_data" : !isSupportedMediaMimeType(mimeType) ? "unsupported_mime_type" : "media_too_large";
          mediaMetadata = toJsonObject({
            initialMetadata,
            attempts: mediaDownload.attempts,
            rawFallback: mediaDownload.rawFallback,
            rejected: {
              reason: mediaError,
              declaredMimeType: media?.mimetype ?? initialMetadata.declaredMimeType,
              inferredMimeType: mimeType || null,
              fileName: media?.filename ?? initialMetadata.fileName,
              byteLength,
              maximumBytes: MAXIMUM_MEDIA_BYTES,
            },
          });
          console.warn("WhatsApp media ignored", {
            messageReference,
            messageType: initialMetadata.messageType,
            declaredMimeType: media?.mimetype ?? initialMetadata.declaredMimeType,
            inferredMimeType: mimeType || null,
            byteLength,
            maximumBytes: MAXIMUM_MEDIA_BYTES,
            reason: mediaError,
          });
        }
      } catch (error: unknown) {
        mediaError = "download_threw_exception";
        mediaMetadata = toJsonObject({ initialMetadata, error: getErrorMessage(error) });
        console.warn("WhatsApp media download failed", { messageReference, reason: getErrorMessage(error) });
      }
    }

    return {
      chatId,
      userPhone,
      userName,
      rawMessage: getMessageBody(message) || (mediaData ? getMediaPlaceholder(mediaMimeType) : `${getMediaPlaceholder(inferMediaMimeType(null, getMessageContentType(message), mediaFileName))} unavailable`),
      profilePictureUrl,
      profilePictureMimeType,
      profilePictureData,
      mediaMimeType,
      mediaData,
      mediaStorageKey: mediaStorageKeyForMessage,
      mediaFileName,
      mediaError,
      mediaMetadata,
    };
  }

  public async handleIncomingMessage(message: WAMessage): Promise<void> {
    const messageId = getMessageId(message);
    const messageReference = getMessageReference({ key: message.key, messageTimestamp: Number(message.messageTimestamp ?? Date.now() / 1000) });

    console.log("WhatsApp message received", {
      messageReference,
      timestamp: message.messageTimestamp,
      fromMe: message.key.fromMe,
      type: getMessageContentType(message),
      chatSuffix: (message.key.remoteJid ?? "").slice(-8),
    });

    if (messageId && this.processedMessageIds.has(messageId)) {
      console.log("Duplicate WhatsApp message ignored", { messageReference });
      return;
    }

    const ignoreReason = getMessageIgnoreReason(message as any);
    if (ignoreReason) {
      console.log("WhatsApp message ignored", { messageReference, reason: ignoreReason });
      return;
    }

    if (messageId) {
      this.rememberMessage(messageId);
    } else {
      console.warn("WhatsApp message has no ID; deduplication skipped", { messageReference });
    }

    let request: IncomingTicketRequest;
    let ticketId: number;

    try {
      const occurredAtSeconds = Number(message.messageTimestamp ?? Math.floor(Date.now() / 1_000));
      request = await this.extractTicketRequest(message, messageReference);
      const accepted = await acceptIncomingMessage({
        chatId: request.chatId,
        userPhone: request.userPhone,
        userName: request.userName,
        profilePictureUrl: request.profilePictureUrl,
        profilePictureMimeType: request.profilePictureMimeType,
        profilePictureData: request.profilePictureData,
        body: request.rawMessage,
        mediaMimeType: request.mediaMimeType,
        mediaData: request.mediaData,
        mediaStorageKey: request.mediaStorageKey,
        mediaFileName: request.mediaFileName,
        mediaError: request.mediaError,
        mediaMetadata: request.mediaMetadata,
        externalMessageId: messageId ?? null,
        occurredAt: new Date(occurredAtSeconds * 1_000),
      });

      ticketId = accepted.ticket.id;
      if (!accepted.isNew) return;
      if (accepted.isNewTicket) {
        publishTicketEvent({ type: "created", ticket: accepted.ticket });
      }
      publishTicketEvent({ type: "message", ticket: accepted.ticket, message: accepted.message });
      if (!accepted.isNewTicket && accepted.ticket.pcNumber !== null) return;
    } catch (error: unknown) {
      if (messageId) {
        this.processedMessageIds.delete(messageId);
      }

      console.error("WhatsApp ticket acceptance failed", { messageReference, reason: getErrorMessage(error) });
      throw error;
    }

    console.log("Helpdesk ticket accepted for triage", { messageReference, ticketId });

    const correlationId = `ticket-${ticketId}:${messageReference}`;
    const inventoryContext = await getInventoryContext(request.rawMessage);
    const triage = await triageIssueWithGemini(request.rawMessage, correlationId, inventoryContext);

    try {
      const ticket = await this.saveTicketTriage(ticketId, triage);
      publishTicketEvent({ type: "updated", reason: "triage_completed", ticket });
    } catch (error: unknown) {
      console.error("Helpdesk ticket triage persistence failed", { messageReference, ticketId, reason: getErrorMessage(error) });
      throw error;
    }

    console.log("Helpdesk ticket triage persisted", {
      messageReference,
      ticketId,
      classification: triage.classification,
      suggestedScript: triage.suggestedScript,
      confidenceScore: triage.confidenceScore,
    });

    if (shouldSendWhatsAppAutoReplies()) {
      const replyText = this.createTriageReply(triage);
      const reply = await this.socket.sendMessage(message.key.remoteJid ?? request.chatId, { text: replyText });
      const replyMessage = await recordAutomaticReply(ticketId, replyText, reply.key?.id ?? null);
      const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: TICKET_VIEW_SELECT });
      publishTicketEvent({ type: "message", ticket: toTicketDto(ticket), message: replyMessage });
      console.log("WhatsApp triage reply sent", { messageReference, ticketId });
    }
  }
}
