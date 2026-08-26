import type { AiDecision } from "./AiDecision";
import type { JsonValue } from "./JsonValue";
import type { TicketStatus } from "./TicketStatus";

export interface Ticket {
  id: number;
  chatId: string | null;
  profilePictureUrl: string | null;
  hasProfilePicture: boolean;
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
