import { describe, expect, it } from "vitest";

import {
  getMediaPlaceholder,
  isSupportedMediaMimeType,
  normalizeMediaMimeType,
} from "../src/domain/media.js";

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
});
