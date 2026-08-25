import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authService = vi.hoisted(() => ({
  authenticateTechnician: vi.fn(),
  loginTechnician: vi.fn(),
  logoutTechnician: vi.fn(),
  refreshTechnicianSession: vi.fn(),
}));
const ticketService = vi.hoisted(() => ({
  listTickets: vi.fn(),
  changeTicketStatus: vi.fn(),
}));

vi.mock("../src/services/auth.service.js", () => authService);
vi.mock("../src/services/ticket.service.js", () => ticketService);

import app from "../src/app.js";

const ticket = {
  id: 7,
  userPhone: "972501234567",
  userName: "Test Reporter",
  pcNumber: 4,
  rawMessage: "Printer is offline",
  summary: "The workstation cannot reach the printer.",
  status: "resolved" as const,
  aiDecision: "CAN_AUTO_FIX" as const,
  aiConfidence: 0.95,
  suggestedScript: "restart_spooler",
  scriptExecuted: null,
  executionOutput: null,
  createdAt: "2026-08-25T08:00:00.000Z",
  resolvedAt: "2026-08-25T08:05:00.000Z",
};

describe("helpdesk HTTP API", () => {
  beforeEach(() => {
    authService.authenticateTechnician.mockResolvedValue({
      id: 1,
      email: "admin@example.com",
      name: "Administrator",
      role: "ADMIN",
      accessTokenExpiresAt: Math.floor(Date.now() / 1_000) + 900,
    });
    ticketService.listTickets.mockResolvedValue([ticket]);
    ticketService.changeTicketStatus.mockResolvedValue(ticket);
    authService.loginTechnician.mockResolvedValue({
      accessToken: "signed-access-token",
      refreshToken: "rotating-refresh-token",
      technician: {
        id: 1,
        email: "admin@example.com",
        name: "Administrator",
        role: "ADMIN",
      },
    });
  });

  it("reports health and uptime without authentication", async () => {
    const response = await request(app).get("/health").expect(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.uptime).toEqual(expect.any(Number));
  });

  it("passes status and classification filters to the ticket service", async () => {
    const response = await request(app)
      .get("/api/tickets?status=resolved&classification=CAN_AUTO_FIX")
      .set("Cookie", "helpdesk_access=test-token")
      .expect(200);

    expect(ticketService.listTickets).toHaveBeenCalledWith({
      status: "resolved",
      aiDecision: "CAN_AUTO_FIX",
    });
    expect(response.body).toEqual({ tickets: [ticket] });
  });

  it("creates HttpOnly strict cookies when a technician signs in", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", "http://localhost:3001")
      .send({ email: "admin@example.com", password: "correct-password" })
      .expect(200);

    const cookies = response.headers["set-cookie"] as unknown as string[];
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^helpdesk_access=.*HttpOnly.*SameSite=Strict/),
        expect.stringMatching(/^helpdesk_refresh=.*Path=\/api\/auth.*HttpOnly.*SameSite=Strict/),
      ]),
    );
  });

  it("updates a ticket status through the protected PATCH route", async () => {
    const response = await request(app)
      .patch("/api/tickets/7/status")
      .set("Cookie", "helpdesk_access=test-token")
      .set("Origin", "http://localhost:3001")
      .send({ status: "resolved" })
      .expect(200);

    expect(ticketService.changeTicketStatus).toHaveBeenCalledWith(7, "resolved");
    expect(response.body).toEqual(ticket);
  });

  it("rejects invalid statuses before mutation", async () => {
    await request(app)
      .patch("/api/tickets/7/status")
      .set("Cookie", "helpdesk_access=test-token")
      .set("Origin", "http://localhost:3001")
      .send({ status: "closed" })
      .expect(400);

    expect(ticketService.changeTicketStatus).not.toHaveBeenCalled();
  });

  it("requires authentication and an allowed browser origin", async () => {
    await request(app).get("/api/tickets").expect(401);
    await request(app)
      .patch("/api/tickets/7/status")
      .set("Cookie", "helpdesk_access=test-token")
      .set("Origin", "https://untrusted.example")
      .send({ status: "resolved" })
      .expect(403);
  });
});
