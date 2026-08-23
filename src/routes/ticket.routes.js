import { Router } from "express";
import { getTickets } from "../controllers/ticket.controller.js";

const router = Router();

router.get("/tickets", getTickets);

export default router;
