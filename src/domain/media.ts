export const MAXIMUM_MEDIA_BYTES = 16 * 1024 * 1024;

const SUPPORTED_APPLICATION_TYPES = new Set([
  "application/octet-stream",
  "application/pdf",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/plain",
]);

export function normalizeMediaMimeType(value: string): string {
  return value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

export function isSupportedMediaMimeType(value: string): boolean {
  const mimeType = normalizeMediaMimeType(value);
  return (
    (mimeType.startsWith("image/") && mimeType !== "image/svg+xml") ||
    mimeType.startsWith("audio/") ||
    mimeType.startsWith("video/") ||
    SUPPORTED_APPLICATION_TYPES.has(mimeType)
  );
}

export function getMediaPlaceholder(mimeType: string | null): string {
  if (mimeType?.startsWith("image/")) return "[Image]";
  if (mimeType?.startsWith("audio/")) return "[Audio]";
  if (mimeType?.startsWith("video/")) return "[Video]";
  if (mimeType) return "[Document]";
  return "[Unsupported media]";
}
