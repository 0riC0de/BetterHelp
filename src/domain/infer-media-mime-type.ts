import { isSupportedMediaMimeType, normalizeMediaMimeType } from "./media.js";

const MESSAGE_TYPE_MIME_TYPES: Readonly<Record<string, string>> = {
  audio: "audio/ogg",
  image: "image/jpeg",
  ptt: "audio/ogg",
  sticker: "image/webp",
  video: "video/mp4",
};

const FILE_EXTENSION_MIME_TYPES: Readonly<Record<string, string>> = {
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  pdf: "application/pdf",
  png: "image/png",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  wav: "audio/wav",
  webp: "image/webp",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function inferMediaMimeType(declaredMimeType: string, messageType: string, fileName?: string | null): string {
  const normalized = normalizeMediaMimeType(declaredMimeType);
  if (normalized !== "application/octet-stream" && isSupportedMediaMimeType(normalized)) return normalized;
  const messageTypeMime = MESSAGE_TYPE_MIME_TYPES[messageType.toLowerCase()];
  if (messageTypeMime) return messageTypeMime;
  const extension = fileName?.split(".").pop()?.toLowerCase();
  if (extension && FILE_EXTENSION_MIME_TYPES[extension]) return FILE_EXTENSION_MIME_TYPES[extension];
  return isSupportedMediaMimeType(normalized) ? normalized : "";
}
