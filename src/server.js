import "dotenv/config";

import app from "./app.js";
import prisma from "./db/prisma.js";
import {
  destroyWhatsApp,
  initializeWhatsApp,
} from "./services/whatsapp.service.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const server = app.listen(port, () => {
  console.log(`Helpdesk REST API listening on port ${port}`);
});

initializeWhatsApp().catch((error) => {
  console.error("Failed to initialize WhatsApp Web client", error);
});

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down.`);
  server.close(async () => {
    await destroyWhatsApp();
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
