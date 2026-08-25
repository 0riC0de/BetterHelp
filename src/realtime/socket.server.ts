import { randomUUID } from "node:crypto";
import type { Server as HttpServer } from "node:http";

import { Server } from "socket.io";

import { getDashboardAllowedOrigins } from "../config/environment.js";
import { ACCESS_TOKEN_COOKIE } from "../domain/auth.js";
import type { AuthenticatedTechnician } from "../domain/auth.js";
import { readCookie } from "../middleware/auth.middleware.js";
import { isDashboardOriginAllowed } from "../security/origins.js";
import { authenticateTechnician } from "../services/auth.service.js";
import type {
  ServerToClientEvents,
  TicketCreatedEvent,
  TicketUpdatedEvent,
} from "./contracts.js";
import {
  subscribeToTicketEvents,
} from "./ticket-events.js";

const CHECKPOINT_INTERVAL_MS = 15_000;
const SHUTDOWN_RETRY_MS = 2_000;
const MAXIMUM_TIMER_DELAY_MS = 2_147_483_647;

interface SocketData {
  technician: AuthenticatedTechnician;
}

interface RealtimeServer {
  close: () => Promise<void>;
}

function createSocketAuthenticationError(): Error & { data?: unknown } {
  const error: Error & { data?: unknown } = new Error("Authentication required");
  error.data = { code: "UNAUTHORIZED" };
  return error;
}

export function createRealtimeServer(httpServer: HttpServer): RealtimeServer {
  const io = new Server<Record<string, never>, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    transports: ["websocket"],
    maxHttpBufferSize: 64 * 1_024,
    cors: {
      origin: [...getDashboardAllowedOrigins()],
      credentials: true,
    },
    allowRequest: (request, callback) => {
      callback(null, isDashboardOriginAllowed(request.headers.origin));
    },
  });
  const dashboard = io.of("/dashboard");
  const streamId = randomUUID();
  let sequence = 0;

  dashboard.use((socket, next) => {
    const accessToken = readCookie(
      socket.request.headers.cookie,
      ACCESS_TOKEN_COOKIE,
    );

    if (!accessToken) {
      next(createSocketAuthenticationError());
      return;
    }

    void authenticateTechnician(accessToken)
      .then((technician) => {
        socket.data.technician = technician;
        next();
      })
      .catch(() => next(createSocketAuthenticationError()));
  });

  dashboard.on("connection", (socket) => {
    socket.emit("realtime:ready", {
      protocolVersion: 1,
      streamId,
      lastSequence: sequence,
      serverTime: new Date().toISOString(),
    });

    const tokenLifetimeMs = Math.max(
      0,
      socket.data.technician.accessTokenExpiresAt * 1_000 - Date.now(),
    );
    const expirationTimer = setTimeout(() => {
      socket.emit("auth:expired");
      socket.disconnect(true);
    }, Math.min(tokenLifetimeMs, MAXIMUM_TIMER_DELAY_MS));

    socket.once("disconnect", () => clearTimeout(expirationTimer));
  });

  const unsubscribe = subscribeToTicketEvents((event) => {
    sequence += 1;
    const baseEvent = {
      protocolVersion: 1 as const,
      eventId: `${streamId}:${sequence}`,
      streamId,
      sequence,
      occurredAt: new Date().toISOString(),
      ticket: event.ticket,
    };

    if (event.type === "created") {
      dashboard.emit("ticket:created", baseEvent satisfies TicketCreatedEvent);
      return;
    }

    dashboard.emit("ticket:updated", {
      ...baseEvent,
      reason: event.reason,
    } satisfies TicketUpdatedEvent);
  });

  const checkpointTimer = setInterval(() => {
    dashboard.emit("realtime:checkpoint", {
      protocolVersion: 1,
      streamId,
      lastSequence: sequence,
      serverTime: new Date().toISOString(),
    });
  }, CHECKPOINT_INTERVAL_MS);
  checkpointTimer.unref();

  return {
    close: () =>
      new Promise((resolve, reject) => {
        unsubscribe();
        clearInterval(checkpointTimer);
        dashboard.emit("realtime:shutdown", {
          retryAfterMs: SHUTDOWN_RETRY_MS,
        });
        dashboard.disconnectSockets(true);
        io.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
}
