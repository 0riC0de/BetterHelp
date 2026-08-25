import { Router } from "express";

import {
  getTickets,
  updateTicketStatus,
} from "../controllers/ticket.controller.js";
import { requireTechnician } from "../middleware/auth.middleware.js";
import { requireDashboardOrigin } from "../security/origins.js";

const ticketRouter = Router();

ticketRouter.use(requireTechnician);
ticketRouter.get("/tickets", getTickets);
ticketRouter.patch(
  "/tickets/:id/status",
  requireDashboardOrigin,
  updateTicketStatus,
);

export default ticketRouter;
