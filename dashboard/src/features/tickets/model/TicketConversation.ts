import type { Ticket } from "./Ticket";
import type { TicketMessage } from "./TicketMessage";

export interface TicketConversation {
  ticket: Ticket;
  messages: TicketMessage[];
}
