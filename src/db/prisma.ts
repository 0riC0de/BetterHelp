import { PrismaClient } from "@prisma/client";

import { isDevelopmentEnvironment } from "../config/environment.js";

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalWithPrisma = globalThis as GlobalWithPrisma;

export const prisma =
  globalWithPrisma.prisma ??
  new PrismaClient({
    log: isDevelopmentEnvironment()
      ? ["query", "error", "warn"]
      : ["error"],
  });

if (isDevelopmentEnvironment()) {
  globalWithPrisma.prisma = prisma;
}

export default prisma;
