import { describe, expect, it } from "vitest";
import { isValidNonceUuid } from "@/lib/crypto/nonce-format";
import { CRYPTO_HEADERS } from "@/lib/crypto/canonical";

describe("signed fetch contract", () => {
  it("requires UUID v4 nonces on wallet API headers", () => {
    const nonce = crypto.randomUUID();
    expect(isValidNonceUuid(nonce)).toBe(true);
    expect(isValidNonceUuid("not-a-uuid")).toBe(false);
    const legacyBase64 = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
    expect(isValidNonceUuid(legacyBase64)).toBe(false);
  });

  it("documents crypto header names used by signedFetch", () => {
    expect(CRYPTO_HEADERS.nonce).toBe("x-wallet-nonce");
    expect(CRYPTO_HEADERS.signature).toBe("x-wallet-signature");
  });
});
