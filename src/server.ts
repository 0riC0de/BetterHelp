import { createServer } from "node:http";

import app from "./app.js";
import {
  getAuthJwtSecret,
  getHttpPort,
  isWhatsAppEnabled,
} from "./config/environment.js";
import prisma from "./db/prisma.js";
import { createRealtimeServer } from "./realtime/socket.server.js";
import {
  destroyWhatsApp,
  initializeWhatsApp,
} from "./services/whatsapp.service.js";
import { getErrorMessage } from "./utils/errors.js";

const port = getHttpPort();
const whatsAppEnabled = isWhatsAppEnabled();
getAuthJwtSecret();

const server = createServer(app);
const realtimeServer = createRealtimeServer(server);
server.listen(port, () => {
  console.log(`Helpdesk REST and WebSocket API listening on port ${port}`);
});

let shutdownPromise: Promise<void> | undefined;

async function closeResource(
  resourceName: string,
  close: () => Promise<void>,
): Promise<void> {
  try {
    await close();
  } catch (error: unknown) {
    process.exitCode = 1;
    console.error(`${resourceName} failed:`, getErrorMessage(error));
  }
}

async function performShutdown(signal: NodeJS.Signals): Promise<void> {
  console.log(`${signal} received. Shutting down.`);

  if (whatsAppEnabled) {
    await closeResource("WhatsApp shutdown", destroyWhatsApp);
  }
  await closeResource("Realtime and HTTP shutdown", realtimeServer.close);
  await closeResource("Database disconnect", () => prisma.$disconnect());
}

function shutdown(signal: NodeJS.Signals): Promise<void> {
  shutdownPromise ??= performShutdown(signal);
  return shutdownPromise;
}

if (whatsAppEnabled) {
  void initializeWhatsApp().catch((error: unknown) => {
    console.error(
      "Failed to initialize WhatsApp Web client:",
      getErrorMessage(error),
    );
  });
} else {
  console.log("WhatsApp initialization is disabled.");
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
