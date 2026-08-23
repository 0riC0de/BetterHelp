import cors from "cors";
import express from "express";
import morgan from "morgan";

import ticketRoutes from "./routes/ticket.routes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api", ticketRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
