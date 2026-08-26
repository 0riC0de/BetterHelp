import { describe, expect, it } from "vitest";

import {
  getMediaPlaceholder,
  isSupportedMediaMimeType,
  normalizeMediaMimeType,
} from "../src/domain/media.js";
import { createMediaFileName, inferMediaMimeType } from "../src/domain/infer-media-mime-type.js";

describe("media validation", () => {
  it("normalizes WhatsApp codec parameters", () => {
    expect(normalizeMediaMimeType("audio/ogg; codecs=opus")).toBe("audio/ogg");
    expect(isSupportedMediaMimeType("audio/ogg; codecs=opus")).toBe(true);
  });

  it("supports common media and rejects active SVG content", () => {
    expect(isSupportedMediaMimeType("image/webp")).toBe(true);
    expect(isSupportedMediaMimeType("video/mp4")).toBe(true);
    expect(isSupportedMediaMimeType("application/pdf")).toBe(true);
    expect(isSupportedMediaMimeType("image/svg+xml")).toBe(false);
    expect(isSupportedMediaMimeType("text/html")).toBe(false);
  });

  it("creates media-specific placeholder bodies", () => {
    expect(getMediaPlaceholder("image/jpeg")).toBe("[Image]");
    expect(getMediaPlaceholder("audio/ogg")).toBe("[Audio]");
    expect(getMediaPlaceholder("application/pdf")).toBe("[Document]");
  });

  it("infers useful WhatsApp media types from message type and file extension", () => {
    expect(inferMediaMimeType(undefined, "image", null)).toBe("image/jpeg");
    expect(inferMediaMimeType("application/octet-stream", "image", null)).toBe("image/jpeg");
    expect(inferMediaMimeType("application/octet-stream", "ptt", null)).toBe("audio/ogg");
    expect(inferMediaMimeType("application/octet-stream", "document", "report.pdf")).toBe("application/pdf");
  });

  it("creates stable fallback names for downloaded WhatsApp media", () => {
    expect(createMediaFileName("abc123", "image/jpeg", null)).toBe("whatsapp-abc123.jpg");
    expect(createMediaFileName("abc123", "audio/ogg", "voice.ogg")).toBe("voice.ogg");
  });
});
