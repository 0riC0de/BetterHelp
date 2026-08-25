import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  ticket: {
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
}));
const events = vi.hoisted(() => ({ publishTicketEvent: vi.fn() }));

vi.mock("../src/db/prisma.js", () => ({ default: database }));
vi.mock("../src/realtime/ticket-events.js", () => events);

import { changeTicketStatus } from "../src/services/ticket.service.js";

function ticketRecord(status: string, resolvedAt: Date | null) {
  return {
    id: 7,
    chatId: "972501234567@c.us",
    userPhone: "972501234567",
    userName: "Test Reporter",
    pcNumber: 4,
    rawMessage: "Printer is offline",
    summary: "Printer issue",
    status,
    aiDecision: "CAN_AUTO_FIX",
    aiConfidence: 0.95,
    suggestedScript: "restart_spooler",
    scriptExecuted: null,
    executionOutput: null,
    createdAt: new Date("2026-08-25T08:00:00.000Z"),
    updatedAt: new Date("2026-08-25T08:05:00.000Z"),
    resolvedAt,
    profilePictureUrl: null,
    machineId: null,
    archivedAt: null,
  };
}

describe("changeTicketStatus", () => {
  beforeEach(() => {
    database.ticket.update.mockReset();
    database.ticket.updateMany.mockReset();
    database.ticket.findUnique.mockReset();
    database.ticket.findUniqueOrThrow.mockReset();
    events.publishTicketEvent.mockReset();
  });

  it("sets a server timestamp and publishes the committed resolved ticket", async () => {
    const resolvedAt = new Date("2026-08-25T08:05:00.000Z");
    database.ticket.updateMany.mockResolvedValue({ count: 1 });
    database.ticket.findUniqueOrThrow.mockResolvedValue(ticketRecord("resolved", resolvedAt));

    const ticket = await changeTicketStatus(7, "resolved");

    expect(database.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7, archivedAt: null },
        data: { status: "resolved", resolvedAt: expect.any(Date) },
      }),
    );
    expect(ticket.resolvedAt).toBe(resolvedAt.toISOString());
    expect(events.publishTicketEvent).toHaveBeenCalledWith({
      type: "updated",
      reason: "status_changed",
      ticket,
    });
  });

  it("clears resolvedAt when a ticket is reopened", async () => {
    database.ticket.updateMany.mockResolvedValue({ count: 1 });
    database.ticket.findUniqueOrThrow.mockResolvedValue(ticketRecord("open", null));

    const ticket = await changeTicketStatus(7, "open");

    expect(database.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "open", resolvedAt: null } }),
    );
    expect(ticket.resolvedAt).toBeNull();
  });

  it("does not publish an event when persistence fails", async () => {
    database.ticket.updateMany.mockRejectedValue(new Error("database unavailable"));

    await expect(changeTicketStatus(7, "resolved")).rejects.toThrow(
      "database unavailable",
    );
    expect(events.publishTicketEvent).not.toHaveBeenCalled();
  });
});
