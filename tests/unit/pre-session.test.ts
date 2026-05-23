import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { bytesToBase64, generateKeypair, sign } from "@/lib/crypto/ed25519";
import {
  canonicalRequest,
  CRYPTO_HEADERS,
  hashBody,
  signingPath,
} from "@/lib/crypto/canonical";
import { verifyPreSessionRequest } from "@/lib/crypto/pre-session";

async function signedPreSessionRequest(
  pathname: string,
  body: string,
  nonce: string,
) {
  const { publicKey, privateKey } = await generateKeypair();
  const publicKeyB64 = bytesToBase64(publicKey);
  const timestamp = String(Date.now());
  const bodyHash = hashBody(body);
  const path = signingPath(pathname, "");
  const message = canonicalRequest({
    method: "POST",
    path,
    timestamp,
    nonce,
    bodyHash,
  });
  const signature = await sign(message, privateKey);

  return new NextRequest(`http://127.0.0.1:3000${pathname}`, {
    method: "POST",
    headers: {
      [CRYPTO_HEADERS.timestamp]: timestamp,
      [CRYPTO_HEADERS.nonce]: nonce,
      [CRYPTO_HEADERS.signature]: bytesToBase64(signature),
      [CRYPTO_HEADERS.bodyHash]: bodyHash,
      [CRYPTO_HEADERS.publicKey]: publicKeyB64,
    },
    body,
  });
}

describe("verifyPreSessionRequest", () => {
  it("accepts valid pre-session signature with UUID nonce", async () => {
    const req = await signedPreSessionRequest(
      "/api/auth/challenge",
      "{}",
      crypto.randomUUID(),
    );
    const result = await verifyPreSessionRequest(req, "{}");
    expect(result).not.toBeInstanceOf(Response);
  });

  it("rejects body hash mismatch", async () => {
    const req = await signedPreSessionRequest(
      "/api/auth/challenge",
      "{}",
      crypto.randomUUID(),
    );
    req.headers.set(
      "x-wallet-body-hash",
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    );
    const res = await verifyPreSessionRequest(req, "{}");
    expect(res).toBeInstanceOf(Response);
    if (res instanceof Response) {
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toMatch(/Body hash/i);
    }
  });

  it("rejects non-UUID nonce", async () => {
    const req = await signedPreSessionRequest(
      "/api/auth/challenge",
      "{}",
      "bad-nonce",
    );
    const res = await verifyPreSessionRequest(req, "{}");
    expect(res).toBeInstanceOf(Response);
    if (res instanceof Response) expect(res.status).toBe(401);
  });
});
