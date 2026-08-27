import type { Ticket } from "../model";

export type TicketListMode = "inbox" | "archived";

export function filterTicketsByMode(
  tickets: readonly Ticket[],
  mode: TicketListMode,
  search: string,
  queueFilter = "all",
): Ticket[] {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const searchDigits = normalizedSearch.replace(/\D/g, "");
  return tickets.filter((ticket) => {
    if ((mode === "archived") !== Boolean(ticket.archivedAt)) return false;
    if (queueFilter === "unassigned" && ticket.queue) return false;
    if (queueFilter !== "all" && queueFilter !== "unassigned" && String(ticket.queue?.id ?? "") !== queueFilter) return false;
    if (!normalizedSearch) return true;
    const text = [ticket.userName, ticket.userPhone, ticket.pcNumber, ticket.summary, ticket.rawMessage, ticket.queue?.name]
      .filter((value) => value != null)
      .join(" ")
      .toLocaleLowerCase();
    return text.includes(normalizedSearch) || Boolean(searchDigits && ticket.userPhone.replace(/\D/g, "").includes(searchDigits));
  });
}
