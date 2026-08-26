import "dotenv/config";

const DEFAULT_HTTP_PORT = 3000;
const MINIMUM_PORT = 1;
const MAXIMUM_PORT = 65535;
const GEMINI_KEY_PLACEHOLDER = "your_api_key_here";
const AUTH_SECRET_PLACEHOLDER = "replace_with_at_least_32_random_characters";
const DEFAULT_ACCESS_TOKEN_MINUTES = 15;
const DEFAULT_REFRESH_TOKEN_DAYS = 7;
const MINIMUM_AUTH_SECRET_LENGTH = 32;

function readTrimmedEnvironmentVariable(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function readPositiveInteger(name: string, fallback: number): number {
  const configuredValue = readTrimmedEnvironmentVariable(name);
  const value = configuredValue ? Number(configuredValue) : fallback;

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

export function getHttpPort(): number {
  const configuredPort = readTrimmedEnvironmentVariable("PORT");
  const port = configuredPort ? Number(configuredPort) : DEFAULT_HTTP_PORT;

  if (!Number.isInteger(port) || port < MINIMUM_PORT || port > MAXIMUM_PORT) {
    throw new Error(`PORT must be an integer between 1 and ${MAXIMUM_PORT}`);
  }

  return port;
}

export function getGeminiApiKey(): string {
  const apiKey = readTrimmedEnvironmentVariable("GEMINI_API_KEY");

  if (!apiKey || apiKey === GEMINI_KEY_PLACEHOLDER) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return apiKey;
}

export function getPuppeteerExecutablePath(): string | undefined {
  return readTrimmedEnvironmentVariable("PUPPETEER_EXECUTABLE_PATH");
}

export function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === "development";
}

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

export function shouldSendWhatsAppAutoReplies(): boolean {
  return process.env.WHATSAPP_AUTO_REPLY === "true";
}

export function isWhatsAppEnabled(): boolean {
  return process.env.WHATSAPP_ENABLED !== "false";
}

export function getDashboardAllowedOrigins(): readonly string[] {
  const configuredOrigins = readTrimmedEnvironmentVariable(
    "DASHBOARD_ALLOWED_ORIGINS",
  );

  if (!configuredOrigins) {
    if (isProductionEnvironment()) {
      throw new Error("DASHBOARD_ALLOWED_ORIGINS is required in production");
    }

    return ["http://localhost:3001"];
  }

  return configuredOrigins.split(",").map((origin) => {
    const parsedOrigin = new URL(origin.trim());

    if (
      !(["http:", "https:"] as const).includes(
        parsedOrigin.protocol as "http:" | "https:",
      ) ||
      parsedOrigin.origin !== origin.trim()
    ) {
      throw new Error(`Invalid dashboard origin: ${origin}`);
    }

    return parsedOrigin.origin;
  });
}

export function getAuthJwtSecret(): Uint8Array {
  const secret = readTrimmedEnvironmentVariable("AUTH_JWT_SECRET");

  if (
    !secret ||
    secret.startsWith("replace_") ||
    secret === AUTH_SECRET_PLACEHOLDER ||
    secret.length < MINIMUM_AUTH_SECRET_LENGTH
  ) {
    throw new Error(
      `AUTH_JWT_SECRET must contain at least ${MINIMUM_AUTH_SECRET_LENGTH} characters`,
    );
  }

  return new TextEncoder().encode(secret);
}

export function getAccessTokenLifetimeSeconds(): number {
  return readPositiveInteger(
    "AUTH_ACCESS_TOKEN_MINUTES",
    DEFAULT_ACCESS_TOKEN_MINUTES,
  ) * 60;
}

export function getRefreshTokenLifetimeSeconds(): number {
  return readPositiveInteger(
    "AUTH_REFRESH_TOKEN_DAYS",
    DEFAULT_REFRESH_TOKEN_DAYS,
  ) * 24 * 60 * 60;
}

export function shouldUseSecureAuthCookies(): boolean {
  const configuredValue = readTrimmedEnvironmentVariable("AUTH_COOKIE_SECURE");
  if (!configuredValue) return isProductionEnvironment();
  if (configuredValue !== "true" && configuredValue !== "false") {
    throw new Error("AUTH_COOKIE_SECURE must be true or false");
  }
  return configuredValue === "true";
}

export function getMediaStorageDirectory(): string {
  const configuredDirectory = readTrimmedEnvironmentVariable("MEDIA_STORAGE_DIR");
  return configuredDirectory ?? "data/media";
}

export function getTrustProxyHops(): number | false {
  const configuredHops = readTrimmedEnvironmentVariable("TRUST_PROXY_HOPS");
  if (!configuredHops) return false;

  const hops = Number(configuredHops);
  if (!Number.isSafeInteger(hops) || hops <= 0) {
    throw new Error("TRUST_PROXY_HOPS must be a positive integer");
  }

  return hops;
}
