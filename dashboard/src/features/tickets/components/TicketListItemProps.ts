import type { Ticket } from "../model";

export interface TicketListItemProps {
  ticket: Ticket;
  selected: boolean;
  now: number;
  onSelect: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
}
