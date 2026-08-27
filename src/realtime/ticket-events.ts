import { EventEmitter } from "node:events";

import type { TicketDto } from "../domain/ticket-view.js";
import type { TicketMessageDto } from "../domain/ticket-message.js";

export type TicketUpdateReason =
  | "triage_completed"
  | "status_changed"
  | "message_received"
  | "archive_changed"
  | "queue_changed";

export type TicketDomainEvent =
  | { type: "created"; ticket: TicketDto }
  | { type: "updated"; reason: TicketUpdateReason; ticket: TicketDto }
  | { type: "message"; ticket: TicketDto; message: TicketMessageDto };

type TicketEventListener = (event: TicketDomainEvent) => void;
const eventBus = new EventEmitter();

export function publishTicketEvent(event: TicketDomainEvent): void {
  try {
    eventBus.emit("ticket", event);
  } catch (error: unknown) {
    console.error("Ticket realtime publication failed", error);
  }
}

export function subscribeToTicketEvents(listener: TicketEventListener): () => void {
  eventBus.on("ticket", listener);
  return () => eventBus.off("ticket", listener);
}
