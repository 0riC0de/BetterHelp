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
  chatId: string | null;
  profilePictureUrl: string | null;
  machineId: number | null;
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
  updatedAt: string;
  resolvedAt: string | null;
  archivedAt: string | null;
}

export type MessageDirection = "INBOUND" | "OUTBOUND";
export type MessageDeliveryStatus = "RECEIVED" | "PENDING" | "SENT" | "FAILED";

export interface TicketMessage {
  id: number;
  ticketId: number;
  technicianId: number | null;
  technicianName: string | null;
  direction: MessageDirection;
  body: string;
  deliveryStatus: MessageDeliveryStatus;
  clientRequestId: string | null;
  sentAt: string | null;
  createdAt: string;
  mediaMimeType: string | null;
  mediaData: string | null;
  mediaFileName: string | null;
  hasMedia: boolean;
}

export interface TicketConversation {
  ticket: Ticket;
  messages: TicketMessage[];
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
  active: number;
  open: number;
  inProgress: number;
  autoFixable: number;
  remoteTakeover: number;
  resolvedToday: number;
}

export interface HealthResponse {
  status: "ok";
  uptime: number;
}
