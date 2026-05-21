// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  arkInfoFromFeeScheduleJson,
  parseSdkArkFees,
  sdkEstimateArkSendFee,
} from "@/sdk/bark/fees";
import {
  challengeBytesToB64Url,
  consumeSdkChallenge,
  storeSdkChallenge,
} from "@/sdk/webauthn/challenges";
import {
  consumeSdkPendingOp,
  createSdkPendingOp,
} from "@/sdk/webauthn/pending-op";
import {
  deriveAesKeyFromPrf,
  encryptMnemonicWithPrfKey,
  decryptMnemonicWithPrfKey,
  verifyPasskeyVaultDecrypt,
  prfHkdfInfo,
} from "@/sdk/crypto/prf-vault";
import { getWalletBackendMode, isSdkMode } from "@/sdk/mode";
import {
  SDK_TRUST_BULLETS,
  SDK_TRUST_SUMMARY,
} from "@/sdk/trust-model";

const FEE_JSON = JSON.stringify({
  board: { min_fee_sat: 10, base_fee_sat: 5, ppm: 1000 },
  refresh: { min_fee_sat: 20, base_fee_sat: 0, ppm: 0 },
  arkoor: { min_fee_sat: 15, base_fee_sat: 3, ppm: 500 },
});

describe("sdk fees", () => {
  it("parses fee schedule JSON", () => {
    const info = arkInfoFromFeeScheduleJson(FEE_JSON);
    expect(info?.fees.board.min_fee_sat).toBe(10);
    expect(parseSdkArkFees({ fees: info?.fees })).not.toBeNull();
  });

  it("estimates send fee with buffer", () => {
    expect(sdkEstimateArkSendFee(100_000, FEE_JSON)).toBeGreaterThanOrEqual(23);
    expect(sdkEstimateArkSendFee(1000, null)).toBe(0);
  });
});

describe("sdk WebAuthn challenges", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("round-trips challenge as base64url", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const b64url = challengeBytesToB64Url(bytes);
    storeSdkChallenge("scope-1", bytes);
    expect(consumeSdkChallenge("scope-1", b64url)).toBe(true);
    expect(consumeSdkChallenge("scope-1", b64url)).toBe(false);
  });
});

describe("sdk pending-op", () => {
  it("consumes matching op once", () => {
    const id = createSdkPendingOp("wallet-1", "send", "hash-abc");
    expect(consumeSdkPendingOp(id, "wallet-1", "send", "hash-abc")).toBe(true);
    expect(consumeSdkPendingOp(id, "wallet-1", "send", "hash-abc")).toBe(false);
  });

  it("rejects wrong body hash", () => {
    const id = createSdkPendingOp("w", "refresh", "h1");
    expect(consumeSdkPendingOp(id, "w", "refresh", "h2")).toBe(false);
  });
});

describe("prf-vault", () => {
  it("encrypts and decrypts mnemonic with derived key", async () => {
    const prfOutput = crypto.getRandomValues(new Uint8Array(32)).buffer;
    const aesKey = await deriveAesKeyFromPrf(prfOutput, "localhost");
    const vault = await encryptMnemonicWithPrfKey(
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
      aesKey,
    );
    const mnemonic = await decryptMnemonicWithPrfKey(vault, aesKey);
    expect(mnemonic.split(" ").length).toBeGreaterThanOrEqual(12);
    await verifyPasskeyVaultDecrypt(vault, aesKey);
  });

  it("binds HKDF info to rpId", () => {
    const a = prfHkdfInfo("localhost");
    const b = prfHkdfInfo("evil.example");
    expect(Buffer.from(a).equals(b)).toBe(false);
  });
});

describe("sdk mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to barkd", () => {
    vi.stubEnv("NEXT_PUBLIC_WALLET_BACKEND", "");
    expect(getWalletBackendMode()).toBe("barkd");
    expect(isSdkMode()).toBe(false);
  });

  it("detects sdk mode", () => {
    vi.stubEnv("NEXT_PUBLIC_WALLET_BACKEND", "sdk");
    expect(getWalletBackendMode()).toBe("sdk");
    expect(isSdkMode()).toBe(true);
  });
});

describe("sdk trust model copy", () => {
  it("exports non-empty trust strings", () => {
    expect(SDK_TRUST_SUMMARY.length).toBeGreaterThan(10);
    expect(SDK_TRUST_BULLETS.length).toBeGreaterThan(2);
  });
});
