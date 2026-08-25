import prisma from "../db/prisma.js";

/**
 * Download a WhatsApp profile picture by chatId and return it as a buffer.
 * Returns null when not available.
 */
export async function fetchProfilePicture(
  chatId: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const ticket = await prisma.ticket.findFirst({
    where: { chatId, archivedAt: null },
    select: { profilePictureUrl: true },
    orderBy: { updatedAt: "desc" },
  });

  const url = ticket?.profilePictureUrl;
  if (!url) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // WhatsApp CDN requires a valid user-agent and referer
        "User-Agent": "WhatsApp/2.23.24.79",
        Referer: "https://web.whatsapp.com/",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > 5 * 1024 * 1024) return null;

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    return { buffer, mimeType: contentType };
  } catch {
    return null;
  }
}
