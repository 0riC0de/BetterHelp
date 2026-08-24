import qrcode from "qrcode-terminal";
import pkg from "whatsapp-web.js";

import prisma from "../db/prisma.js";

const { Client, LocalAuth } = pkg;

let client;
const processedMessages = new Set();
const maxProcessedMessages = 1000;

function rememberMessage(messageId) {
  if (!messageId) {
    return;
  }

  processedMessages.add(messageId);

  if (processedMessages.size > maxProcessedMessages) {
    const oldestMessageId = processedMessages.values().next().value;
    processedMessages.delete(oldestMessageId);
  }
}

function normalizeChatId(to) {
  if (to.endsWith("@c.us")) {
    return to;
  }

  return `${to.replace(/^\+/, "")}@c.us`;
}

function shouldHandleMessage(message) {
  return (
    !message.fromMe &&
    typeof message.from === "string" &&
    message.from.endsWith("@c.us") &&
    message.from !== "status@broadcast" &&
    typeof message.body === "string" &&
    message.body.trim().length > 0
  );
}

async function handleIncomingMessage(message, eventName) {
  console.log("WhatsApp message event", {
    event: eventName,
    fromMe: message.fromMe,
    type: message.type,
    chatSuffix: message.from?.slice(-8),
  });

  const messageId = message.id?._serialized;

  if (messageId && processedMessages.has(messageId)) {
    return;
  }

  rememberMessage(messageId);

  if (!shouldHandleMessage(message)) {
    console.log("WhatsApp message ignored");
    return;
  }

  const contact = await message.getContact();
  const userPhone = message.from.replace("@c.us", "");
  const userName = contact.pushname || contact.name || contact.shortName || null;
  const rawMessage = message.body.trim();

  console.log("Creating helpdesk ticket from WhatsApp message");

  await prisma.ticket.create({
    data: {
      userPhone,
      userName,
      rawMessage,
      status: "open",
    },
  });

  console.log("Helpdesk ticket created from WhatsApp message");

  if (process.env.WHATSAPP_AUTO_REPLY === "true") {
    await message.reply(
      "IT Bot received your request. An IT technician will review it shortly.",
    );
  }
}

export async function initializeWhatsApp() {
  if (client) {
    return client;
  }

  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    },
  });

  client.on("qr", (qr) => {
    console.log("Scan this QR code with WhatsApp to authenticate:");
    qrcode.generate(qr, { small: true });
  });

  client.on("authenticated", () => {
    console.log("WhatsApp Web client authenticated.");
  });

  client.on("ready", () => {
    console.log("WhatsApp Web client is ready.");
  });

  client.on("message", (message) => {
    handleIncomingMessage(message, "message").catch((error) => {
      console.error("Failed to process incoming WhatsApp message", error);
    });
  });

  client.on("message_create", (message) => {
    handleIncomingMessage(message, "message_create").catch((error) => {
      console.error("Failed to process created WhatsApp message", error);
    });
  });

  client.on("auth_failure", (message) => {
    console.error("WhatsApp Web authentication failed", message);
  });

  client.on("disconnected", (reason) => {
    console.warn("WhatsApp Web client disconnected", reason);
  });

  await client.initialize();
  return client;
}

export async function sendWhatsAppMessage(to, text) {
  if (!client) {
    throw new Error("WhatsApp client has not been initialized");
  }

  return client.sendMessage(normalizeChatId(to), text);
}

export async function destroyWhatsApp() {
  if (!client) {
    return;
  }

  await client.destroy();
  client = undefined;
}
