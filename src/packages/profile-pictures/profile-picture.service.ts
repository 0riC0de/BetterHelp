import prisma from "../../db/prisma.js";
import type { ProfilePicture } from "./ProfilePicture.js";
import type { ProfilePictureUrlProvider } from "./ProfilePictureUrlProvider.js";

const MAXIMUM_PROFILE_PICTURE_BYTES = 5 * 1024 * 1024;
const PROFILE_CACHE_TTL_MS = 60 * 60 * 1_000;
const NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1_000;
const profileCache = new Map<string, { expiresAt: number; picture: ProfilePicture | null }>();
let refreshProfilePictureUrl: ProfilePictureUrlProvider = async () => null;

export function configureProfilePictureUrlProvider(provider: ProfilePictureUrlProvider): void {
  refreshProfilePictureUrl = provider;
}

export function clearProfilePictureCache(): void {
  profileCache.clear();
}

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

function getRefreshCandidateChatIds(chatId: string, userPhone: string | null): string[] {
  const candidates = [chatId];
  const phoneDigits = userPhone?.replace(/\D/g, "") ?? "";
  if (phoneDigits) candidates.push(`${phoneDigits}@c.us`);
  return [...new Set(candidates)];
}

export async function downloadProfilePictureFromUrl(value: string): Promise<ProfilePicture | null> {
  if (!isAllowedProfilePictureUrl(value)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    let url = value;
    let response: globalThis.Response | undefined;
    for (let redirects = 0; redirects <= 2; redirects += 1) {
      response = await fetch(url, {
        signal: controller.signal,
        redirect: "manual",
        headers: { "User-Agent": "WhatsApp/2.23.24.79", Referer: "https://web.whatsapp.com/" },
      });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get("location");
      if (!location) return null;
      url = new URL(location, url).toString();
      if (!isAllowedProfilePictureUrl(url)) return null;
    }
    if (!response) return null;
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
  const cached = profileCache.get(chatId);
  if (cached && cached.expiresAt > Date.now()) return cached.picture;

  const ticket = await prisma.ticket.findFirst({
    where: { chatId },
    select: { profilePictureUrl: true, profilePictureMimeType: true, profilePictureData: true, userPhone: true },
    orderBy: { updatedAt: "desc" },
  });

  if (ticket?.profilePictureData && ticket.profilePictureMimeType) {
    const picture = {
      buffer: Buffer.from(ticket.profilePictureData, "base64"),
      mimeType: ticket.profilePictureMimeType,
    };
    profileCache.set(chatId, { expiresAt: Date.now() + PROFILE_CACHE_TTL_MS, picture });
    return picture;
  }

  if (ticket?.profilePictureUrl) {
    const picture = await downloadProfilePictureFromUrl(ticket.profilePictureUrl);
    if (picture) {
      await prisma.ticket.updateMany({
        where: { chatId },
        data: {
          profilePictureMimeType: picture.mimeType,
          profilePictureData: picture.buffer.toString("base64"),
        },
      });
      profileCache.set(chatId, { expiresAt: Date.now() + PROFILE_CACHE_TTL_MS, picture });
      return picture;
    }
  }

  let refreshedUrl: string | null = null;
  for (const candidateChatId of getRefreshCandidateChatIds(chatId, ticket?.userPhone ?? null)) {
    refreshedUrl = await refreshProfilePictureUrl(candidateChatId);
    if (refreshedUrl) break;
  }
  if (!refreshedUrl) {
    profileCache.set(chatId, { expiresAt: Date.now() + NEGATIVE_CACHE_TTL_MS, picture: null });
    return null;
  }
  await prisma.ticket.updateMany({ where: { chatId }, data: { profilePictureUrl: refreshedUrl } });
  const picture = await downloadProfilePictureFromUrl(refreshedUrl);
  if (picture) {
    await prisma.ticket.updateMany({
      where: { chatId },
      data: {
        profilePictureMimeType: picture.mimeType,
        profilePictureData: picture.buffer.toString("base64"),
      },
    });
  }
  profileCache.set(chatId, {
    expiresAt: Date.now() + (picture ? PROFILE_CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS),
    picture,
  });
  return picture;
}
