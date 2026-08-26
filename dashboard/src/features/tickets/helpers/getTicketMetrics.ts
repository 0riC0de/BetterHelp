import type { Ticket, TicketMetrics } from "../model";

export function getTicketMetrics(tickets: readonly Ticket[]): TicketMetrics {
  const today = new Date();
  return tickets.reduce<TicketMetrics>((metrics, ticket) => {
    if (ticket.status !== "resolved") metrics.active += 1;
    if (ticket.status === "open") metrics.open += 1;
    if (ticket.status === "in_progress") metrics.inProgress += 1;
    if (ticket.status !== "resolved" && ticket.aiDecision === "CAN_AUTO_FIX") metrics.autoFixable += 1;
    if (ticket.status !== "resolved" && ticket.aiDecision === "NEEDS_REMOTE_TAKEOVER") metrics.remoteTakeover += 1;
    if (ticket.resolvedAt && isSameLocalDay(new Date(ticket.resolvedAt), today)) metrics.resolvedToday += 1;
    return metrics;
  }, { active: 0, open: 0, inProgress: 0, autoFixable: 0, remoteTakeover: 0, resolvedToday: 0 });
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}
