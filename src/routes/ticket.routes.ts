import { Router } from "express";

import { getTickets } from "../controllers/ticket.controller.js";

const ticketRouter = Router();

ticketRouter.get("/tickets", getTickets);

export default ticketRouter;
