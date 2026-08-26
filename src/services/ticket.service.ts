import { Prisma, type Prisma as PrismaTypes } from "@prisma/client";

import prisma from "../db/prisma.js";
import {
  TICKET_MESSAGE_SELECT,
  toTicketMessageDto,
  type TicketMessageDto,
} from "../domain/ticket-message.js";
import type { TicketStatus } from "../domain/ticket.js";
import {
  TICKET_VIEW_SELECT,
  toTicketDto,
  type TicketDto,
} from "../domain/ticket-view.js";
import { HttpError } from "../errors/http-error.js";
import { publishTicketEvent } from "../realtime/ticket-events.js";

const ACTIVE_STATUSES = ["open", "in_progress"];

export interface IncomingMessageInput {
  chatId: string;
  userPhone: string;
  userName: string | null;
  profilePictureUrl: string | null;
  profilePictureMimeType: string | null;
  profilePictureData: string | null;
  body: string;
  mediaMimeType: string | null;
  mediaData: string | null;
  mediaFileName: string | null;
  externalMessageId: string | null;
  occurredAt: Date;
}

export interface TicketConversation {
  ticket: TicketDto;
  messages: TicketMessageDto[];
}

interface MessageResult {
  ticket: TicketDto;
  message: TicketMessageDto;
  isNew: boolean;
  isNewTicket: boolean;
}

export async function listTickets(
  where: PrismaTypes.TicketWhereInput,
): Promise<TicketDto[]> {
  const tickets = await prisma.ticket.findMany({
    where,
    select: TICKET_VIEW_SELECT,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });
  return tickets.map(toTicketDto);
}

export async function getTicketConversation(
  ticketId: number,
): Promise<TicketConversation> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      ...TICKET_VIEW_SELECT,
      messages: {
        select: TICKET_MESSAGE_SELECT,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
  });
  if (!ticket) throw new HttpError(404, "Ticket not found");
  const { messages, ...ticketRecord } = ticket;
  return {
    ticket: toTicketDto(ticketRecord),
    messages: messages.map(toTicketMessageDto),
  };
}

async function findMessageByExternalId(
  externalMessageId: string | null,
): Promise<MessageResult | null> {
  if (!externalMessageId) return null;
  const existing = await prisma.ticketMessage.findUnique({
    where: { externalMessageId },
    select: { ...TICKET_MESSAGE_SELECT, ticket: { select: TICKET_VIEW_SELECT } },
  });
  if (!existing) return null;
  const { ticket, ...message } = existing;
  return {
    ticket: toTicketDto(ticket),
    message: toTicketMessageDto(message),
    isNew: false,
    isNewTicket: false,
  };
}

async function persistIncomingMessage(input: IncomingMessageInput): Promise<MessageResult> {
  return prisma.$transaction(async (transaction) => {
    const activeTicket = await transaction.ticket.findFirst({
      where: { chatId: input.chatId, status: { in: ACTIVE_STATUSES } },
      orderBy: { id: "desc" },
      select: TICKET_VIEW_SELECT,
    });
    let ticket;
    let isNewTicket = !activeTicket;
    if (activeTicket) {
      const updated = await transaction.ticket.updateMany({
          where: { id: activeTicket.id, status: { in: ACTIVE_STATUSES } },
          data: {
            userName: input.userName ?? activeTicket.userName,
            userPhone: input.userPhone,
            profilePictureUrl: input.profilePictureUrl ?? activeTicket.profilePictureUrl,
            ...(input.profilePictureMimeType && input.profilePictureData ? {
              profilePictureMimeType: input.profilePictureMimeType,
              profilePictureData: input.profilePictureData,
            } : {}),
            archivedAt: null,
            updatedAt: input.occurredAt,
          },
        });
      if (updated.count === 1) {
        ticket = await transaction.ticket.findUniqueOrThrow({
          where: { id: activeTicket.id },
          select: TICKET_VIEW_SELECT,
        });
      } else {
        isNewTicket = true;
      }
    }
    ticket ??= await transaction.ticket.create({
          data: {
            chatId: input.chatId,
            userPhone: input.userPhone,
            userName: input.userName,
            profilePictureUrl: input.profilePictureUrl,
            profilePictureMimeType: input.profilePictureMimeType,
            profilePictureData: input.profilePictureData,
            rawMessage: input.body,
            status: "open",
            updatedAt: input.occurredAt,
          },
          select: TICKET_VIEW_SELECT,
        });
    const message = await transaction.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        direction: "INBOUND",
        body: input.body,
        deliveryStatus: "RECEIVED",
        externalMessageId: input.externalMessageId,
        sentAt: input.occurredAt,
        createdAt: input.occurredAt,
        mediaMimeType: input.mediaMimeType,
        mediaData: input.mediaData,
        mediaFileName: input.mediaFileName,
      },
      select: TICKET_MESSAGE_SELECT,
    });
    return {
      ticket: toTicketDto(ticket),
      message: toTicketMessageDto(message),
      isNew: true,
      isNewTicket,
    };
  });
}

export async function acceptIncomingMessage(
  input: IncomingMessageInput,
): Promise<MessageResult> {
  const duplicate = await findMessageByExternalId(input.externalMessageId);
  if (duplicate) return duplicate;
  try {
    return await persistIncomingMessage(input);
  } catch (error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
    const racedDuplicate = await findMessageByExternalId(input.externalMessageId);
    if (racedDuplicate) return racedDuplicate;
    return persistIncomingMessage(input);
  }
}

export async function createPendingOutgoingMessage(
  ticketId: number,
  technicianId: number,
  body: string,
  clientRequestId: string,
  media?: { mimeType: string; data: string; fileName: string },
): Promise<MessageResult> {
  const existing = await prisma.ticketMessage.findUnique({
    where: { clientRequestId },
    select: { ...TICKET_MESSAGE_SELECT, ticket: { select: TICKET_VIEW_SELECT } },
  });
  if (existing) {
    const { ticket, ...message } = existing;
    if (
      message.ticketId !== ticketId ||
      message.body !== body ||
      message.mediaMimeType !== (media?.mimeType ?? null) ||
      message.mediaFileName !== (media?.fileName ?? null)
    ) {
      throw new HttpError(409, "Client request ID was already used for another message");
    }
    const canRetry =
      message.deliveryStatus === "FAILED" ||
      (message.deliveryStatus === "PENDING" &&
        Date.now() - message.createdAt.getTime() > 30_000);
    return {
      ticket: toTicketDto(ticket),
      message: toTicketMessageDto(message),
      isNew: canRetry,
      isNewTicket: false,
    };
  }

  try {
    return await prisma.$transaction(async (transaction) => {
    const current = await transaction.ticket.findUnique({
      where: { id: ticketId },
      select: TICKET_VIEW_SELECT,
    });
    if (!current) throw new HttpError(404, "Ticket not found");
    const claimed = await transaction.ticket.updateMany({
      where: { id: ticketId, status: { in: ACTIVE_STATUSES } },
      data: { updatedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new HttpError(409, "Reopen the ticket before sending a message");
    }
    const ticket = await transaction.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      select: TICKET_VIEW_SELECT,
    });
    const message = await transaction.ticketMessage.create({
      data: {
        ticketId,
        technicianId,
        direction: "OUTBOUND",
        body,
        deliveryStatus: "PENDING",
        clientRequestId,
        ...(media ? {
          mediaMimeType: media.mimeType,
          mediaData: media.data,
          mediaFileName: media.fileName,
        } : {}),
      },
      select: TICKET_MESSAGE_SELECT,
    });
    return {
      ticket: toTicketDto(ticket),
      message: toTicketMessageDto(message),
      isNew: true,
      isNewTicket: false,
    };
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return createPendingOutgoingMessage(ticketId, technicianId, body, clientRequestId, media);
    }
    throw error;
  }
}

export async function markOutgoingMessage(
  messageId: number,
  deliveryStatus: "PENDING" | "SENT" | "FAILED",
  externalMessageId?: string,
): Promise<TicketMessageDto> {
  const message = await prisma.ticketMessage.update({
    where: { id: messageId },
    data: {
      deliveryStatus,
      ...(externalMessageId ? { externalMessageId } : {}),
      ...(deliveryStatus === "SENT" ? { sentAt: new Date() } : {}),
    },
    select: TICKET_MESSAGE_SELECT,
  });
  return toTicketMessageDto(message);
}

export async function recordAutomaticReply(
  ticketId: number,
  body: string,
  externalMessageId: string | null,
): Promise<TicketMessageDto> {
  const message = await prisma.ticketMessage.create({
    data: {
      ticketId,
      direction: "OUTBOUND",
      body,
      deliveryStatus: "SENT",
      externalMessageId,
      sentAt: new Date(),
    },
    select: TICKET_MESSAGE_SELECT,
  });
  return toTicketMessageDto(message);
}

export async function changeTicketStatus(
  ticketId: number,
  status: TicketStatus,
): Promise<TicketDto> {
  try {
    const updated = await prisma.ticket.updateMany({
      where: { id: ticketId, archivedAt: null },
      data: { status, resolvedAt: status === "resolved" ? new Date() : null },
    });
    if (updated.count !== 1) {
      const exists = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
      if (!exists) throw new HttpError(404, "Ticket not found");
      throw new HttpError(409, "Unarchive the ticket before changing its status");
    }
    const ticket = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      select: TICKET_VIEW_SELECT,
    });
    const ticketDto = toTicketDto(ticket);
    publishTicketEvent({ type: "updated", reason: "status_changed", ticket: ticketDto });
    return ticketDto;
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") throw new HttpError(404, "Ticket not found");
      if (error.code === "P2002") {
        throw new HttpError(409, "Another ticket is already active for this chat");
      }
    }
    throw error;
  }
}

export async function setTicketArchived(
  ticketId: number,
  archived: boolean,
): Promise<TicketDto> {
  const current = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: TICKET_VIEW_SELECT,
  });
  if (!current) throw new HttpError(404, "Ticket not found");
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { archivedAt: archived ? new Date() : null },
    select: TICKET_VIEW_SELECT,
  });
  const ticketDto = toTicketDto(ticket);
  publishTicketEvent({ type: "updated", reason: "archive_changed", ticket: ticketDto });
  return ticketDto;
}
