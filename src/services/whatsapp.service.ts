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
import type { TriageResult } from "../domain/triage.js";
import { getErrorMessage } from "../utils/errors.js";
import { triageIssueWithGemini } from "./gemini.service.js";

const { Client, LocalAuth } = WhatsAppWeb;

const MAXIMUM_PROCESSED_MESSAGE_IDS = 1_000;
const DIRECT_CHAT_SUFFIXES = ["@c.us", "@lid"] as const;

type WhatsAppClient = InstanceType<typeof Client>;

interface IncomingTicketRequest {
  userPhone: string;
  userName: string | null;
  rawMessage: string;
}

interface SavedTriageResult {
  ticketId: number;
  triage: TriageResult;
}

let client: WhatsAppClient | undefined;
let initializationPromise: Promise<WhatsAppClient> | undefined;
let isShuttingDown = false;
const processedMessageIds = new Set<string>();
const activeMessageTasks = new Set<Promise<void>>();

function hasDirectChatSuffix(chatId: string): boolean {
  return DIRECT_CHAT_SUFFIXES.some((suffix) => chatId.endsWith(suffix));
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

function shouldHandleMessage(message: Message): boolean {
  return (
    !message.fromMe &&
    hasDirectChatSuffix(message.from) &&
    message.body.trim().length > 0
  );
}

function getUserPhone(message: Message, contact: Contact): string {
  const contactId = contact.id._serialized;

  if (contactId.endsWith("@c.us")) {
    return contactId.replace("@c.us", "");
  }

  if (message.from.endsWith("@c.us")) {
    return message.from.replace("@c.us", "");
  }

  return contact.number || contactId || message.from;
}

function getUserName(contact: Contact): string | null {
  return contact.pushname || contact.name || contact.shortName || null;
}

async function extractTicketRequest(
  message: Message,
): Promise<IncomingTicketRequest> {
  const contact = await message.getContact();

  return {
    userPhone: getUserPhone(message, contact),
    userName: getUserName(contact),
    rawMessage: message.body.trim(),
  };
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

async function saveTriagedTicket(
  request: IncomingTicketRequest,
  triage: TriageResult,
): Promise<number> {
  const ticket = await prisma.ticket.create({
    data: {
      userPhone: request.userPhone,
      userName: request.userName,
      pcNumber: triage.pcNumber,
      rawMessage: request.rawMessage,
      summary: triage.userFriendlySummary,
      status: "open",
      aiDecision: triage.classification,
      aiConfidence: triage.confidenceScore,
      suggestedScript: triage.suggestedScript,
    },
    select: { id: true },
  });

  return ticket.id;
}

async function triageAndSaveMessage(message: Message): Promise<SavedTriageResult> {
  const request = await extractTicketRequest(message);
  const triage = await triageIssueWithGemini(request.rawMessage);
  const ticketId = await saveTriagedTicket(request, triage);

  return { ticketId, triage };
}

export async function handleIncomingMessage(message: Message): Promise<void> {
  console.log("WhatsApp message received", {
    fromMe: message.fromMe,
    type: message.type,
    chatSuffix: message.from.slice(-8),
  });

  const messageId = message.id._serialized;

  if (processedMessageIds.has(messageId)) {
    return;
  }

  if (!shouldHandleMessage(message)) {
    console.log("WhatsApp message ignored");
    return;
  }

  rememberMessage(messageId);

  let savedResult: SavedTriageResult;

  try {
    savedResult = await triageAndSaveMessage(message);
  } catch (error: unknown) {
    processedMessageIds.delete(messageId);
    throw error;
  }

  console.log("Triaged helpdesk ticket created", {
    ticketId: savedResult.ticketId,
    classification: savedResult.triage.classification,
  });

  if (shouldSendWhatsAppAutoReplies()) {
    await message.reply(createTriageReply(savedResult.triage));
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
