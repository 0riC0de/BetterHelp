import type { Dirent } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";

const WHATSAPP_RUNTIME_DIRECTORIES = [
  ".wwebjs_auth",
  ".wwebjs_cache",
] as const;
const LOCK_FILE_PREFIX = "Singleton";

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

async function removeWhatsAppLocks(directoryPath: string): Promise<void> {
  let entries: Dirent[];

  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error: unknown) {
    if (isMissingPathError(error)) {
      return;
    }

    throw error;
  }

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directoryPath, entry.name);

      if (entry.name.startsWith(LOCK_FILE_PREFIX)) {
        await rm(entryPath, { force: true, recursive: true });
        return;
      }

      if (entry.isDirectory()) {
        await removeWhatsAppLocks(entryPath);
      }
    }),
  );
}

await Promise.all(
  WHATSAPP_RUNTIME_DIRECTORIES.map((directoryName) =>
    removeWhatsAppLocks(path.resolve(directoryName)),
  ),
);
