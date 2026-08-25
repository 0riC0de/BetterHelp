import type { NextFunction, Request, Response } from "express";

import { getDashboardAllowedOrigins } from "../config/environment.js";

const allowedOrigins = new Set(getDashboardAllowedOrigins());

export function isDashboardOriginAllowed(origin: string | undefined): boolean {
  return origin === undefined || allowedOrigins.has(origin);
}

export function requireDashboardOrigin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!isDashboardOriginAllowed(req.headers.origin)) {
    res.status(403).json({ error: "Origin is not allowed" });
    return;
  }

  next();
}
