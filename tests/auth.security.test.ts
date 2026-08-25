import { beforeAll, describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "../src/security/password.js";
import {
  createAccessToken,
  hashRefreshToken,
  verifyAccessToken,
} from "../src/security/tokens.js";

describe("authentication security", () => {
  beforeAll(() => {
    process.env.AUTH_JWT_SECRET = "test-only-secret-with-at-least-32-characters";
  });

  it("signs and verifies short-lived technician access tokens", async () => {
    const token = await createAccessToken(12, "TECHNICIAN", 3);

    await expect(verifyAccessToken(token)).resolves.toMatchObject({
      technicianId: 12,
      role: "TECHNICIAN",
      tokenVersion: 3,
    });
    await expect(verifyAccessToken(`${token}tampered`)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("hashes passwords and refresh tokens without storing plaintext", async () => {
    const passwordHash = await hashPassword("a-strong-technician-password");

    expect(passwordHash).not.toContain("a-strong-technician-password");
    await expect(
      verifyPassword("a-strong-technician-password", passwordHash),
    ).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", passwordHash)).resolves.toBe(false);
    expect(hashRefreshToken("refresh-secret")).not.toBe("refresh-secret");
  });
});
