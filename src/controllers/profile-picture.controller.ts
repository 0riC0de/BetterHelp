import type { NextFunction, Request, Response } from "express";

import { fetchProfilePicture } from "../services/profile-picture.service.js";

export async function getProfilePicture(
  req: Request<{ chatId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await fetchProfilePicture(req.params.chatId);
    if (!result) {
      res.status(404).end();
      return;
    }
    res.setHeader("Content-Type", result.mimeType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.end(result.buffer);
  } catch (error: unknown) {
    next(error);
  }
}
