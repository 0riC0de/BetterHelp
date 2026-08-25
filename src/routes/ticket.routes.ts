import { Router } from "express";

import {
  getTickets,
  getTicket,
  sendTicketMessage,
  updateTicketArchive,
  updateTicketStatus,
} from "../controllers/ticket.controller.js";
import { requireTechnician } from "../middleware/auth.middleware.js";
import { requireDashboardOrigin } from "../security/origins.js";

const ticketRouter = Router();

ticketRouter.use(requireTechnician);
ticketRouter.get("/tickets", getTickets);
ticketRouter.get("/tickets/:id", getTicket);
ticketRouter.post(
  "/tickets/:id/messages",
  requireDashboardOrigin,
  sendTicketMessage,
);
ticketRouter.patch(
  "/tickets/:id/status",
  requireDashboardOrigin,
  updateTicketStatus,
);
ticketRouter.patch(
  "/tickets/:id/archive",
  requireDashboardOrigin,
  updateTicketArchive,
);

export default ticketRouter;
