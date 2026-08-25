export const TICKET_STATUSES = ["open", "in_progress", "resolved"] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

const ticketStatusValues: ReadonlySet<string> = new Set(TICKET_STATUSES);

export function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === "string" && ticketStatusValues.has(value);
}
