import { Router, type NextFunction, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";

import {
  getCurrentTechnician,
  login,
  logout,
  refresh,
} from "../controllers/auth.controller.js";
import { requireTechnician } from "../middleware/auth.middleware.js";
import { requireDashboardOrigin } from "../security/origins.js";

const authRouter = Router();
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const refreshRateLimit = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

function forwardRejection(
  operation: Promise<void>,
  next: NextFunction,
): void {
  void operation.catch(next);
}

authRouter.post(
  "/login",
  requireDashboardOrigin,
  loginRateLimit,
  (req: Request, res: Response, next: NextFunction) => {
    forwardRejection(login(req, res), next);
  },
);
authRouter.post(
  "/refresh",
  requireDashboardOrigin,
  refreshRateLimit,
  (req: Request, res: Response, next: NextFunction) => {
    forwardRejection(refresh(req, res), next);
  },
);
authRouter.post(
  "/logout",
  requireDashboardOrigin,
  (req: Request, res: Response, next: NextFunction) => {
    forwardRejection(logout(req, res), next);
  },
);
authRouter.get("/me", requireTechnician, getCurrentTechnician);

export default authRouter;
