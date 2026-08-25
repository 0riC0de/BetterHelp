import type { Prisma } from "@prisma/client";

import type { TicketStatus } from "./ticket.js";
import type { TriageClassification } from "./triage.js";

export const TICKET_VIEW_SELECT = {
  id: true,
  chatId: true,
  profilePictureUrl: true,
  machineId: true,
  userPhone: true,
  userName: true,
  pcNumber: true,
  rawMessage: true,
  summary: true,
  status: true,
  aiDecision: true,
  aiConfidence: true,
  suggestedScript: true,
  scriptExecuted: true,
  executionOutput: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  archivedAt: true,
} satisfies Prisma.TicketSelect;

export type TicketRecord = Prisma.TicketGetPayload<{
  select: typeof TICKET_VIEW_SELECT;
}>;

export interface TicketDto {
  id: number;
  chatId: string | null;
  profilePictureUrl: string | null;
  machineId: number | null;
  userPhone: string;
  userName: string | null;
  pcNumber: number | null;
  rawMessage: string;
  summary: string | null;
  status: TicketStatus;
  aiDecision: TriageClassification | null;
  aiConfidence: number | null;
  suggestedScript: string | null;
  scriptExecuted: string | null;
  executionOutput: Prisma.JsonValue | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  archivedAt: string | null;
}

export function toTicketDto(ticket: TicketRecord): TicketDto {
  return {
    ...ticket,
    status: ticket.status as TicketStatus,
    aiDecision: ticket.aiDecision as TriageClassification | null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    archivedAt: ticket.archivedAt?.toISOString() ?? null,
  };
}
