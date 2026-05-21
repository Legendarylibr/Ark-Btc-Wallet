import { describe, expect, it } from "vitest";
import {
  bytesToBase64,
  generateKeypair,
  sign,
} from "@/lib/crypto/ed25519";
import {
  consumeChallenge,
  issueChallenge,
  webauthnSetupMessage,
} from "@/lib/crypto/challenges";
import {
  assertSetupAllowedForFingerprint,
  verifyWebauthnSetupProof,
} from "@/lib/webauthn/setup-proof";

describe("verifyWebauthnSetupProof", () => {
  it("accepts valid setup proof", async () => {
    const { publicKey, privateKey } = await generateKeypair();
    const publicKeyB64 = bytesToBase64(publicKey);
    const { challenge } = issueChallenge();
    const message = webauthnSetupMessage(challenge);
    const signature = bytesToBase64(await sign(message, privateKey));
    const nonce = crypto.randomUUID();

    const result = await verifyWebauthnSetupProof({
      publicKey: publicKeyB64,
      challenge,
      signature,
      timestamp: Date.now(),
      nonce,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.publicKeyB64).toBe(publicKeyB64);
    expect(consumeChallenge(challenge)).toBe(false);
  });

  it("rejects replayed nonce", async () => {
    const { publicKey, privateKey } = await generateKeypair();
    const publicKeyB64 = bytesToBase64(publicKey);
    const { challenge } = issueChallenge();
    const message = webauthnSetupMessage(challenge);
    const signature = bytesToBase64(await sign(message, privateKey));
    const nonce = crypto.randomUUID();

    const body = {
      publicKey: publicKeyB64,
      challenge,
      signature,
      timestamp: Date.now(),
      nonce,
    };

    expect((await verifyWebauthnSetupProof(body)).ok).toBe(true);
    expect((await verifyWebauthnSetupProof(body)).ok).toBe(false);
  });

  it("rejects invalid nonce format", async () => {
    const { publicKey, privateKey } = await generateKeypair();
    const { challenge } = issueChallenge();
    const signature = bytesToBase64(
      await sign(webauthnSetupMessage(challenge), privateKey),
    );

    const result = await verifyWebauthnSetupProof({
      publicKey: bytesToBase64(publicKey),
      challenge,
      signature,
      timestamp: Date.now(),
      nonce: "not-uuid",
    });
    expect(result.ok).toBe(false);
  });
});

describe("assertSetupAllowedForFingerprint", () => {
  it("allows when no pin and no credential", () => {
    const fp = `fp-setup-${Date.now()}`;
    expect(
      assertSetupAllowedForFingerprint(fp, "cG9rAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
        .ok,
    ).toBe(true);
  });
});
