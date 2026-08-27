export const MAXIMUM_PROCESSED_MESSAGE_IDS = 1_000;
export const MEDIA_DOWNLOAD_RETRY_DELAYS_MS = [0, 750, 2_000, 5_000] as const;
export const DIRECT_CHAT_SUFFIXES = ["@s.whatsapp.net", "@lid"] as const;

export interface IncomingTicketRequest {
  chatId: string;
  userPhone: string;
  userName: string | null;
  rawMessage: string;
  profilePictureUrl: string | null;
  profilePictureMimeType: string | null;
  profilePictureData: string | null;
  mediaMimeType: string | null;
  mediaData: string | null;
  mediaStorageKey: string | null;
  mediaFileName: string | null;
  mediaError: string | null;
  mediaMetadata: import("@prisma/client").Prisma.InputJsonValue | null;
}

export interface WhatsAppMediaMetadata {
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
  messageIdInfo: {
    idType: string;
    idKeys: string[];
    hasSerialized: boolean;
    serializedValue: string | null;
    rawIdValue: string | null;
  };
}

export interface WhatsAppDownloadedMedia {
  data: Buffer;
  mimetype?: string;
  filename?: string;
  filesize?: number;
}

export interface WhatsAppMediaDownloadAttempt {
  attempt: number;
  metadata: WhatsAppMediaMetadata;
  returnedMedia: boolean;
  declaredMimeType: string | null;
  fileName: string | null;
  byteLength: number;
  error: string | null;
}

export interface WhatsAppRawMediaDownloadResult {
  returnedMedia: boolean;
  reason: string | null;
  error: string | null;
  byteLength: number;
  declaredMimeType: string | null;
  fileName: string | null;
  strategy: string;
  metadata: import("@prisma/client").Prisma.InputJsonValue | null;
}

export interface WhatsAppMediaDownloadResult {
  media: WhatsAppDownloadedMedia | undefined;
  attempts: WhatsAppMediaDownloadAttempt[];
  rawFallback: WhatsAppRawMediaDownloadResult | null;
}

export function isDirectChatJid(jid: string): boolean {
  return DIRECT_CHAT_SUFFIXES.some((suffix) => jid.endsWith(suffix));
}

export function normalizeChatId(recipient: string): string {
  const normalizedRecipient = recipient.trim();

  if (!normalizedRecipient) {
    throw new Error("WhatsApp recipient is required");
  }

  if (isDirectChatJid(normalizedRecipient) || normalizedRecipient.endsWith("@g.us")) {
    return normalizedRecipient;
  }

  return `${normalizedRecipient.replace(/^\+/, "")}@s.whatsapp.net`;
}

export function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

export function getStringProperty(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function getNumberProperty(record: Record<string, unknown> | null, key: string): number | null {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function toJsonObject(value: object): import("@prisma/client").Prisma.InputJsonObject {
  return value as import("@prisma/client").Prisma.InputJsonObject;
}

export function getMessageReference(message: { key?: { id?: string | null }; messageTimestamp?: number }): string {
  const messageId = message.key?.id;
  return typeof messageId === "string" ? messageId.slice(-12) : `time-${message.messageTimestamp ?? Date.now()}`;
}

export function getMessageId(message: { key?: { id?: string | null } }): string | null {
  return typeof message.key?.id === "string" ? message.key.id : null;
}

export function getUserPhone(message: { key: { remoteJid?: string; participant?: string } }, contact: { id?: string } | null): string {
  const jid = contact?.id ?? message.key.participant ?? message.key.remoteJid ?? "";
  return jid.replace(/@(s\.whatsapp\.net|lid)$/, "");
}

export function getUserName(contact: { name?: string; notify?: string } | null): string | null {
  return contact?.name ?? contact?.notify ?? null;
}

export function getMessageIgnoreReason(message: { key?: { fromMe?: boolean; remoteJid?: string }; message?: unknown }): string | null {
  if (message.key?.fromMe) {
    return "sent_by_bot";
  }

  const remoteJid = message.key?.remoteJid;
  if (!remoteJid || !(isDirectChatJid(remoteJid))) {
    return "not_a_direct_chat";
  }

  if (!message.message) {
    return "empty_message";
  }

  return null;
}
