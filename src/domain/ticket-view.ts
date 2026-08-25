import type { Prisma } from "@prisma/client";

import type { TicketStatus } from "./ticket.js";
import type { TriageClassification } from "./triage.js";

export const TICKET_VIEW_SELECT = {
  id: true,
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
  resolvedAt: true,
} satisfies Prisma.TicketSelect;

export type TicketRecord = Prisma.TicketGetPayload<{
  select: typeof TICKET_VIEW_SELECT;
}>;

export interface TicketDto {
  id: number;
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
  resolvedAt: string | null;
}

export function toTicketDto(ticket: TicketRecord): TicketDto {
  return {
    ...ticket,
    status: ticket.status as TicketStatus,
    aiDecision: ticket.aiDecision as TriageClassification | null,
    createdAt: ticket.createdAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
  };
}
