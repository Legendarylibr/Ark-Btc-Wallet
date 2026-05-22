import { afterEach, describe, expect, it } from "vitest";
import {
  consumeUnlockAttemptToken,
  issueUnlockAttemptToken,
} from "@/lib/crypto/unlock-attempt-token";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

describe("unlock attempt token", () => {
  afterEach(() => cleanupTempWalletDataDirs());

  it("issues and consumes token once", () => {
    useTempWalletDataDir();
    const token = issueUnlockAttemptToken();
    expect(consumeUnlockAttemptToken(token)).toBe(true);
    expect(consumeUnlockAttemptToken(token)).toBe(false);
  });

  it("rejects invalid token format", () => {
    useTempWalletDataDir();
    expect(consumeUnlockAttemptToken("not-a-uuid")).toBe(false);
  });
});
