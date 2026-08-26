import prisma from "../../db/prisma.js";
import { clearProfilePictureCache } from "../profile-pictures/profile-picture.service.js";
import type { ClearTarget } from "./ClearTarget.js";
import type { DatabaseSummary } from "./DatabaseSummary.js";
import type { DataMaintenanceResult } from "./DataMaintenanceResult.js";

const MAINTENANCE_LOCK_ID = 8_204_202_626;

export async function getDatabaseSummary(): Promise<DatabaseSummary> {
  const now = new Date();
  const [tickets, archivedTickets, messages, messagesWithMedia, profilePictures, machines, departments, wakeAttempts, expiredOrRevokedRefreshTokens] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { archivedAt: { not: null } } }),
    prisma.ticketMessage.count(),
    prisma.ticketMessage.count({ where: { mediaData: { not: null } } }),
    prisma.ticket.count({ where: { OR: [{ profilePictureUrl: { not: null } }, { profilePictureData: { not: null } }] } }),
    prisma.machine.count(),
    prisma.department.count(),
    prisma.wakeAttempt.count(),
    prisma.refreshToken.count({ where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }] } }),
  ]);
  return { tickets, archivedTickets, messages, messagesWithMedia, profilePictures, machines, departments, wakeAttempts, expiredOrRevokedRefreshTokens };
}

export async function clearDatabaseTarget(target: ClearTarget): Promise<DataMaintenanceResult> {
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${MAINTENANCE_LOCK_ID})`;
    let affectedRows = 0;
    if (target === "archived_tickets") affectedRows = (await transaction.ticket.deleteMany({ where: { archivedAt: { not: null } } })).count;
    if (target === "all_tickets") affectedRows = (await transaction.ticket.deleteMany()).count;
    if (target === "message_history") affectedRows = (await transaction.ticketMessage.deleteMany()).count;
    if (target === "ticket_media") affectedRows = (await transaction.ticketMessage.updateMany({ where: { mediaData: { not: null } }, data: { mediaData: null, mediaMimeType: null, mediaFileName: null } })).count;
    if (target === "profile_pictures") {
      affectedRows = (await transaction.ticket.updateMany({
        where: { OR: [{ profilePictureUrl: { not: null } }, { profilePictureData: { not: null } }] },
        data: { profilePictureUrl: null, profilePictureMimeType: null, profilePictureData: null },
      })).count;
      clearProfilePictureCache();
    }
    if (target === "wake_attempts") affectedRows = (await transaction.wakeAttempt.deleteMany()).count;
    if (target === "expired_refresh_tokens") affectedRows = (await transaction.refreshToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }] } })).count;
    if (target === "inventory") {
      affectedRows += (await transaction.wakeAttempt.deleteMany()).count;
      await transaction.ticket.updateMany({ data: { machineId: null } });
      affectedRows += (await transaction.machine.deleteMany()).count;
      affectedRows += (await transaction.department.deleteMany()).count;
    }
    return { target, affectedRows };
  }, { isolationLevel: "Serializable" });
}
