import { afterEach, describe, expect, it } from "vitest";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";
import {
  recordUnlockFailure,
  unlockAttemptAllowed,
} from "@/lib/crypto/unlock-rate-limit";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

describe("rate-limit", () => {
  it("allows up to limit within window", () => {
    const key = `test-${Date.now()}`;
    expect(rateLimit(key, 3, 60_000)).toBe(true);
    expect(rateLimit(key, 3, 60_000)).toBe(true);
    expect(rateLimit(key, 3, 60_000)).toBe(true);
    expect(rateLimit(key, 3, 60_000)).toBe(false);
  });

  it("clientIp respects TRUST_PROXY", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "9.9.9.9" },
    });
    delete process.env.TRUST_PROXY;
    expect(clientIp(req)).toBe("local");
    process.env.TRUST_PROXY = "true";
    expect(clientIp(req)).toBe("9.9.9.9");
    delete process.env.TRUST_PROXY;
  });
});

describe("unlock-rate-limit", () => {
  afterEach(() => cleanupTempWalletDataDirs());

  it("blocks after max failures", () => {
    useTempWalletDataDir();
    const ip = `unlock-ip-${Date.now()}`;
    for (let i = 0; i < 8; i++) recordUnlockFailure(ip);
    expect(unlockAttemptAllowed(ip)).toBe(false);
  });
});
