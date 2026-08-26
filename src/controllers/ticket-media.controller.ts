import type { NextFunction, Request, Response } from "express";

import prisma from "../db/prisma.js";
import { HttpError } from "../errors/http-error.js";

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
      select: { mediaData: true, mediaMimeType: true, mediaFileName: true },
    });
    if (!message?.mediaData || !message.mediaMimeType) throw new HttpError(404, "Media not found");

    const data = Buffer.from(message.mediaData, "base64");
    const inline = INLINE_MIME_PREFIXES.some((prefix) => message.mediaMimeType!.startsWith(prefix));
    const safeName = (message.mediaFileName ?? `attachment-${messageId}`).replace(/[\r\n"\\/]/g, "_");
    res.setHeader("Content-Type", message.mediaMimeType);
    res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${safeName}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Accept-Ranges", "bytes");

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
  } catch (error: unknown) {
    next(error);
  }
}
