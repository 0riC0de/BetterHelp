import { Buffer } from "node:buffer";
import type { Transform } from "node:stream";

import { downloadMediaMessage } from "whaileys";

import { getErrorMessage } from "../../utils/errors.js";
import {
  delay,
  getNumberProperty,
  getRecord,
  getStringProperty,
  MEDIA_DOWNLOAD_RETRY_DELAYS_MS,
  type WhatsAppDownloadedMedia,
  type WhatsAppMediaDownloadAttempt,
  type WhatsAppMediaDownloadResult,
  type WhatsAppMediaMetadata,
  type WhatsAppRawMediaDownloadResult,
} from "./whatsapp.shared.js";

const silentLogger = {
  child() { return this; },
  info() {},
  warn() {},
  error() {},
  debug() {},
  trace() {},
} as const;

async function toBuffer(value: Buffer | Transform): Promise<Buffer> {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of value) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function getMessageMediaRecord(message: any): Record<string, unknown> | null {
  const content = getRecord(message.message);
  if (!content) return null;

  const type = Object.keys(content)[0];
  return type ? getRecord((content as Record<string, unknown>)[type]) : content;
}

function getWhatsAppMediaMetadata(message: any): WhatsAppMediaMetadata {
  const mediaRecord = getMessageMediaRecord(message);
  return {
    messageType: Object.keys(message.message ?? {})[0] ?? "unknown",
    hasMedia: Boolean(mediaRecord),
    declaredMimeType: getStringProperty(mediaRecord, "mimetype"),
    fileName: getStringProperty(mediaRecord, "fileName"),
    size: getNumberProperty(mediaRecord, "fileLength"),
    mediaStage: getStringProperty(mediaRecord, "mediaStage"),
    hasDirectPath: Boolean(getStringProperty(mediaRecord, "directPath")),
    hasMediaKey: Boolean(getStringProperty(mediaRecord, "mediaKey")),
    hasFileHash: Boolean(getStringProperty(mediaRecord, "filehash")),
    hasEncFileHash: Boolean(getStringProperty(mediaRecord, "encFilehash")),
    messageIdInfo: {
      idType: typeof message.key?.id,
      idKeys: message.key ? Object.keys(message.key).sort() : [],
      hasSerialized: typeof message.key?.id === "string",
      serializedValue: typeof message.key?.id === "string" ? message.key.id : null,
      rawIdValue: typeof message.key?.id === "string" ? message.key.id : null,
    },
  };
}

export class WhatsAppMediaDownloader {
  constructor(private readonly socket: any) {}

  public async downloadMessageMediaWithRetry(message: any, messageReference: string): Promise<WhatsAppMediaDownloadResult> {
    const attempts: WhatsAppMediaDownloadAttempt[] = [];
    const metadata = getWhatsAppMediaMetadata(message);

    for (const [index, retryDelay] of MEDIA_DOWNLOAD_RETRY_DELAYS_MS.entries()) {
      if (retryDelay > 0) await delay(retryDelay);

      console.log("WhatsApp media download attempt", {
        messageReference,
        attempt: index + 1,
        ...metadata,
      });

      try {
        const downloaded = await downloadMediaMessage(
          message,
          "buffer",
          {},
          { logger: this.socket.logger ?? silentLogger, reuploadRequest: this.socket.updateMediaMessage },
        );

        const buffer = await toBuffer(downloaded);
        const media: WhatsAppDownloadedMedia = {
          data: buffer,
          ...(metadata.declaredMimeType ? { mimetype: metadata.declaredMimeType } : {}),
          ...(metadata.fileName ? { filename: metadata.fileName } : {}),
          ...(metadata.size !== null ? { filesize: metadata.size } : {}),
        };

        attempts.push({
          attempt: index + 1,
          metadata,
          returnedMedia: true,
          declaredMimeType: media.mimetype ?? null,
          fileName: media.filename ?? null,
          byteLength: buffer.byteLength,
          error: null,
        });

        console.log("WhatsApp media download result", {
          messageReference,
          attempt: index + 1,
          returnedMedia: true,
          byteLength: buffer.byteLength,
        });

        if (buffer.byteLength > 0) {
          return { media, attempts, rawFallback: null };
        }

        attempts[attempts.length - 1] = {
          attempt: index + 1,
          metadata,
          returnedMedia: false,
          declaredMimeType: media.mimetype ?? null,
          fileName: media.filename ?? null,
          byteLength: 0,
          error: "empty_buffer",
        };
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

    const rawFallback: WhatsAppRawMediaDownloadResult = {
      returnedMedia: false,
      reason: "download_returned_no_media",
      error: null,
      byteLength: 0,
      declaredMimeType: metadata.declaredMimeType,
      fileName: metadata.fileName,
      strategy: "downloadMediaMessage",
      metadata: null,
    };
    console.log("WhatsApp raw media download fallback result", { messageReference, ...rawFallback });
    return { media: undefined, attempts, rawFallback };
  }
}
