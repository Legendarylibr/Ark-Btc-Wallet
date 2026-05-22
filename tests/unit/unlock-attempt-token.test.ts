import { afterEach, describe, expect, it } from "vitest";
import {
  consumeUnlockAttemptToken,
  issueUnlockAttemptToken,
} from "@/lib/crypto/unlock-attempt-token";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

const BIND_A = "aaaaaaaaaaaaaaaa";
const BIND_B = "bbbbbbbbbbbbbbbb";

describe("unlock attempt token", () => {
  afterEach(() => cleanupTempWalletDataDirs());

  it("issues and consumes token once for same binding", () => {
    useTempWalletDataDir();
    const token = issueUnlockAttemptToken(BIND_A);
    expect(consumeUnlockAttemptToken(token, BIND_A)).toBe(true);
    expect(consumeUnlockAttemptToken(token, BIND_A)).toBe(false);
  });

  it("rejects wrong client binding", () => {
    useTempWalletDataDir();
    const token = issueUnlockAttemptToken(BIND_A);
    expect(consumeUnlockAttemptToken(token, BIND_B)).toBe(false);
  });

  it("rejects invalid token format", () => {
    useTempWalletDataDir();
    expect(consumeUnlockAttemptToken("not-a-uuid", BIND_A)).toBe(false);
  });
});
