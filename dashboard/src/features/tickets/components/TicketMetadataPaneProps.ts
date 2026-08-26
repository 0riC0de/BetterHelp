import type { Ticket, TicketStatus } from "../model";

export interface TicketMetadataPaneProps {
  ticket: Ticket;
  pending: boolean;
  onStatusChange: (status: TicketStatus) => Promise<void>;
  onArchiveChange: (archived: boolean) => Promise<void>;
}
