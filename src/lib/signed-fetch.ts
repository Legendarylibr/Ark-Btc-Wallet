"use client";

import type { UnlockedIdentity } from "@/lib/crypto/vault";
import {
  canonicalRequest,
  CRYPTO_HEADERS,
  hashBody,
  signingPath,
} from "@/lib/crypto/canonical";
import { arkClientHeaders } from "@/lib/ark-client";
import { bytesToBase64, sign } from "@/lib/crypto/ed25519";
import { assertSecureBrowserContext } from "@/lib/security/execution-context";

export async function signedFetch(
  identity: UnlockedIdentity,
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  assertSecureBrowserContext();
  const method = (init.method ?? "GET").toUpperCase();
  const url = new URL(input, window.location.origin);
  const path = signingPath(url.pathname, url.search);
  const bodyText =
    typeof init.body === "string"
      ? init.body
      : init.body != null
        ? String(init.body)
        : "";

  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  const bodyHash = hashBody(bodyText);
  const message = canonicalRequest({
    method,
    path,
    timestamp,
    nonce,
    bodyHash,
  });
  const signature = await sign(message, identity.privateKey);

  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(arkClientHeaders())) {
    headers.set(k, v);
  }
  headers.set(CRYPTO_HEADERS.timestamp, timestamp);
  headers.set(CRYPTO_HEADERS.nonce, nonce);
  headers.set(CRYPTO_HEADERS.signature, bytesToBase64(signature));
  headers.set(CRYPTO_HEADERS.bodyHash, bodyHash);
  headers.set(CRYPTO_HEADERS.publicKey, bytesToBase64(identity.publicKey));
  headers.set("Content-Type", "application/json");

  return fetch(input, {
    ...init,
    method,
    headers,
    body: bodyText || undefined,
    credentials: "same-origin",
  });
}
