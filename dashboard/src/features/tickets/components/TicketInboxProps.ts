import type { TicketListMode } from "../helpers/filterTicketsByMode";
import type { Ticket } from "../model";
import type { Queue } from "@/features/queues/model";

export interface TicketInboxProps {
  tickets: Ticket[];
  queues: Queue[];
  selectedId: number | null;
  mode: TicketListMode;
  search: string;
  queueFilter: string;
  now: number;
  onModeChange: (mode: TicketListMode) => void;
  onSearchChange: (search: string) => void;
  onQueueFilterChange: (queueId: string) => void;
  onSelect: (ticketId: number) => void;
  onArchive?: (ticketId: number) => void;
  onUnarchive?: (ticketId: number) => void;
}
