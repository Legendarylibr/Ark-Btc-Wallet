import { afterEach, describe, expect, it } from "vitest";
import {
  claimNonce,
  REGISTER_NONCE_SCOPE,
  resetNonceMemoryCacheForTests,
} from "@/lib/crypto/nonce-store";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

describe("nonce-store", () => {
  afterEach(() => {
    cleanupTempWalletDataDirs();
    resetNonceMemoryCacheForTests();
  });

  it("claims nonce once per scope", () => {
    useTempWalletDataDir();
    const scope = "session-a";
    const nonce = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
    expect(claimNonce(scope, nonce)).toBe(true);
    expect(claimNonce(scope, nonce)).toBe(false);
  });

  it("persists claimed nonces across memory cache reset", () => {
    useTempWalletDataDir();
    const scope = "session-b";
    const nonce = "b2c3d4e5-f6a7-4890-b123-456789abcdef";
    expect(claimNonce(scope, nonce)).toBe(true);
    resetNonceMemoryCacheForTests();
    expect(claimNonce(scope, nonce)).toBe(false);
  });

  it("isolates register scope", () => {
    useTempWalletDataDir();
    const n = "c3d4e5f6-a7b8-4901-c234-567890abcdef";
    expect(claimNonce(REGISTER_NONCE_SCOPE, n)).toBe(true);
    expect(claimNonce("other", n)).toBe(true);
    expect(claimNonce(REGISTER_NONCE_SCOPE, n)).toBe(false);
  });
});
