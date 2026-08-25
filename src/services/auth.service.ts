import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { getRefreshTokenLifetimeSeconds } from "../config/environment.js";
import prisma from "../db/prisma.js";
import type {
  AuthenticatedTechnician,
  TechnicianProfile,
  TechnicianRole,
} from "../domain/auth.js";
import { HttpError } from "../errors/http-error.js";
import { verifyPassword } from "../security/password.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  verifyAccessToken,
} from "../security/tokens.js";

const TECHNICIAN_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  tokenVersion: true,
  passwordHash: true,
} satisfies Prisma.TechnicianSelect;
const DUMMY_PASSWORD_HASH =
  "$2b$12$Tcu2GV1LuinOdVojLQ0VxOV9lFXFcQiixu.c.xG4NZvkB2cDj7hoK";
const REFRESH_REUSE_GRACE_MS = 5_000;

type TechnicianRecord = Prisma.TechnicianGetPayload<{
  select: typeof TECHNICIAN_SELECT;
}>;

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  technician: TechnicianProfile;
}

function toProfile(technician: TechnicianRecord): TechnicianProfile {
  return {
    id: technician.id,
    email: technician.email,
    name: technician.name,
    role: technician.role as TechnicianRole,
  };
}

function getRefreshExpiration(): Date {
  return new Date(Date.now() + getRefreshTokenLifetimeSeconds() * 1_000);
}

async function issueSession(
  technician: TechnicianRecord,
  familyId = randomUUID(),
): Promise<AuthSession> {
  const refreshToken = createRefreshToken();

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      familyId,
      technicianId: technician.id,
      expiresAt: getRefreshExpiration(),
    },
  });

  return {
    accessToken: await createAccessToken(
      technician.id,
      technician.role as TechnicianRole,
      technician.tokenVersion,
    ),
    refreshToken,
    technician: toProfile(technician),
  };
}

export async function loginTechnician(
  email: string,
  password: string,
): Promise<AuthSession> {
  const technician = await prisma.technician.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: TECHNICIAN_SELECT,
  });
  const passwordMatches = await verifyPassword(
    password,
    technician?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!technician || !technician.isActive || !passwordMatches) {
    throw new HttpError(401, "Invalid email or password");
  }

  return issueSession(technician);
}

export async function authenticateTechnician(
  accessToken: string,
): Promise<AuthenticatedTechnician> {
  const claims = await verifyAccessToken(accessToken);
  const technician = await prisma.technician.findUnique({
    where: { id: claims.technicianId },
    select: TECHNICIAN_SELECT,
  });

  if (
    !technician ||
    !technician.isActive ||
    technician.tokenVersion !== claims.tokenVersion
  ) {
    throw new HttpError(401, "Authentication is required");
  }

  return {
    ...toProfile(technician),
    accessTokenExpiresAt: claims.expiresAt,
  };
}

export async function refreshTechnicianSession(
  currentToken: string,
): Promise<AuthSession> {
  const now = new Date();
  const currentHash = hashRefreshToken(currentToken);
  const nextToken = createRefreshToken();
  const nextHash = hashRefreshToken(nextToken);

  const result = await prisma.$transaction(async (transaction) => {
    const current = await transaction.refreshToken.findUnique({
      where: { tokenHash: currentHash },
      include: { technician: { select: TECHNICIAN_SELECT } },
    });

    if (!current || current.expiresAt <= now || !current.technician.isActive) {
      return { status: "invalid" as const };
    }

    if (current.revokedAt) {
      if (now.getTime() - current.revokedAt.getTime() < REFRESH_REUSE_GRACE_MS) {
        return { status: "concurrent" as const };
      }

      await transaction.refreshToken.updateMany({
        where: { familyId: current.familyId, revokedAt: null },
        data: { revokedAt: now },
      });
      return { status: "reused" as const };
    }

    const consumedToken = await transaction.refreshToken.updateMany({
      where: {
        tokenHash: currentHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now },
    });

    if (consumedToken.count !== 1) {
      return { status: "concurrent" as const };
    }

    await transaction.refreshToken.create({
      data: {
        tokenHash: nextHash,
        familyId: current.familyId,
        technicianId: current.technicianId,
        expiresAt: getRefreshExpiration(),
      },
    });

    return {
      status: "valid" as const,
      familyId: current.familyId,
      technician: current.technician,
    };
  });

  if (result.status === "concurrent") {
    throw new HttpError(409, "Session refresh is already in progress");
  }

  if (result.status !== "valid") {
    throw new HttpError(401, "Session has expired");
  }

  return {
    accessToken: await createAccessToken(
      result.technician.id,
      result.technician.role as TechnicianRole,
      result.technician.tokenVersion,
    ),
    refreshToken: nextToken,
    technician: toProfile(result.technician),
  };
}

export async function logoutTechnician(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) {
    return;
  }

  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
