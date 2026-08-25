import type { Server } from "node:http";

import app from "./app.js";
import { getHttpPort } from "./config/environment.js";
import prisma from "./db/prisma.js";
import {
  destroyWhatsApp,
  initializeWhatsApp,
} from "./services/whatsapp.service.js";
import { getErrorMessage } from "./utils/errors.js";

const port = getHttpPort();
const server = app.listen(port, () => {
  console.log(`Helpdesk REST API listening on port ${port}`);
});

let shutdownPromise: Promise<void> | undefined;

function closeHttpServer(httpServer: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    httpServer.close((error?: Error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

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

  await Promise.all([
    closeResource("WhatsApp shutdown", destroyWhatsApp),
    closeResource("HTTP server shutdown", () => closeHttpServer(server)),
  ]);
  await closeResource("Database disconnect", () => prisma.$disconnect());
}

function shutdown(signal: NodeJS.Signals): Promise<void> {
  shutdownPromise ??= performShutdown(signal);
  return shutdownPromise;
}

void initializeWhatsApp().catch((error: unknown) => {
  console.error(
    "Failed to initialize WhatsApp Web client:",
    getErrorMessage(error),
  );
});

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
