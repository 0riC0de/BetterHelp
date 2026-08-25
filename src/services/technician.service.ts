import { Prisma, type TechnicianRole } from "@prisma/client";

import prisma from "../db/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { hashPassword } from "../security/password.js";
import { publishTechnicianRevoked } from "../realtime/auth-events.js";

const TECHNICIAN_LIST_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.TechnicianSelect;

type TechnicianRecord = Prisma.TechnicianGetPayload<{
  select: typeof TECHNICIAN_LIST_SELECT;
}>;

export interface ManagedTechnician {
  id: number;
  email: string;
  name: string;
  role: TechnicianRole;
  isActive: boolean;
  createdAt: string;
}

function toManagedTechnician(technician: TechnicianRecord): ManagedTechnician {
  return { ...technician, createdAt: technician.createdAt.toISOString() };
}

export async function listTechnicians(): Promise<ManagedTechnician[]> {
  const technicians = await prisma.technician.findMany({
    where: { isActive: true },
    select: TECHNICIAN_LIST_SELECT,
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  return technicians.map(toManagedTechnician);
}

export async function createTechnician(input: {
  email: string;
  name: string;
  password: string;
  role: TechnicianRole;
}): Promise<ManagedTechnician> {
  try {
    const technician = await prisma.technician.create({
      data: {
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        passwordHash: await hashPassword(input.password),
        role: input.role,
      },
      select: TECHNICIAN_LIST_SELECT,
    });
    return toManagedTechnician(technician);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "A technician with this email already exists");
    }
    throw error;
  }
}

export async function deleteTechnician(
  technicianId: number,
  currentTechnicianId: number,
): Promise<void> {
  if (technicianId === currentTechnicianId) {
    throw new HttpError(409, "You cannot delete your own account");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(4815162342)`;
    const technician = await transaction.technician.findUnique({
      where: { id: technicianId },
      select: { role: true, isActive: true },
    });
    if (!technician || !technician.isActive) {
      throw new HttpError(404, "Technician not found");
    }
    if (technician.role === "ADMIN") {
      const activeAdministrators = await transaction.technician.count({
        where: { role: "ADMIN", isActive: true },
      });
      if (activeAdministrators <= 1) {
        throw new HttpError(409, "The last active administrator cannot be deleted");
      }
    }
    const now = new Date();
    await transaction.technician.update({
      where: { id: technicianId },
      data: { isActive: false, tokenVersion: { increment: 1 } },
    });
    await transaction.refreshToken.updateMany({
      where: { technicianId, revokedAt: null },
      data: { revokedAt: now },
    });
  });
  publishTechnicianRevoked(technicianId);
}

export async function resetTechnicianPassword(
  technicianId: number,
  password: string,
): Promise<void> {
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new HttpError(400, "Password must be 12 to 72 UTF-8 bytes");
  }
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (transaction) => {
    const updated = await transaction.technician.updateMany({
      where: { id: technicianId, isActive: true },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    if (updated.count !== 1) throw new HttpError(404, "Technician not found");
    await transaction.refreshToken.updateMany({
      where: { technicianId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });
  publishTechnicianRevoked(technicianId);
}
