import { Router } from "express";

import {
  getTickets,
  getTicket,
  sendTicketMessage,
  sendTicketMediaMessage,
  updateTicketArchive,
  updateTicketQueue,
  updateTicketStatus,
} from "../controllers/ticket.controller.js";
import { getProfilePicture } from "../packages/profile-pictures/profile-picture.controller.js";
import { getTicketMessageMedia, getStoredMedia } from "../controllers/ticket-media.controller.js";
import { requireTechnician } from "../middleware/auth.middleware.js";
import { requireDashboardOrigin } from "../security/origins.js";
import { uploadTicketMedia } from "../middleware/media-upload.middleware.js";

const ticketRouter = Router();

ticketRouter.use(requireTechnician);
ticketRouter.get("/tickets", getTickets);
ticketRouter.get("/tickets/:id", getTicket);
ticketRouter.get("/tickets/:id/messages/:messageId/media", getTicketMessageMedia);
ticketRouter.get("/media/:key", getStoredMedia);
ticketRouter.get("/profile-picture/:chatId", getProfilePicture);
ticketRouter.post(
  "/tickets/:id/messages",
  requireDashboardOrigin,
  sendTicketMessage,
);
ticketRouter.post(
  "/tickets/:id/media",
  requireDashboardOrigin,
  uploadTicketMedia,
  sendTicketMediaMessage,
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
ticketRouter.patch(
  "/tickets/:id/queue",
  requireDashboardOrigin,
  updateTicketQueue,
);

export default ticketRouter;
