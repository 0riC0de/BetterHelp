import { parse } from "cookie";
import type { NextFunction, Request, Response } from "express";

import {
  ACCESS_TOKEN_COOKIE,
  type AuthenticatedTechnician,
} from "../domain/auth.js";
import { HttpError } from "../errors/http-error.js";
import { authenticateTechnician } from "../services/auth.service.js";

export interface AuthLocals {
  technician: AuthenticatedTechnician;
}

export function readCookie(
  cookieHeader: string | undefined,
  cookieName: string,
): string | undefined {
  return parse(cookieHeader ?? "")[cookieName];
}

export async function requireTechnician(
  req: Request,
  res: Response<unknown, AuthLocals>,
  next: NextFunction,
): Promise<void> {
  try {
    const accessToken = readCookie(req.headers.cookie, ACCESS_TOKEN_COOKIE);

    if (!accessToken) {
      throw new HttpError(401, "Authentication is required");
    }

    res.locals.technician = await authenticateTechnician(accessToken);
    next();
  } catch (error: unknown) {
    next(error);
  }
}
