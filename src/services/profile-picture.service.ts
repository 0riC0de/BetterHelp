import prisma from "../db/prisma.js";
import { refreshWhatsAppProfilePictureUrl } from "./whatsapp.service.js";

const MAXIMUM_PROFILE_PICTURE_BYTES = 5 * 1024 * 1024;

function isAllowedProfilePictureUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      ["whatsapp.net", "fbcdn.net"].some((domain) =>
        url.hostname === domain || url.hostname.endsWith(`.${domain}`),
      );
  } catch {
    return false;
  }
}

async function downloadProfilePicture(url: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!isAllowedProfilePictureUrl(url)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "error",
      headers: { "User-Agent": "WhatsApp/2.23.24.79", Referer: "https://web.whatsapp.com/" },
    });
    const contentLength = Number(response.headers.get("content-length"));
    const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!response.ok || !mimeType.startsWith("image/") || contentLength > MAXIMUM_PROFILE_PICTURE_BYTES) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.byteLength || buffer.byteLength > MAXIMUM_PROFILE_PICTURE_BYTES) return null;
    return { buffer, mimeType };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Download a WhatsApp profile picture by chatId and return it as a buffer.
 * Returns null when not available.
 */
export async function fetchProfilePicture(
  chatId: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const ticket = await prisma.ticket.findFirst({
    where: { chatId },
    select: { profilePictureUrl: true },
    orderBy: { updatedAt: "desc" },
  });

  if (ticket?.profilePictureUrl) {
    const cached = await downloadProfilePicture(ticket.profilePictureUrl);
    if (cached) return cached;
  }

  const refreshedUrl = await refreshWhatsAppProfilePictureUrl(chatId);
  if (!refreshedUrl) return null;
  await prisma.ticket.updateMany({ where: { chatId }, data: { profilePictureUrl: refreshedUrl } });
  return downloadProfilePicture(refreshedUrl);
}
