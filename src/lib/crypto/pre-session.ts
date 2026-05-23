import { NextRequest, NextResponse } from "next/server";
import {
  canonicalRequest,
  CRYPTO_HEADERS,
  hashBody,
  signingPath,
} from "./canonical";
import { base64ToBytes, verify } from "./ed25519";
import { isValidNonceUuid } from "./nonce-format";
import { claimNonce } from "./nonce-store";
import { isTimestampValid } from "./session-store";
import { rateLimit } from "./rate-limit";
import { constantTimeBodyHashEqual } from "./secure-compare";

const MIN_SIG_B64_LENGTH = 80;
const ED25519_PUB_LEN = 32;
const PRE_SESSION_NONCE_SCOPE = "pre-session";

/**
 * Verify Ed25519 signature without a session cookie (unlock / setup flows).
 */
export async function verifyPreSessionRequest(
  request: NextRequest,
  bodyText: string,
): Promise<NextResponse | { publicKey: Uint8Array; publicKeyB64: string }> {
  const timestamp = request.headers.get(CRYPTO_HEADERS.timestamp);
  const nonce = request.headers.get(CRYPTO_HEADERS.nonce);
  const signatureB64 = request.headers.get(CRYPTO_HEADERS.signature);
  const bodyHashHeader = request.headers.get(CRYPTO_HEADERS.bodyHash);
  const publicKeyHeader = request.headers.get(CRYPTO_HEADERS.publicKey);

  if (
    !timestamp ||
    !nonce ||
    !signatureB64 ||
    !bodyHashHeader ||
    !publicKeyHeader
  ) {
    return NextResponse.json(
      { error: "Missing cryptographic headers" },
      { status: 401 },
    );
  }

  if (signatureB64.length < MIN_SIG_B64_LENGTH) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (!isValidNonceUuid(nonce)) {
    return NextResponse.json({ error: "Invalid nonce" }, { status: 401 });
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || !isTimestampValid(ts)) {
    return NextResponse.json({ error: "Invalid timestamp" }, { status: 401 });
  }

  const computedBodyHash = hashBody(bodyText);
  if (!constantTimeBodyHashEqual(computedBodyHash, bodyHashHeader)) {
    return NextResponse.json({ error: "Body hash mismatch" }, { status: 401 });
  }

  let headerPk: Uint8Array;
  try {
    headerPk = base64ToBytes(publicKeyHeader);
  } catch {
    return NextResponse.json({ error: "Invalid public key" }, { status: 401 });
  }

  if (headerPk.length !== ED25519_PUB_LEN) {
    return NextResponse.json({ error: "Invalid public key" }, { status: 401 });
  }

  const path = signingPath(request.nextUrl.pathname, request.nextUrl.search);
  const message = canonicalRequest({
    method: request.method,
    path,
    timestamp,
    nonce,
    bodyHash: bodyHashHeader,
  });

  let signature: Uint8Array;
  try {
    signature = base64ToBytes(signatureB64);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const valid = await verify(signature, message, headerPk);
  if (!valid) {
    const pkKey = publicKeyHeader.slice(0, 12);
    if (!rateLimit(`pre-session-bad:${pkKey}`, 20, 60_000)) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }
    return NextResponse.json(
      { error: "Invalid cryptographic signature" },
      { status: 401 },
    );
  }

  if (!claimNonce(`${PRE_SESSION_NONCE_SCOPE}:${publicKeyHeader}`, nonce)) {
    return NextResponse.json({ error: "Replay detected" }, { status: 401 });
  }

  return { publicKey: headerPk, publicKeyB64: publicKeyHeader };
}
