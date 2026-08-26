import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";

import { getMediaStorageDirectory } from "../config/environment.js";

const MEDIA_DIRECTORY = resolve(process.cwd(), getMediaStorageDirectory());
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff",
  "mp4", "mov", "webm", "mkv", "avi", "m4v",
  "mp3", "ogg", "wav", "m4a", "aac", "amr",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "vcf",
]);

let directoryEnsured = false;

function ensureMediaDirectory(): void {
  if (directoryEnsured) return;
  if (!existsSync(MEDIA_DIRECTORY)) {
    mkdirSync(MEDIA_DIRECTORY, { recursive: true });
  }
  directoryEnsured = true;
}

function sanitizeExtension(extension: string | null): string {
  const normalized = (extension ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return ALLOWED_EXTENSIONS.has(normalized) ? normalized : "bin";
}

export function createMediaStorageKey(seed: string, extension: string | null): string {
  const hash = createHash("sha1").update(seed).digest("hex");
  return `${hash}.${sanitizeExtension(extension)}`;
}

export interface StoredMedia {
  data: Buffer;
  mimeType: string | null;
}

export function saveMediaFile(
  key: string,
  data: Buffer,
  mimeType: string | null,
): { key: string; mimeType: string | null } {
  ensureMediaDirectory();
  if (key.includes(sep) || key.includes("/") || key.includes("\\")) {
    throw new Error("Invalid media storage key");
  }
  writeFileSync(join(MEDIA_DIRECTORY, key), data);
  return { key, mimeType };
}

export function readMediaFile(key: string): StoredMedia | null {
  if (key.includes(sep) || key.includes("/") || key.includes("\\")) {
    return null;
  }
  const path = join(MEDIA_DIRECTORY, key);
  if (!existsSync(path)) return null;
  try {
    return { data: readFileSync(path), mimeType: null };
  } catch {
    return null;
  }
}

export function mediaFileExists(key: string): boolean {
  if (key.includes(sep) || key.includes("/") || key.includes("\\")) return false;
  return existsSync(join(MEDIA_DIRECTORY, key));
}
