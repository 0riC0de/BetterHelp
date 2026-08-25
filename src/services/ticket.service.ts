import { Prisma, type Prisma as PrismaTypes } from "@prisma/client";

import prisma from "../db/prisma.js";
import type { TicketStatus } from "../domain/ticket.js";
import {
  TICKET_VIEW_SELECT,
  toTicketDto,
  type TicketDto,
} from "../domain/ticket-view.js";
import { HttpError } from "../errors/http-error.js";
import { publishTicketEvent } from "../realtime/ticket-events.js";

export async function listTickets(
  where: PrismaTypes.TicketWhereInput,
): Promise<TicketDto[]> {
  const tickets = await prisma.ticket.findMany({
    where,
    select: TICKET_VIEW_SELECT,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return tickets.map(toTicketDto);
}

export async function changeTicketStatus(
  ticketId: number,
  status: TicketStatus,
): Promise<TicketDto> {
  try {
    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status,
        resolvedAt: status === "resolved" ? new Date() : null,
      },
      select: TICKET_VIEW_SELECT,
    });
    const ticketDto = toTicketDto(ticket);
    publishTicketEvent({
      type: "updated",
      reason: "status_changed",
      ticket: ticketDto,
    });
    return ticketDto;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpError(404, "Ticket not found");
    }

    throw error;
  }
}
