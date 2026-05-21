import {
  canonicalRequest,
  CRYPTO_HEADERS,
  hashBody,
  signingPath,
} from "@/lib/crypto/canonical";
import { bytesToBase64, sign } from "@/lib/crypto/ed25519";
import { SESSION_COOKIE } from "@/lib/crypto/cookie";

export async function buildSignedWalletHeaders(options: {
  method: string;
  pathname: string;
  search?: string;
  body?: string;
  privateKey: Uint8Array;
  publicKeyB64: string;
  sessionId?: string;
  extraHeaders?: Record<string, string>;
}): Promise<Headers> {
  const body = options.body ?? "";
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  const bodyHash = hashBody(body);
  const path = signingPath(options.pathname, options.search ?? "");
  const message = canonicalRequest({
    method: options.method,
    path,
    timestamp,
    nonce,
    bodyHash,
  });
  const signature = await sign(message, options.privateKey);

  const headers = new Headers({
    [CRYPTO_HEADERS.timestamp]: timestamp,
    [CRYPTO_HEADERS.nonce]: nonce,
    [CRYPTO_HEADERS.signature]: bytesToBase64(signature),
    [CRYPTO_HEADERS.bodyHash]: bodyHash,
    [CRYPTO_HEADERS.publicKey]: options.publicKeyB64,
    "x-ark-client": "ark-wallet/1",
    "user-agent": "Vitest/ArkWallet",
    host: "127.0.0.1:3000",
    origin: "http://127.0.0.1:3000",
    ...options.extraHeaders,
  });

  if (options.sessionId) {
    headers.set("cookie", `${SESSION_COOKIE}=${options.sessionId}`);
  }

  return headers;
}
