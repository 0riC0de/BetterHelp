import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD_HASH_ROUNDS = 12;
const PASSWORD_PLACEHOLDER = "replace_with_a_strong_password";

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required to seed the first administrator`);
  }

  return value;
}

async function seedFirstAdministrator(): Promise<void> {
  const email = getRequiredEnvironmentVariable("ADMIN_EMAIL").toLowerCase();
  const name = getRequiredEnvironmentVariable("ADMIN_NAME");
  const password = getRequiredEnvironmentVariable("ADMIN_PASSWORD");

  if (password === PASSWORD_PLACEHOLDER || password.length < 12) {
    throw new Error("ADMIN_PASSWORD must contain at least 12 characters");
  }

  const existingAdministrator = await prisma.technician.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingAdministrator) {
    console.log(`Administrator ${email} already exists; no changes were made.`);
    return;
  }

  await prisma.technician.create({
    data: {
      email,
      name,
      passwordHash: await hash(password, PASSWORD_HASH_ROUNDS),
      role: "ADMIN",
    },
  });
  console.log(`Administrator ${email} created.`);
}

try {
  await seedFirstAdministrator();
} finally {
  await prisma.$disconnect();
}
