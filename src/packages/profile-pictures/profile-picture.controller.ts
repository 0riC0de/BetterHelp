import type { NextFunction, Request, Response } from "express";

import { fetchProfilePicture } from "./profile-picture.service.js";

export async function getProfilePicture(
  req: Request<{ chatId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await fetchProfilePicture(req.params.chatId);
    if (!result) {
      res.setHeader("Cache-Control", "private, max-age=300");
      res.status(204).end();
      return;
    }
    res.setHeader("Content-Type", result.mimeType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(result.buffer);
  } catch (error: unknown) {
    next(error);
  }
}
