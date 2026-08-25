import { Router } from "express";

import {
  getTechnicians,
  postTechnician,
  removeTechnician,
} from "../controllers/technician.controller.js";
import { requireAdmin, requireTechnician } from "../middleware/auth.middleware.js";
import { requireDashboardOrigin } from "../security/origins.js";

const technicianRouter = Router();
technicianRouter.use(requireTechnician, requireAdmin);
technicianRouter.get("/", getTechnicians);
technicianRouter.post("/", requireDashboardOrigin, postTechnician);
technicianRouter.delete("/:id", requireDashboardOrigin, removeTechnician);

export default technicianRouter;
