import type { MessageDeliveryStatus } from "./MessageDeliveryStatus";
import type { MessageDirection } from "./MessageDirection";

export interface TicketMessage {
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
  mediaMimeType: string | null;
  mediaData: string | null;
  mediaFileName: string | null;
  hasMedia: boolean;
}
