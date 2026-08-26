import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { requireAdmin } from "../../middleware/auth.middleware.js";
import { requireDashboardOrigin } from "../../security/origins.js";
import { clearDatabaseData, readDatabaseSummary } from "./data-maintenance.controller.js";

const dataMaintenanceRouter = Router();
const clearLimit = rateLimit({ windowMs: 60 * 60 * 1_000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false });

dataMaintenanceRouter.use(requireAdmin);
dataMaintenanceRouter.get("/", readDatabaseSummary);
dataMaintenanceRouter.post("/clear", requireDashboardOrigin, clearLimit, clearDatabaseData);

export default dataMaintenanceRouter;
