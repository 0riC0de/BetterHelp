import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import {
  getMachines,
  patchMachine,
  postMachine,
  removeMachine,
  wakeMachineController,
} from "../controllers/inventory.controller.js";
import { requireAdmin, requireTechnician } from "../middleware/auth.middleware.js";
import { requireDashboardOrigin } from "../security/origins.js";

const inventoryRouter = Router();
const wakeRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

inventoryRouter.use(requireTechnician);
inventoryRouter.get("/", getMachines);
inventoryRouter.post("/", requireAdmin, requireDashboardOrigin, postMachine);
inventoryRouter.patch("/:id", requireAdmin, requireDashboardOrigin, patchMachine);
inventoryRouter.delete("/:id", requireAdmin, requireDashboardOrigin, removeMachine);
inventoryRouter.post(
  "/:id/wake",
  requireDashboardOrigin,
  wakeRateLimit,
  wakeMachineController,
);

export default inventoryRouter;
