import { describe, expect, it } from "vitest";
import {
  canonicalRequest,
  CANONICAL_VERSION,
  hashBody,
  signingPath,
} from "@/lib/crypto/canonical";
import {
  base64ToBytes,
  bytesToBase64,
  generateKeypair,
  sign,
  verify,
} from "@/lib/crypto/ed25519";
import {
  createVault,
  decryptSecret,
  unlockVault,
  zeroize,
} from "@/lib/crypto/vault";
import {
  constantTimeBodyHashEqual,
  constantTimeEqual,
  constantTimeEqualString,
} from "@/lib/crypto/secure-compare";
import { isValidNonceUuid } from "@/lib/crypto/nonce-format";

describe("canonical signing", () => {
  it("sorts query params in signing path", () => {
    const a = signingPath("/api/wallet/address", "?rotate=1&foo=2");
    const b = signingPath("/api/wallet/address", "?foo=2&rotate=1");
    expect(a).toBe(b);
    expect(a).toContain("rotate=1");
  });

  it("differs path with and without rotate query", () => {
    expect(signingPath("/api/wallet/address", "")).not.toBe(
      signingPath("/api/wallet/address", "?rotate=1"),
    );
  });

  it("hashes body deterministically", () => {
    expect(hashBody('{"a":1}')).toBe(hashBody('{"a":1}'));
    expect(hashBody('{"a":1}')).not.toBe(hashBody('{"a":2}'));
  });

  it("builds v2 canonical message", () => {
    const msg = canonicalRequest({
      method: "post",
      path: "/api/wallet/send",
      timestamp: "1",
      nonce: "n",
      bodyHash: "h",
    });
    const text = new TextDecoder().decode(msg);
    expect(text.startsWith(CANONICAL_VERSION)).toBe(true);
    expect(text).toContain("POST");
  });
});

describe("ed25519", () => {
  it("signs and verifies", async () => {
    const { publicKey, privateKey } = await generateKeypair();
    const message = new TextEncoder().encode("ark-wallet-test");
    const sig = await sign(message, privateKey);
    expect(await verify(sig, message, publicKey)).toBe(true);
    expect(await verify(sig, message, base64ToBytes(bytesToBase64(publicKey)))).toBe(
      true,
    );
    const wrong = await generateKeypair();
    expect(await verify(sig, message, wrong.publicKey)).toBe(false);
  });
});

describe("vault v2", () => {
  it("encrypts and unlocks signing identity", async () => {
    const { vault, identity } = await createVault("my-secure-wallet-99");
    const unlocked = await unlockVault("my-secure-wallet-99", vault);
    expect(bytesToBase64(unlocked.publicKey)).toBe(
      bytesToBase64(identity.publicKey),
    );
    zeroize(unlocked.privateKey);
  });

  it("decryptSecret returns copy and rejects wrong passphrase", async () => {
    const { vault } = await createVault("my-secure-wallet-99");
    const secret = await decryptSecret("my-secure-wallet-99", vault);
    expect(secret.length).toBeGreaterThan(0);
    await expect(decryptSecret("wrong-passphrase-12", vault)).rejects.toThrow();
  });
});

describe("secure-compare", () => {
  it("compares equal-length buffers in constant time", () => {
    const a = new Uint8Array([1, 2, 3]);
    expect(constantTimeEqual(a, new Uint8Array([1, 2, 3]))).toBe(true);
    expect(constantTimeEqual(a, new Uint8Array([1, 2, 4]))).toBe(false);
    expect(constantTimeEqual(a, new Uint8Array([1, 2]))).toBe(false);
  });

  it("compares body hashes in constant time", () => {
    const h = hashBody('{"a":1}');
    expect(constantTimeBodyHashEqual(h, h)).toBe(true);
    expect(constantTimeBodyHashEqual(h, hashBody('{"a":2}'))).toBe(false);
    expect(constantTimeEqualString(h, `${h}x`)).toBe(false);
  });
});

describe("nonce-format", () => {
  it("accepts UUID v4 only", () => {
    expect(isValidNonceUuid("a1b2c3d4-e5f6-4789-a012-3456789abcde")).toBe(true);
    expect(isValidNonceUuid("not-a-uuid")).toBe(false);
    expect(isValidNonceUuid("")).toBe(false);
  });
});
