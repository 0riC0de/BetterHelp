import qrcode from "qrcode-terminal";
import type { Prisma as PrismaTypes } from "@prisma/client";
import WhatsAppWeb from "whatsapp-web.js";
import type {
  Contact,
  Message,
  WAState,
} from "whatsapp-web.js";

import {
  getPuppeteerExecutablePath,
  shouldSendWhatsAppAutoReplies,
} from "../config/environment.js";
import prisma from "../db/prisma.js";
import {
  TICKET_VIEW_SELECT,
  toTicketDto,
  type TicketDto,
} from "../domain/ticket-view.js";
import type { TriageResult } from "../domain/triage.js";
import { createMediaFileName, inferMediaMimeType } from "../domain/infer-media-mime-type.js";
import {
  getMediaPlaceholder,
  isSupportedMediaMimeType,
  MAXIMUM_MEDIA_BYTES,
  normalizeMediaMimeType,
} from "../domain/media.js";
import { publishTicketEvent } from "../realtime/ticket-events.js";
import { configureProfilePictureUrlProvider, downloadProfilePictureFromUrl } from "../packages/profile-pictures/profile-picture.service.js";
import { HttpError } from "../errors/http-error.js";
import { getErrorMessage } from "../utils/errors.js";
import { triageIssueWithGemini } from "./gemini.service.js";
import {
  findMachineIdForPcNumber,
  getInventoryContext,
} from "./inventory.service.js";
import {
  acceptIncomingMessage,
  createPendingOutgoingMessage,
  markOutgoingMessage,
  recordAutomaticReply,
} from "./ticket.service.js";

const { Client, LocalAuth, MessageMedia } = WhatsAppWeb;

const MAXIMUM_PROCESSED_MESSAGE_IDS = 1_000;
const CONTACT_LOOKUP_TIMEOUT_MS = 5_000;
const MEDIA_DOWNLOAD_RETRY_DELAYS_MS = [0, 750, 2_000, 5_000] as const;
const DIRECT_CHAT_SUFFIXES = ["@c.us", "@lid"] as const;

type WhatsAppClient = InstanceType<typeof Client>;

interface IncomingTicketRequest {
  chatId: string;
  userPhone: string;
  userName: string | null;
  rawMessage: string;
  profilePictureUrl: string | null;
  profilePictureMimeType: string | null;
  profilePictureData: string | null;
  mediaMimeType: string | null;
  mediaData: string | null;
  mediaFileName: string | null;
  mediaError: string | null;
  mediaMetadata: PrismaTypes.InputJsonValue | null;
}

interface WhatsAppMediaMetadata {
  messageType: string;
  hasMedia: boolean;
  declaredMimeType: string | null;
  fileName: string | null;
  size: number | null;
  mediaStage: string | null;
  hasDirectPath: boolean;
  hasMediaKey: boolean;
  hasFileHash: boolean;
  hasEncFileHash: boolean;
}

interface WhatsAppMediaDownloadAttempt {
  attempt: number;
  metadata: WhatsAppMediaMetadata;
  returnedMedia: boolean;
  declaredMimeType: string | null;
  fileName: string | null;
  byteLength: number;
  error: string | null;
}

interface WhatsAppMediaDownloadResult {
  media: WhatsAppDownloadedMedia | undefined;
  attempts: WhatsAppMediaDownloadAttempt[];
  rawFallback: WhatsAppRawMediaDownloadResult | null;
}

interface WhatsAppDownloadedMedia {
  mimetype: string | null | undefined;
  data: string;
  filename?: string | null;
  filesize?: number | null;
}

interface WhatsAppRawMediaDownloadResult {
  returnedMedia: boolean;
  reason: string | null;
  error: string | null;
  byteLength: number;
  declaredMimeType: string | null;
  fileName: string | null;
  metadata: PrismaTypes.InputJsonValue | null;
}

interface PuppeteerPageLike {
  evaluate<T>(pageFunction: (...args: never[]) => T | Promise<T>, ...args: unknown[]): Promise<T>;
}

let client: WhatsAppClient | undefined;
let initializationPromise: Promise<WhatsAppClient> | undefined;
let isShuttingDown = false;
const processedMessageIds = new Set<string>();
const activeMessageTasks = new Set<Promise<void>>();

function hasDirectChatSuffix(chatId: string): boolean {
  return DIRECT_CHAT_SUFFIXES.some((suffix) => chatId.endsWith(suffix));
}

function getMessageReference(message: Message): string {
  return message.id?._serialized?.slice(-12) || `time-${message.timestamp}`;
}

function rememberMessage(messageId: string): void {
  processedMessageIds.add(messageId);

  if (processedMessageIds.size <= MAXIMUM_PROCESSED_MESSAGE_IDS) {
    return;
  }

  const oldestMessageId = processedMessageIds.values().next().value;

  if (oldestMessageId !== undefined) {
    processedMessageIds.delete(oldestMessageId);
  }
}

function normalizeChatId(recipient: string): string {
  const normalizedRecipient = recipient.trim();

  if (!normalizedRecipient) {
    throw new Error("WhatsApp recipient is required");
  }

  if (hasDirectChatSuffix(normalizedRecipient)) {
    return normalizedRecipient;
  }

  return `${normalizedRecipient.replace(/^\+/, "")}@c.us`;
}

function getMessageIgnoreReason(message: Message): string | null {
  if (message.fromMe) {
    return "sent_by_bot";
  }

  if (!hasDirectChatSuffix(message.from)) {
    return "not_a_direct_chat";
  }

  if (!message.body.trim() && !message.hasMedia) {
    return "empty_message";
  }

  return null;
}

function getUserPhone(message: Message, contact: Contact | null): string {
  const contactId = contact?.id?._serialized;

  if (contactId?.endsWith("@c.us")) {
    return contactId.replace("@c.us", "");
  }

  if (message.from.endsWith("@c.us")) {
    return message.from.replace("@c.us", "");
  }

  return contact?.number || contactId || message.from;
}

function getUserName(contact: Contact | null): string | null {
  return contact
    ? contact.pushname || contact.name || contact.shortName || null
    : null;
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function getStringProperty(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function getNumberProperty(record: Record<string, unknown> | null, key: string): number | null {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getWhatsAppMediaMetadata(message: Message): WhatsAppMediaMetadata {
  const rawData = getRecord(message.rawData);
  const mediaData = getRecord(rawData?.mediaData);
  return {
    messageType: message.type,
    hasMedia: message.hasMedia,
    declaredMimeType: getStringProperty(rawData, "mimetype") ?? getStringProperty(mediaData, "mimetype"),
    fileName: getStringProperty(rawData, "filename") ?? getStringProperty(mediaData, "filename"),
    size: getNumberProperty(rawData, "size") ?? getNumberProperty(mediaData, "size"),
    mediaStage: getStringProperty(mediaData, "mediaStage"),
    hasDirectPath: Boolean(getStringProperty(rawData, "directPath")),
    hasMediaKey: Boolean(getStringProperty(rawData, "mediaKey") ?? message.mediaKey),
    hasFileHash: Boolean(getStringProperty(rawData, "filehash")),
    hasEncFileHash: Boolean(getStringProperty(rawData, "encFilehash")),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toJsonObject(value: object): PrismaTypes.InputJsonObject {
  return value as PrismaTypes.InputJsonObject;
}

function getPuppeteerPage(message: Message): PuppeteerPageLike | null {
  const messageRecord = getRecord(message);
  const clientRecord = getRecord(messageRecord?.client) ?? getRecord(client);
  const pageRecord = getRecord(clientRecord?.pupPage);
  return typeof pageRecord?.evaluate === "function" ? pageRecord as unknown as PuppeteerPageLike : null;
}

async function downloadRawMessageMedia(
  message: Message,
  messageReference: string,
): Promise<{ media: WhatsAppDownloadedMedia | undefined; result: WhatsAppRawMediaDownloadResult }> {
  const page = getPuppeteerPage(message);
  if (!page) {
    return {
      media: undefined,
      result: { returnedMedia: false, reason: "puppeteer_page_unavailable", error: null, byteLength: 0, declaredMimeType: null, fileName: null, metadata: null },
    };
  }

  const browserResult = await page.evaluate(async (messageId) => {
    type BrowserRecord = Record<string, any>;
    const whatsappWindow = globalThis as unknown as {
      require: (moduleName: string) => BrowserRecord;
      WWebJS: { arrayBufferToBase64Async: (buffer: unknown) => Promise<string> };
    };
    const collections = whatsappWindow.require("WAWebCollections");
    const msg = collections.Msg.get(messageId) || (await collections.Msg.getMessagesById([messageId]))?.messages?.[0];
    const metadata = () => ({
      messageType: msg?.type ?? null,
      declaredMimeType: msg?.mimetype ?? msg?.mediaData?.mimetype ?? null,
      fileName: msg?.filename ?? msg?.mediaData?.filename ?? null,
      size: msg?.size ?? msg?.mediaData?.size ?? null,
      mediaStage: msg?.mediaData?.mediaStage ?? null,
      hasDirectPath: Boolean(msg?.directPath),
      hasMediaKey: Boolean(msg?.mediaKey),
      hasFileHash: Boolean(msg?.filehash),
      hasEncFileHash: Boolean(msg?.encFilehash),
    });

    if (!msg) return { ok: false, reason: "message_not_found", error: null, byteLength: 0, declaredMimeType: null, fileName: null, metadata: null };
    if (!msg.directPath || !msg.mediaKey) return { ok: false, reason: "missing_raw_media_identifiers", error: null, byteLength: 0, declaredMimeType: msg.mimetype ?? null, fileName: msg.filename ?? null, metadata: metadata() };

    try {
      if (msg.mediaData?.mediaStage !== "RESOLVED") {
        try {
          await msg.downloadMedia({ downloadEvenIfExpensive: true, rmrReason: 1 });
        } catch {
          // Continue to direct decrypt; some WhatsApp Web builds throw even with valid media identifiers.
        }
        for (let poll = 0; poll < 20; poll += 1) {
          const stage = String(msg.mediaData?.mediaStage ?? "");
          if (stage === "RESOLVED" || stage.includes("ERROR")) break;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      const downloadManager = whatsappWindow.require("WAWebDownloadManager").downloadManager;
      const decryptedMedia = await downloadManager.downloadAndMaybeDecrypt({
        directPath: msg.directPath,
        encFilehash: msg.encFilehash,
        filehash: msg.filehash,
        mediaKey: msg.mediaKey,
        mediaKeyTimestamp: msg.mediaKeyTimestamp,
        type: msg.type,
        signal: new AbortController().signal,
        downloadQpl: { addAnnotations() { return this; }, addPoint() { return this; } },
      });
      const data = await whatsappWindow.WWebJS.arrayBufferToBase64Async(decryptedMedia);
      const byteLength = data ? Math.ceil(data.length * 0.75) : 0;
      return {
        ok: Boolean(data),
        reason: data ? null : "raw_download_empty",
        error: null,
        byteLength,
        declaredMimeType: msg.mimetype ?? null,
        fileName: msg.filename ?? null,
        metadata: metadata(),
        media: data ? { data, mimetype: msg.mimetype ?? null, filename: msg.filename ?? null, filesize: msg.size ?? null } : undefined,
      };
    } catch (error) {
      return {
        ok: false,
        reason: "raw_download_threw",
        error: error instanceof Error ? error.message : String(error),
        byteLength: 0,
        declaredMimeType: msg.mimetype ?? null,
        fileName: msg.filename ?? null,
        metadata: metadata(),
      };
    }
  }, message.id._serialized);

  const result: WhatsAppRawMediaDownloadResult = {
    returnedMedia: Boolean(browserResult.ok && browserResult.media),
    reason: browserResult.reason,
    error: browserResult.error,
    byteLength: browserResult.byteLength,
    declaredMimeType: browserResult.declaredMimeType,
    fileName: browserResult.fileName,
    metadata: browserResult.metadata ? toJsonObject(browserResult.metadata) : null,
  };
  console.log("WhatsApp raw media download fallback result", { messageReference, ...result });
  return { media: browserResult.ok ? browserResult.media : undefined, result };
}

async function downloadMessageMediaWithRetry(
  message: Message,
  messageReference: string,
): Promise<WhatsAppMediaDownloadResult> {
  const attempts: WhatsAppMediaDownloadAttempt[] = [];
  for (const [index, retryDelay] of MEDIA_DOWNLOAD_RETRY_DELAYS_MS.entries()) {
    if (retryDelay > 0) await delay(retryDelay);
    if (index > 0) {
      try {
        await message.reload();
      } catch (error: unknown) {
        console.warn("WhatsApp media reload failed before retry", {
          messageReference,
          attempt: index + 1,
          reason: getErrorMessage(error),
        });
      }
    }

    const metadata = getWhatsAppMediaMetadata(message);
    console.log("WhatsApp media download attempt", {
      messageReference,
      attempt: index + 1,
      ...metadata,
    });

    try {
      const media = await message.downloadMedia();
      const byteLength = media?.data ? Buffer.byteLength(media.data, "base64") : 0;
      attempts.push({
        attempt: index + 1,
        metadata,
        returnedMedia: Boolean(media),
        declaredMimeType: media?.mimetype ?? null,
        fileName: media?.filename ?? null,
        byteLength,
        error: null,
      });
      console.log("WhatsApp media download result", {
        messageReference,
        attempt: index + 1,
        returnedMedia: Boolean(media),
        declaredMimeType: media?.mimetype ?? null,
        fileName: media?.filename ?? null,
        byteLength,
      });
      if (media?.data && byteLength > 0) return { media, attempts, rawFallback: null };
    } catch (error: unknown) {
      attempts.push({
        attempt: index + 1,
        metadata,
        returnedMedia: false,
        declaredMimeType: null,
        fileName: null,
        byteLength: 0,
        error: getErrorMessage(error),
      });
      console.warn("WhatsApp media download attempt failed", {
        messageReference,
        attempt: index + 1,
        reason: getErrorMessage(error),
      });
    }
  }

  const rawFallback = await downloadRawMessageMedia(message, messageReference);
  if (rawFallback.media?.data) return { media: rawFallback.media, attempts, rawFallback: rawFallback.result };
  return { media: undefined, attempts, rawFallback: rawFallback.result };
}

async function getContactWithTimeout(
  message: Message,
  messageReference: string,
): Promise<Contact | null> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(new Error("WhatsApp contact lookup timed out"));
    }, CONTACT_LOOKUP_TIMEOUT_MS);
  });

  try {
    return await Promise.race([message.getContact(), timeoutPromise]);
  } catch (error: unknown) {
    console.warn("WhatsApp contact lookup failed; using sender ID", {
      messageReference,
      reason: getErrorMessage(error),
    });
    return null;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function extractTicketRequest(
  message: Message,
  messageReference: string,
): Promise<IncomingTicketRequest> {
  const contact = await getContactWithTimeout(message, messageReference);
  let profilePictureUrl: string | null = null;
  let profilePictureMimeType: string | null = null;
  let profilePictureData: string | null = null;
  try {
    profilePictureUrl = (await contact?.getProfilePicUrl()) || null;
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
  let mediaError: string | null = null;
  let mediaMetadata: PrismaTypes.InputJsonValue | null = null;
  if (message.hasMedia) {
    const initialMetadata = getWhatsAppMediaMetadata(message);
    console.log("WhatsApp inbound media metadata", {
      messageReference,
      ...initialMetadata,
    });
    try {
      const mediaDownload = await downloadMessageMediaWithRetry(message, messageReference);
      const { media } = mediaDownload;
      const byteLength = media ? Buffer.byteLength(media.data, "base64") : 0;
      const mimeType = inferMediaMimeType(
        media?.mimetype ?? initialMetadata.declaredMimeType,
        message.type,
        media?.filename ?? initialMetadata.fileName,
      );
      console.log("WhatsApp media download inspected", {
        messageReference,
        messageType: message.type,
        declaredMimeType: media?.mimetype ?? initialMetadata.declaredMimeType,
        inferredMimeType: mimeType || null,
        fileName: media?.filename ?? initialMetadata.fileName,
        byteLength,
      });
      if (
        media &&
        isSupportedMediaMimeType(mimeType) &&
        byteLength > 0 &&
        byteLength <= MAXIMUM_MEDIA_BYTES
      ) {
        mediaMimeType = mimeType;
        mediaData = media.data;
        mediaFileName = createMediaFileName(messageReference, mimeType, media.filename ?? initialMetadata.fileName);
        mediaMetadata = toJsonObject({
          initialMetadata,
          attempts: mediaDownload.attempts,
          rawFallback: mediaDownload.rawFallback,
          saved: { mimeType, fileName: mediaFileName, byteLength },
        });
      } else if (message.hasMedia) {
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
          messageType: message.type,
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
      console.warn("WhatsApp media download failed", {
        messageReference,
        reason: getErrorMessage(error),
      });
    }
  }

  return {
    chatId: message.from,
    userPhone: getUserPhone(message, contact),
    userName: getUserName(contact),
    rawMessage: message.body.trim() || (mediaData ? getMediaPlaceholder(mediaMimeType) : `${getMediaPlaceholder(inferMediaMimeType(null, message.type, mediaFileName))} unavailable`),
    profilePictureUrl,
    profilePictureMimeType,
    profilePictureData,
    mediaMimeType,
    mediaData,
    mediaFileName,
    mediaError,
    mediaMetadata,
  };
}

export async function refreshWhatsAppProfilePictureUrl(
  chatId: string,
): Promise<string | null> {
  if (!client) return null;
  try {
    const url = await client.getProfilePicUrl(chatId);
    if (url) return url;
  } catch (error: unknown) {
    console.warn("WhatsApp profile picture direct lookup failed", { chatId, reason: getErrorMessage(error) });
  }
  try {
    const contact = await client.getContactById(chatId);
    return (await contact.getProfilePicUrl()) || null;
  } catch (error: unknown) {
    console.warn("WhatsApp profile picture contact lookup failed", { chatId, reason: getErrorMessage(error) });
    return null;
  }
}

configureProfilePictureUrlProvider(refreshWhatsAppProfilePictureUrl);

function createTriageReply(triage: TriageResult): string {
  if (triage.needsPcClarification) {
    return "We received your request. Please reply with your computer/workstation number so IT can continue.";
  }

  const pcReference =
    triage.pcNumber === null ? "your workstation" : `PC #${triage.pcNumber}`;

  if (triage.classification === "CAN_AUTO_FIX") {
    return `We received your request for ${pcReference}. Automated diagnostics are now running.`;
  }

  return `Your IT ticket is open for ${pcReference}. An IT technician has been notified.`;
}

async function saveTicketTriage(
  ticketId: number,
  triage: TriageResult,
): Promise<TicketDto> {
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

export async function handleIncomingMessage(message: Message): Promise<void> {
  const messageId = message.id?._serialized;
  const messageReference = getMessageReference(message);

  console.log("WhatsApp message received", {
    messageReference,
    timestamp: message.timestamp,
    fromMe: message.fromMe,
    type: message.type,
    chatSuffix: message.from.slice(-8),
  });

  if (messageId && processedMessageIds.has(messageId)) {
    console.log("Duplicate WhatsApp message ignored", { messageReference });
    return;
  }

  const ignoreReason = getMessageIgnoreReason(message);

  if (ignoreReason) {
    console.log("WhatsApp message ignored", {
      messageReference,
      reason: ignoreReason,
    });
    return;
  }

  if (messageId) {
    rememberMessage(messageId);
  } else {
    console.warn("WhatsApp message has no serialized ID; deduplication skipped", {
      messageReference,
    });
  }

  let request: IncomingTicketRequest;
  let ticketId: number;

  try {
    request = await extractTicketRequest(message, messageReference);
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
      mediaFileName: request.mediaFileName,
      mediaError: request.mediaError,
      mediaMetadata: request.mediaMetadata,
      externalMessageId: messageId ?? null,
      occurredAt: new Date(message.timestamp * 1_000),
    });
    ticketId = accepted.ticket.id;
    if (!accepted.isNew) return;
    if (accepted.isNewTicket) {
      publishTicketEvent({ type: "created", ticket: accepted.ticket });
    }
    publishTicketEvent({
      type: "message",
      ticket: accepted.ticket,
      message: accepted.message,
    });
    if (!accepted.isNewTicket && accepted.ticket.pcNumber !== null) return;
  } catch (error: unknown) {
    if (messageId) {
      processedMessageIds.delete(messageId);
    }

    console.error("WhatsApp ticket acceptance failed", {
      messageReference,
      reason: getErrorMessage(error),
    });
    throw error;
  }

  console.log("Helpdesk ticket accepted for triage", {
    messageReference,
    ticketId,
  });

  const correlationId = `ticket-${ticketId}:${messageReference}`;
  const inventoryContext = await getInventoryContext(request.rawMessage);
  const triage = await triageIssueWithGemini(
    request.rawMessage,
    correlationId,
    inventoryContext,
  );

  try {
    const ticket = await saveTicketTriage(ticketId, triage);
    publishTicketEvent({
      type: "updated",
      reason: "triage_completed",
      ticket,
    });
  } catch (error: unknown) {
    console.error("Helpdesk ticket triage persistence failed", {
      messageReference,
      ticketId,
      reason: getErrorMessage(error),
    });
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
    const replyText = createTriageReply(triage);
    const reply = await message.reply(replyText);
    const replyMessage = await recordAutomaticReply(
      ticketId,
      replyText,
      reply.id?._serialized ?? null,
    );
    const ticket = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      select: TICKET_VIEW_SELECT,
    });
    publishTicketEvent({
      type: "message",
      ticket: toTicketDto(ticket),
      message: replyMessage,
    });
    console.log("WhatsApp triage reply sent", { messageReference, ticketId });
  }
}

function createWhatsAppClient(): WhatsAppClient {
  const executablePath = getPuppeteerExecutablePath();

  return new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    },
  });
}

function registerClientEventHandlers(whatsAppClient: WhatsAppClient): void {
  whatsAppClient.on("qr", (qr: string) => {
    console.log("Scan this QR code with WhatsApp to authenticate:");
    qrcode.generate(qr, { small: true });
  });

  whatsAppClient.on("authenticated", () => {
    console.log("WhatsApp Web client authenticated.");
  });

  whatsAppClient.on("ready", () => {
    console.log("WhatsApp Web client is ready.");
  });

  whatsAppClient.on("message", (message: Message) => {
    if (isShuttingDown) {
      return;
    }

    const messageTask = handleIncomingMessage(message);
    activeMessageTasks.add(messageTask);

    void messageTask
      .catch((error: unknown) => {
        console.error(
          "Failed to process incoming WhatsApp message:",
          getErrorMessage(error),
        );
      })
      .finally(() => {
        activeMessageTasks.delete(messageTask);
      });
  });

  whatsAppClient.on("auth_failure", (message: string) => {
    console.error("WhatsApp Web authentication failed", message);
  });

  whatsAppClient.on("disconnected", (reason: WAState | "LOGOUT") => {
    console.warn("WhatsApp Web client disconnected", reason);

    if (client === whatsAppClient) {
      client = undefined;
      initializationPromise = undefined;
    }
  });
}

async function closeWhatsAppClient(
  whatsAppClient: WhatsAppClient,
): Promise<void> {
  try {
    await whatsAppClient.destroy();
  } catch (destroyError: unknown) {
    try {
      await whatsAppClient.pupBrowser?.close();
    } catch (browserError: unknown) {
      throw new AggregateError(
        [destroyError, browserError],
        "WhatsApp client and browser shutdown both failed",
      );
    }

    throw destroyError;
  }
}

export function initializeWhatsApp(): Promise<WhatsAppClient> {
  if (isShuttingDown) {
    return Promise.reject(new Error("WhatsApp service is shutting down"));
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  const newClient = createWhatsAppClient();
  client = newClient;
  registerClientEventHandlers(newClient);

  initializationPromise = newClient
    .initialize()
    .then(() => newClient)
    .catch(async (initializationError: unknown) => {
      let reportedError = initializationError;

      try {
        await closeWhatsAppClient(newClient);
      } catch (cleanupError: unknown) {
        reportedError = new AggregateError(
          [initializationError, cleanupError],
          "WhatsApp initialization and cleanup both failed",
        );
      }

      if (client === newClient) {
        client = undefined;
        initializationPromise = undefined;
      }

      throw reportedError;
    });

  return initializationPromise;
}

export async function sendWhatsAppMessage(
  recipient: string,
  text: string,
): Promise<Message> {
  if (!client) {
    throw new Error("WhatsApp client has not been initialized");
  }

  return client.sendMessage(normalizeChatId(recipient), text);
}

export async function sendTicketReply(
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

  publishTicketEvent({
    type: "message",
    ticket: pending.ticket,
    message: pendingMessage,
  });
  let sent: Message;
  try {
    sent = await sendWhatsAppMessage(
      pending.ticket.chatId ?? pending.ticket.userPhone,
      text,
    );
  } catch (error: unknown) {
    const message = await markOutgoingMessage(pending.message.id, "FAILED");
    publishTicketEvent({ type: "message", ticket: pending.ticket, message });
    throw new HttpError(503, `WhatsApp message could not be sent: ${getErrorMessage(error)}`);
  }

  try {
    const message = await markOutgoingMessage(
      pending.message.id,
      "SENT",
      sent.id?._serialized,
    );
    publishTicketEvent({ type: "message", ticket: pending.ticket, message });
    return message;
  } catch (error: unknown) {
    throw new HttpError(
      500,
      `WhatsApp delivered the message but history could not be updated: ${getErrorMessage(error)}`,
    );
  }
}

export async function sendTicketMedia(
  ticketId: number,
  technicianId: number,
  media: { data: Buffer; mimeType: string; fileName: string },
  caption: string,
  clientRequestId: string,
) {
  if (!client) throw new HttpError(503, "WhatsApp client has not been initialized");
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

  let sent: Message;
  try {
    sent = await client.sendMessage(
      normalizeChatId(pending.ticket.chatId ?? pending.ticket.userPhone),
      new MessageMedia(mimeType, media.data.toString("base64"), media.fileName),
      { ...(caption ? { caption } : {}) },
    );
  } catch (error: unknown) {
    const message = await markOutgoingMessage(pending.message.id, "FAILED");
    publishTicketEvent({ type: "message", ticket: pending.ticket, message });
    throw new HttpError(503, `WhatsApp media could not be sent: ${getErrorMessage(error)}`);
  }

  try {
    const message = await markOutgoingMessage(pending.message.id, "SENT", sent.id?._serialized);
    publishTicketEvent({ type: "message", ticket: pending.ticket, message });
    return message;
  } catch (error: unknown) {
    throw new HttpError(
      500,
      `WhatsApp delivered the media but history could not be updated: ${getErrorMessage(error)}`,
    );
  }
}

export async function destroyWhatsApp(): Promise<void> {
  isShuttingDown = true;

  if (initializationPromise) {
    await Promise.allSettled([initializationPromise]);
  }

  await Promise.allSettled([...activeMessageTasks]);

  const activeClient = client;

  if (!activeClient) {
    initializationPromise = undefined;
    return;
  }

  try {
    await closeWhatsAppClient(activeClient);
  } finally {
    if (client === activeClient) {
      client = undefined;
      initializationPromise = undefined;
    }
  }
}
