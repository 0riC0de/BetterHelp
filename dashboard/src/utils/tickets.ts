import type {
  Ticket,
  TicketFiltersState,
  TicketMetrics,
} from "@/types/ticket";

export function filterTickets(
  tickets: readonly Ticket[],
  filters: TicketFiltersState,
  deferredSearch: string,
): Ticket[] {
  const search = deferredSearch.trim().toLocaleLowerCase();
  const searchDigits = search.replace(/\D/g, "");

  return tickets.filter((ticket) => {
    if (filters.status !== "all" && ticket.status !== filters.status) return false;
    if (
      filters.classification !== "all" &&
      ticket.aiDecision !== filters.classification
    ) {
      return false;
    }
    if (!search) return true;

    const text = [
      ticket.userName,
      ticket.userPhone,
      ticket.pcNumber === null ? null : String(ticket.pcNumber),
      ticket.summary,
      ticket.rawMessage,
    ]
      .filter((value): value is string => value !== null)
      .join(" ")
      .toLocaleLowerCase();
    const phoneDigits = ticket.userPhone.replace(/\D/g, "");
    return text.includes(search) || Boolean(searchDigits && phoneDigits.includes(searchDigits));
  });
}

export function getTicketMetrics(tickets: readonly Ticket[]): TicketMetrics {
  const today = new Date();
  return tickets.reduce<TicketMetrics>(
    (metrics, ticket) => {
      if (ticket.status === "open") metrics.open += 1;
      if (ticket.status !== "resolved" && ticket.aiDecision === "CAN_AUTO_FIX") {
        metrics.autoFixable += 1;
      }
      if (
        ticket.status !== "resolved" &&
        ticket.aiDecision === "NEEDS_REMOTE_TAKEOVER"
      ) {
        metrics.remoteTakeover += 1;
      }
      if (ticket.resolvedAt && isSameLocalDay(new Date(ticket.resolvedAt), today)) {
        metrics.resolvedToday += 1;
      }
      return metrics;
    },
    { open: 0, autoFixable: 0, remoteTakeover: 0, resolvedToday: 0 },
  );
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return phone;
  return `+${digits.match(/.{1,3}/g)?.join(" ") ?? digits}`;
}

export function getWhatsAppUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

export function formatRelativeTime(isoDate: string, now: number): string {
  const differenceSeconds = Math.round((new Date(isoDate).getTime() - now) / 1_000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const intervals = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ] as const;
  let value = differenceSeconds;

  for (const [boundary, unit] of intervals) {
    if (Math.abs(value) < boundary) {
      return formatter.format(Math.round(value), unit);
    }
    value /= boundary;
  }

  return formatter.format(Math.round(value), "year");
}

export function formatAbsoluteTime(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDate));
}
