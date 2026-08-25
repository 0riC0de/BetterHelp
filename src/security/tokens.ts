import { createHash, randomBytes } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";

import {
  getAccessTokenLifetimeSeconds,
  getAuthJwtSecret,
} from "../config/environment.js";
import {
  TECHNICIAN_ROLES,
  type TechnicianRole,
} from "../domain/auth.js";
import { HttpError } from "../errors/http-error.js";

interface AccessTokenClaims {
  technicianId: number;
  role: TechnicianRole;
  tokenVersion: number;
  expiresAt: number;
}

function isTechnicianRole(value: unknown): value is TechnicianRole {
  return TECHNICIAN_ROLES.some((role) => role === value);
}

export async function createAccessToken(
  technicianId: number,
  role: TechnicianRole,
  tokenVersion: number,
): Promise<string> {
  return new SignJWT({ role, tokenVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(technicianId))
    .setIssuedAt()
    .setExpirationTime(`${getAccessTokenLifetimeSeconds()}s`)
    .sign(getAuthJwtSecret());
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenClaims> {
  try {
    const { payload } = await jwtVerify(token, getAuthJwtSecret(), {
      algorithms: ["HS256"],
    });
    const technicianId = Number(payload.sub);

    if (
      !Number.isSafeInteger(technicianId) ||
      technicianId <= 0 ||
      !isTechnicianRole(payload.role) ||
      !Number.isSafeInteger(payload.tokenVersion) ||
      typeof payload.exp !== "number"
    ) {
      throw new Error("Invalid access token claims");
    }

    return {
      technicianId,
      role: payload.role,
      tokenVersion: payload.tokenVersion as number,
      expiresAt: payload.exp,
    };
  } catch {
    throw new HttpError(401, "Authentication is required");
  }
}

export function createRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
