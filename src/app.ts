import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import morgan from "morgan";
import multer from "multer";

import { HttpError } from "./errors/http-error.js";
import {
  getTrustProxyHops,
  isProductionEnvironment,
} from "./config/environment.js";
import authRouter from "./routes/auth.routes.js";
import ticketRouter from "./routes/ticket.routes.js";
import technicianRouter from "./routes/technician.routes.js";
import inventoryRouter from "./routes/inventory.routes.js";
import queueRouter from "./routes/queue.routes.js";
import dataMaintenanceRouter from "./packages/data-maintenance/data-maintenance.routes.js";
import { isDashboardOriginAllowed } from "./security/origins.js";

interface HealthResponse {
  status: "ok";
  uptime: number;
}

interface ErrorResponse {
  error: string;
}

function getHealth(_req: Request, res: Response<HealthResponse>): void {
  res.json({ status: "ok", uptime: process.uptime() });
}

function handleNotFound(_req: Request, res: Response<ErrorResponse>): void {
  res.status(404).json({ error: "Not found" });
}

function handleError(
  error: unknown,
  _req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      error: error.code === "LIMIT_FILE_SIZE" ? "Media cannot exceed 16 MB" : "Invalid media upload",
    });
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error.status === 400 || error.status === 413)
  ) {
    res.status(error.status).json({
      error: error.status === 413 ? "Request body is too large" : "Invalid JSON body",
    });
    return;
  }

  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}

const app = express();

const trustProxyHops = getTrustProxyHops();
if (trustProxyHops) app.set("trust proxy", trustProxyHops);

app.use(
  cors({
    origin: (origin, callback) => callback(null, isDashboardOriginAllowed(origin)),
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(isProductionEnvironment() ? "combined" : "dev"));

app.get("/health", getHealth);
app.use("/api/auth", authRouter);
app.use("/api/technicians", technicianRouter);
app.use("/api/machines", inventoryRouter);
app.use("/api/queues", queueRouter);
app.use("/api/admin/database", dataMaintenanceRouter);
app.use("/api", ticketRouter);
app.use(handleNotFound);
app.use(handleError);

export default app;
