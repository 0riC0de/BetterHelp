import type { TicketListMode } from "../helpers/filterTicketsByMode";
import type { Ticket } from "../model";

export interface TicketInboxProps {
  tickets: Ticket[];
  selectedId: number | null;
  mode: TicketListMode;
  search: string;
  now: number;
  onModeChange: (mode: TicketListMode) => void;
  onSearchChange: (search: string) => void;
  onSelect: (ticketId: number) => void;
  onArchive?: (ticketId: number) => void;
  onUnarchive?: (ticketId: number) => void;
}
