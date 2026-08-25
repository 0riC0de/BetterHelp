import { createServer } from "node:http";

import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it, vi } from "vitest";

const authService = vi.hoisted(() => ({ authenticateTechnician: vi.fn() }));
vi.mock("../src/services/auth.service.js", () => authService);

import { publishTicketEvent } from "../src/realtime/ticket-events.js";
import { createRealtimeServer } from "../src/realtime/socket.server.js";

const openClients: Socket[] = [];

afterEach(() => {
  for (const client of openClients.splice(0)) client.disconnect();
});

describe("dashboard WebSocket", () => {
  it("uses WebSocket transport and broadcasts committed ticket events", async () => {
    authService.authenticateTechnician.mockResolvedValue({
      id: 1,
      email: "admin@example.com",
      name: "Administrator",
      role: "ADMIN",
      accessTokenExpiresAt: Math.floor(Date.now() / 1_000) + 900,
    });
    const httpServer = createServer();
    const realtimeServer = createRealtimeServer(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
    const address = httpServer.address();
    if (!address || typeof address === "string") throw new Error("Missing test port");

    const client = createClient(`http://127.0.0.1:${address.port}/dashboard`, {
      transports: ["websocket"],
      reconnection: false,
      extraHeaders: {
        Origin: "http://localhost:3001",
        Cookie: "helpdesk_access=test-token",
      },
    });
    openClients.push(client);
    await new Promise<void>((resolve, reject) => {
      client.once("connect", resolve);
      client.once("connect_error", reject);
    });
    expect(client.io.engine.transport.name).toBe("websocket");

    const receivedEvent = new Promise<{ ticket: { id: number } }>((resolve) => {
      client.once("ticket:created", resolve);
    });
    publishTicketEvent({
      type: "created",
      ticket: {
        id: 9,
        userPhone: "972501234567",
        userName: null,
        pcNumber: null,
        rawMessage: "Network unavailable",
        summary: null,
        status: "open",
        aiDecision: null,
        aiConfidence: null,
        suggestedScript: null,
        scriptExecuted: null,
        executionOutput: null,
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      },
    });

    await expect(receivedEvent).resolves.toMatchObject({ ticket: { id: 9 } });
    client.disconnect();
    await realtimeServer.close();
  });
});
