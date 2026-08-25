import { describe, expect, it } from "vitest";

import type { Ticket } from "@/types/ticket";

import { filterTickets, getTicketMetrics } from "./tickets";

const ticket: Ticket = {
  id: 1,
  chatId: "972501234567@c.us",
  userPhone: "972501234567",
  userName: "Dana Cohen",
  pcNumber: 4,
  rawMessage: "The printer is not responding",
  summary: "Printer spooler is unavailable",
  status: "open",
  aiDecision: "CAN_AUTO_FIX",
  aiConfidence: 0.95,
  suggestedScript: "restart_spooler",
  scriptExecuted: null,
  executionOutput: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  resolvedAt: null,
  profilePictureUrl: null,
  machineId: null,
  archivedAt: null,
};

describe("ticket dashboard selectors", () => {
  it("searches reporter, normalized phone, PC, and issue text", () => {
    for (const search of ["dana", "50123", "4", "spooler"]) {
      expect(
        filterTickets(
          [ticket],
          { status: "all", classification: "all", search },
          search,
        ),
      ).toHaveLength(1);
    }
  });

  it("combines status and classification filters", () => {
    expect(
      filterTickets(
        [ticket],
        { status: "resolved", classification: "CAN_AUTO_FIX", search: "" },
        "",
      ),
    ).toHaveLength(0);
  });

  it("calculates active classifications and today's resolutions", () => {
    const resolvedTicket: Ticket = {
      ...ticket,
      id: 2,
      status: "resolved",
      resolvedAt: new Date().toISOString(),
    };
    expect(getTicketMetrics([ticket, resolvedTicket])).toEqual({
      active: 1,
      open: 1,
      inProgress: 0,
      autoFixable: 1,
      remoteTakeover: 0,
      resolvedToday: 1,
    });
  });
});
