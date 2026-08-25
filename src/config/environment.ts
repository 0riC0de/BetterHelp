import "dotenv/config";

const DEFAULT_HTTP_PORT = 3000;
const MINIMUM_PORT = 1;
const MAXIMUM_PORT = 65535;
const GEMINI_KEY_PLACEHOLDER = "your_api_key_here";

function readTrimmedEnvironmentVariable(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
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
