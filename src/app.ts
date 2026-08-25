import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import morgan from "morgan";

import { isProductionEnvironment } from "./config/environment.js";
import ticketRouter from "./routes/ticket.routes.js";

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
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(isProductionEnvironment() ? "combined" : "dev"));

app.get("/health", getHealth);
app.use("/api", ticketRouter);
app.use(handleNotFound);
app.use(handleError);

export default app;
