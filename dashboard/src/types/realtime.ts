import type { Ticket } from "./ticket";

export type ConnectionStatus =
  | "syncing"
  | "live"
  | "reconnecting"
  | "polling"
  | "offline";

export interface RealtimeReadyEvent {
  protocolVersion: 1;
  streamId: string;
  lastSequence: number;
  serverTime: string;
}

export interface TicketCreatedEvent {
  protocolVersion: 1;
  eventId: string;
  streamId: string;
  sequence: number;
  occurredAt: string;
  ticket: Ticket;
}

export interface TicketUpdatedEvent extends TicketCreatedEvent {
  reason: "triage_completed" | "status_changed";
}

export interface RealtimeCheckpointEvent {
  protocolVersion: 1;
  streamId: string;
  lastSequence: number;
  serverTime: string;
}

export interface ServerToClientEvents {
  "realtime:ready": (event: RealtimeReadyEvent) => void;
  "realtime:checkpoint": (event: RealtimeCheckpointEvent) => void;
  "realtime:shutdown": (event: { retryAfterMs: number }) => void;
  "auth:expired": () => void;
  "ticket:created": (event: TicketCreatedEvent) => void;
  "ticket:updated": (event: TicketUpdatedEvent) => void;
}

export type TicketRealtimeEvent = TicketCreatedEvent | TicketUpdatedEvent;
