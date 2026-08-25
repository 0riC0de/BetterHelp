import { Router } from "express";

import {
  getTechnicians,
  postTechnician,
  patchTechnicianPassword,
  removeTechnician,
} from "../controllers/technician.controller.js";
import { requireAdmin, requireTechnician } from "../middleware/auth.middleware.js";
import { requireDashboardOrigin } from "../security/origins.js";

const technicianRouter = Router();
technicianRouter.use(requireTechnician, requireAdmin);
technicianRouter.get("/", getTechnicians);
technicianRouter.post("/", requireDashboardOrigin, postTechnician);
technicianRouter.delete("/:id", requireDashboardOrigin, removeTechnician);
technicianRouter.patch(
  "/:id/password",
  requireDashboardOrigin,
  patchTechnicianPassword,
);

export default technicianRouter;
