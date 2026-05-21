import { afterEach, describe, expect, it } from "vitest";
import {
  createSession,
  destroySession,
  ensureSessionClientBinding,
  getSession,
  isTimestampValid,
  touchSession,
} from "@/lib/crypto/session-store";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

const PK_B64 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

describe("session-store", () => {
  afterEach(() => cleanupTempWalletDataDirs());

  it("creates and retrieves session", () => {
    useTempWalletDataDir();
    const s = createSession(PK_B64, "fp-1", "bind-1");
    const loaded = getSession(s.id);
    expect(loaded?.barkFingerprint).toBe("fp-1");
    expect(loaded?.clientIpHash).toBe("bind-1");
  });

  it("expires session after TTL via lastSeenAt", () => {
    useTempWalletDataDir();
    const s = createSession(PK_B64, null, null);
    touchSession(s.id);
    expect(getSession(s.id)).not.toBeNull();
    destroySession(s.id);
    expect(getSession(s.id)).toBeNull();
  });

  it("migrates client binding on first use", () => {
    useTempWalletDataDir();
    const s = createSession(PK_B64, "fp-2", null);
    expect(ensureSessionClientBinding(s.id, "new-bind")).toBe("ok");
    expect(ensureSessionClientBinding(s.id, "new-bind")).toBe("ok");
    expect(ensureSessionClientBinding(s.id, "other-bind")).toBe("mismatch");
  });

  it("validates clock skew", () => {
    const now = Date.now();
    expect(isTimestampValid(now)).toBe(true);
    expect(isTimestampValid(now + 4 * 60 * 1000)).toBe(true);
    expect(isTimestampValid(now + 10 * 60 * 1000)).toBe(false);
  });
});
