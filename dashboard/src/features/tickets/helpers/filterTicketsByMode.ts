import type { Ticket } from "../model";

export type TicketListMode = "inbox" | "archived";

export function filterTicketsByMode(
  tickets: readonly Ticket[],
  mode: TicketListMode,
  search: string,
): Ticket[] {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const searchDigits = normalizedSearch.replace(/\D/g, "");
  return tickets.filter((ticket) => {
    if ((mode === "archived") !== Boolean(ticket.archivedAt)) return false;
    if (!normalizedSearch) return true;
    const text = [ticket.userName, ticket.userPhone, ticket.pcNumber, ticket.summary, ticket.rawMessage]
      .filter((value) => value !== null)
      .join(" ")
      .toLocaleLowerCase();
    return text.includes(normalizedSearch) || Boolean(searchDigits && ticket.userPhone.replace(/\D/g, "").includes(searchDigits));
  });
}
