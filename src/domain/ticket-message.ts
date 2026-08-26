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
  mediaMimeType: true,
  mediaData: true,
  mediaFileName: true,
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
  mediaMimeType: string | null;
  mediaData: string | null;
  mediaFileName: string | null;
  hasMedia: boolean;
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
    mediaMimeType: message.mediaMimeType,
    mediaData: null,
    mediaFileName: message.mediaFileName,
    hasMedia: Boolean(message.mediaMimeType && message.mediaData),
    createdAt: message.createdAt.toISOString(),
  };
}
