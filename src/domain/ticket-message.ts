import type {
  MessageDeliveryStatus,
  MessageDirection,
  Prisma,
} from "@prisma/client";

export const TICKET_MESSAGE_SELECT = {
  id: true,
  ticketId: true,
  technicianId: true,
  direction: true,
  body: true,
  deliveryStatus: true,
  externalMessageId: true,
  clientRequestId: true,
  sentAt: true,
  createdAt: true,
  technician: { select: { name: true } },
} satisfies Prisma.TicketMessageSelect;

export type TicketMessageRecord = Prisma.TicketMessageGetPayload<{
  select: typeof TICKET_MESSAGE_SELECT;
}>;

export interface TicketMessageDto {
  id: number;
  ticketId: number;
  technicianId: number | null;
  technicianName: string | null;
  direction: MessageDirection;
  body: string;
  deliveryStatus: MessageDeliveryStatus;
  clientRequestId: string | null;
  sentAt: string | null;
  createdAt: string;
}

export function toTicketMessageDto(message: TicketMessageRecord): TicketMessageDto {
  return {
    id: message.id,
    ticketId: message.ticketId,
    technicianId: message.technicianId,
    technicianName: message.technician?.name ?? null,
    direction: message.direction,
    body: message.body,
    deliveryStatus: message.deliveryStatus,
    clientRequestId: message.clientRequestId,
    sentAt: message.sentAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}
