import { describe, expect, it, afterEach } from "@jest/globals";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("isDevEmail", () => {
  it("returns true for the default dev email regardless of case/whitespace", async () => {
    const { isDevEmail } = await import("../dev-access");
    expect(isDevEmail("willis.dosanjosrosario@gmail.com")).toBe(true);
    expect(isDevEmail("  willis.dosanjosrosario@gmail.com ")).toBe(true);
  });

  it("returns false for other emails", async () => {
    const { isDevEmail } = await import("../dev-access");
    expect(isDevEmail("user@example.com")).toBe(false);
    expect(isDevEmail(undefined)).toBe(false);
    expect(isDevEmail(null)).toBe(false);
  });

  it("extends the allowlist via DEV_EMAILS env", async () => {
    process.env.DEV_EMAILS = "extra@example.com";
    jest.resetModules();
    const { isDevEmail } = await import("../dev-access");
    expect(isDevEmail("extra@example.com")).toBe(true);
    expect(isDevEmail("willis.dosanjosrosario@gmail.com")).toBe(true);
  });

  it("resolves the dev tier to ultra", async () => {
    const { resolveDevSubscriptionTier } = await import("../dev-access");
    expect(resolveDevSubscriptionTier("willis.dosanjosrosario@gmail.com")).toBe(
      "ultra",
    );
    expect(resolveDevSubscriptionTier("user@example.com")).toBe("free");
  });
});

describe("isUnlimitedAccessEnabled", () => {
  it("is disabled when no env flags are set", async () => {
    delete process.env.UNLIMITED_ACCESS;
    delete process.env.NEXT_PUBLIC_UNLIMITED_ACCESS;
    jest.resetModules();
    const { isUnlimitedAccessEnabled } = await import("../../env-flags");
    expect(isUnlimitedAccessEnabled()).toBe(false);
  });

  it("is enabled when UNLIMITED_ACCESS=true", async () => {
    process.env.UNLIMITED_ACCESS = "true";
    delete process.env.NEXT_PUBLIC_UNLIMITED_ACCESS;
    jest.resetModules();
    const { isUnlimitedAccessEnabled } = await import("../../env-flags");
    expect(isUnlimitedAccessEnabled()).toBe(true);
  });

  it("is enabled when NEXT_PUBLIC_UNLIMITED_ACCESS=true", async () => {
    delete process.env.UNLIMITED_ACCESS;
    process.env.NEXT_PUBLIC_UNLIMITED_ACCESS = "true";
    jest.resetModules();
    const { isUnlimitedAccessEnabled } = await import("../../env-flags");
    expect(isUnlimitedAccessEnabled()).toBe(true);
  });
});
