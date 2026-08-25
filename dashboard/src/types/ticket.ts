export const TICKET_STATUSES = ["open", "in_progress", "resolved"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const AI_DECISIONS = [
  "CAN_AUTO_FIX",
  "NEEDS_REMOTE_TAKEOVER",
  "MANUAL_VISIT_REQUIRED",
] as const;
export type AiDecision = (typeof AI_DECISIONS)[number];

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface Ticket {
  id: number;
  userPhone: string;
  userName: string | null;
  pcNumber: number | null;
  rawMessage: string;
  summary: string | null;
  status: TicketStatus;
  aiDecision: AiDecision | null;
  aiConfidence: number | null;
  suggestedScript: string | null;
  scriptExecuted: string | null;
  executionOutput: JsonValue | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface TicketListResponse {
  tickets: Ticket[];
}

export interface TicketFiltersState {
  status: "all" | TicketStatus;
  classification: "all" | AiDecision;
  search: string;
}

export interface TicketMetrics {
  open: number;
  autoFixable: number;
  remoteTakeover: number;
  resolvedToday: number;
}

export interface HealthResponse {
  status: "ok";
  uptime: number;
}
