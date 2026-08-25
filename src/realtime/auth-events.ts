import { EventEmitter } from "node:events";

const authEventBus = new EventEmitter();

export function publishTechnicianRevoked(technicianId: number): void {
  authEventBus.emit("revoked", technicianId);
}

export function subscribeToTechnicianRevoked(
  listener: (technicianId: number) => void,
): () => void {
  authEventBus.on("revoked", listener);
  return () => authEventBus.off("revoked", listener);
}
