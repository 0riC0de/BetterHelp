import type { NextFunction, Request, Response } from "express";

import prisma from "../db/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { mediaFileExists, readMediaFile } from "../domain/media-storage.js";

const INLINE_MIME_PREFIXES = ["image/", "audio/", "video/"];

export async function getTicketMessageMedia(
  req: Request<{ id: string; messageId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ticketId = Number(req.params.id);
    const messageId = Number(req.params.messageId);
    if (!Number.isSafeInteger(ticketId) || !Number.isSafeInteger(messageId)) {
      throw new HttpError(400, "Ticket and message IDs must be integers");
    }
    const message = await prisma.ticketMessage.findFirst({
      where: { id: messageId, ticketId },
      select: { mediaData: true, mediaMimeType: true, mediaFileName: true, mediaStorageKey: true },
    });
    if (!message?.mediaMimeType) throw new HttpError(404, "Media not found");

    if (message.mediaStorageKey && mediaFileExists(message.mediaStorageKey)) {
      await streamStoredMedia(message.mediaStorageKey, message.mediaMimeType, message.mediaFileName ?? `attachment-${messageId}`, req, res);
      return;
    }

    if (!message.mediaData) throw new HttpError(404, "Media not found");

    const data = Buffer.from(message.mediaData, "base64");
    await streamBuffer(data, message.mediaMimeType, message.mediaFileName ?? `attachment-${messageId}`, req, res);
  } catch (error: unknown) {
    next(error);
  }
}

export async function getStoredMedia(
  req: Request<{ key: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stored = readMediaFile(req.params.key);
    if (!stored) throw new HttpError(404, "Media not found");
    const mimeType = req.query.mimeType && typeof req.query.mimeType === "string"
      ? req.query.mimeType
      : stored.mimeType ?? "application/octet-stream";
    await streamStoredMedia(req.params.key, mimeType, req.params.key, req, res);
  } catch (error: unknown) {
    next(error);
  }
}

function streamHeaders(res: Response, mimeType: string, safeName: string): void {
  const inline = INLINE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${safeName}"`);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Accept-Ranges", "bytes");
}

async function streamStoredMedia(
  key: string,
  mimeType: string,
  fileName: string,
  req: Request,
  res: Response,
): Promise<void> {
  const stored = readMediaFile(key);
  if (!stored) throw new HttpError(404, "Media not found");
  const safeName = fileName.replace(/[\r\n"\\/]/g, "_");
  streamHeaders(res, mimeType, safeName);
  const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Number(range[2]) : stored.data.byteLength - 1;
    if (start > end || end >= stored.data.byteLength) {
      res.status(416).setHeader("Content-Range", `bytes */${stored.data.byteLength}`);
      res.end();
      return;
    }
    const chunk = stored.data.subarray(start, end + 1);
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${stored.data.byteLength}`);
    res.setHeader("Content-Length", chunk.byteLength);
    res.end(chunk);
    return;
  }
  res.setHeader("Content-Length", stored.data.byteLength);
  res.end(stored.data);
}

function streamBuffer(
  data: Buffer,
  mimeType: string,
  fileName: string,
  req: Request,
  res: Response,
): void {
  const safeName = fileName.replace(/[\r\n"\\/]/g, "_");
  streamHeaders(res, mimeType, safeName);
  const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Number(range[2]) : data.byteLength - 1;
    if (start > end || end >= data.byteLength) {
      res.status(416).setHeader("Content-Range", `bytes */${data.byteLength}`);
      res.end();
      return;
    }
    const chunk = data.subarray(start, end + 1);
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${data.byteLength}`);
    res.setHeader("Content-Length", chunk.byteLength);
    res.end(chunk);
    return;
  }
  res.setHeader("Content-Length", data.byteLength);
  res.end(data);
}
