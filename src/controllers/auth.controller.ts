import type { Request, Response } from "express";

import {
  getAccessTokenLifetimeSeconds,
  getRefreshTokenLifetimeSeconds,
  isProductionEnvironment,
} from "../config/environment.js";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  type TechnicianProfile,
} from "../domain/auth.js";
import { HttpError } from "../errors/http-error.js";
import type { AuthLocals } from "../middleware/auth.middleware.js";
import { readCookie } from "../middleware/auth.middleware.js";
import {
  loginTechnician,
  logoutTechnician,
  refreshTechnicianSession,
  type AuthSession,
} from "../services/auth.service.js";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

interface AuthResponse {
  technician: TechnicianProfile;
}

function setSessionCookies(res: Response, session: AuthSession): void {
  const cookieOptions = {
    httpOnly: true,
    secure: isProductionEnvironment(),
    sameSite: "strict" as const,
  };

  res.cookie(ACCESS_TOKEN_COOKIE, session.accessToken, {
    ...cookieOptions,
    path: "/",
    maxAge: getAccessTokenLifetimeSeconds() * 1_000,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, session.refreshToken, {
    ...cookieOptions,
    path: "/api/auth",
    maxAge: getRefreshTokenLifetimeSeconds() * 1_000,
  });
}

function clearSessionCookies(res: Response): void {
  const options = {
    httpOnly: true,
    secure: isProductionEnvironment(),
    sameSite: "strict" as const,
  };
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...options, path: "/" });
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    ...options,
    path: "/api/auth",
  });
}

export async function login(
  req: Request<unknown, unknown, LoginBody>,
  res: Response<AuthResponse>,
): Promise<void> {
  if (typeof req.body.email !== "string" || typeof req.body.password !== "string") {
    throw new HttpError(400, "Email and password are required");
  }

  const session = await loginTechnician(req.body.email, req.body.password);
  setSessionCookies(res, session);
  res.json({ technician: session.technician });
}

export async function refresh(req: Request, res: Response<AuthResponse>): Promise<void> {
  const refreshToken = readCookie(req.headers.cookie, REFRESH_TOKEN_COOKIE);

  if (!refreshToken) {
    throw new HttpError(401, "Session has expired");
  }

  const session = await refreshTechnicianSession(refreshToken);
  setSessionCookies(res, session);
  res.json({ technician: session.technician });
}

export async function logout(req: Request, res: Response): Promise<void> {
  clearSessionCookies(res);
  await logoutTechnician(readCookie(req.headers.cookie, REFRESH_TOKEN_COOKIE));
  res.status(204).send();
}

export function getCurrentTechnician(
  _req: Request,
  res: Response<AuthResponse, AuthLocals>,
): void {
  const { accessTokenExpiresAt: _accessTokenExpiresAt, ...technician } =
    res.locals.technician;
  res.json({ technician });
}
