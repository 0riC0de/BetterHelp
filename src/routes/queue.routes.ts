import { Router } from "express";

import { getQueues, patchQueue, postQueue, removeQueue } from "../controllers/queue.controller.js";
import { requireAdmin, requireTechnician } from "../middleware/auth.middleware.js";
import { requireDashboardOrigin } from "../security/origins.js";

const queueRouter = Router();

queueRouter.use(requireTechnician);
queueRouter.get("/", getQueues);
queueRouter.post("/", requireAdmin, requireDashboardOrigin, postQueue);
queueRouter.patch("/:id", requireAdmin, requireDashboardOrigin, patchQueue);
queueRouter.delete("/:id", requireAdmin, requireDashboardOrigin, removeQueue);

export default queueRouter;
