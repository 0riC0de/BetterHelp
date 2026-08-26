import qrcode from "qrcode-terminal";
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
import { publishTicketEvent } from "../realtime/ticket-events.js";
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

const { Client, LocalAuth } = WhatsAppWeb;

const MAXIMUM_PROCESSED_MESSAGE_IDS = 1_000;
const CONTACT_LOOKUP_TIMEOUT_MS = 5_000;
const MAXIMUM_MEDIA_BYTES = 16 * 1024 * 1024;
const SUPPORTED_MEDIA_TYPES = new Set([
  "image/gif", "image/jpeg", "image/png", "image/webp",
  "audio/aac", "audio/mpeg", "audio/mp4", "audio/ogg",
  "video/mp4", "video/webm",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);
const DIRECT_CHAT_SUFFIXES = ["@c.us", "@lid"] as const;

type WhatsAppClient = InstanceType<typeof Client>;

interface IncomingTicketRequest {
  chatId: string;
  userPhone: string;
  userName: string | null;
  rawMessage: string;
  profilePictureUrl: string | null;
  mediaMimeType: string | null;
  mediaData: string | null;
  mediaFileName: string | null;
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
  try {
    profilePictureUrl = (await contact?.getProfilePicUrl()) || null;
  } catch {
    profilePictureUrl = null;
  }
  let mediaMimeType: string | null = null;
  let mediaData: string | null = null;
  let mediaFileName: string | null = null;
  if (message.hasMedia) {
    try {
      const media = await message.downloadMedia();
      const byteLength = media ? Buffer.byteLength(media.data, "base64") : 0;
      if (
        media &&
        SUPPORTED_MEDIA_TYPES.has(media.mimetype) &&
        byteLength > 0 &&
        byteLength <= MAXIMUM_MEDIA_BYTES
      ) {
        mediaMimeType = media.mimetype;
        mediaData = media.data;
        mediaFileName = media.filename ?? null;
      }
    } catch (error: unknown) {
      console.warn("WhatsApp image download failed", {
        messageReference,
        reason: getErrorMessage(error),
      });
    }
  }

  return {
    chatId: message.from,
    userPhone: getUserPhone(message, contact),
    userName: getUserName(contact),
    rawMessage: message.body.trim() || getMediaPlaceholder(mediaMimeType),
    profilePictureUrl,
    mediaMimeType,
    mediaData,
    mediaFileName,
  };
}

function getMediaPlaceholder(mimeType: string | null): string {
  if (mimeType?.startsWith("image/")) return "[Image]";
  if (mimeType?.startsWith("audio/")) return "[Audio]";
  if (mimeType?.startsWith("video/")) return "[Video]";
  if (mimeType) return "[Document]";
  return "[Unsupported media]";
}

export async function refreshWhatsAppProfilePictureUrl(
  chatId: string,
): Promise<string | null> {
  if (!client) return null;
  try {
    return (await client.getProfilePicUrl(chatId)) || null;
  } catch {
    return null;
  }
}

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
      body: request.rawMessage,
      mediaMimeType: request.mediaMimeType,
      mediaData: request.mediaData,
      mediaFileName: request.mediaFileName,
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
