import { NextRequest, NextResponse } from "next/server";
import {
  canonicalRequest,
  CRYPTO_HEADERS,
  hashBody,
  signingPath,
} from "./canonical";
import { base64ToBytes, verify } from "./ed25519";
import { hashClientBinding } from "@/lib/client-binding";
import { rateLimit } from "@/lib/crypto/rate-limit";
import { isValidNonceUuid } from "./nonce-format";
import { claimNonce } from "./nonce-store";
import {
  constantTimeBodyHashEqual,
  constantTimeEqual,
} from "./secure-compare";
import {
  ensureSessionClientBinding,
  destroySession,
  getSession,
  isTimestampValid,
  SESSION_COOKIE,
  touchSession,
} from "./session-store";

const MIN_SIG_B64_LENGTH = 80;
const ED25519_PUB_LEN = 32;

export async function verifySignedRequest(
  request: NextRequest,
  bodyText: string,
): Promise<NextResponse | { sessionId: string; publicKey: Uint8Array }> {
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return NextResponse.json(
      { error: "No cryptographic session" },
      { status: 401 },
    );
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json(
      { error: "Session expired — unlock wallet again" },
      { status: 401 },
    );
  }

  const binding = hashClientBinding(request);
  const bindResult = ensureSessionClientBinding(sessionId, binding);
  if (bindResult === "missing") {
    return NextResponse.json(
      { error: "Session expired — unlock wallet again" },
      { status: 401 },
    );
  }
  if (bindResult === "mismatch") {
    destroySession(sessionId);
    return NextResponse.json(
      { error: "Session binding mismatch — unlock again" },
      { status: 401 },
    );
  }

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
      { error: "Missing cryptographic signature headers" },
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
  if (!Number.isFinite(ts)) {
    return NextResponse.json({ error: "Invalid timestamp" }, { status: 401 });
  }

  if (!isTimestampValid(ts)) {
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

  if (
    headerPk.length !== ED25519_PUB_LEN ||
    !constantTimeEqual(headerPk, session.publicKey)
  ) {
    return NextResponse.json({ error: "Public key mismatch" }, { status: 401 });
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

  const valid = await verify(signature, message, session.publicKey);
  if (!valid) {
    if (!rateLimit(`bad-sig:${sessionId}`, 20, 60_000)) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }
    return NextResponse.json(
      { error: "Invalid cryptographic signature" },
      { status: 401 },
    );
  }

  if (!claimNonce(sessionId, nonce)) {
    return NextResponse.json({ error: "Replay detected" }, { status: 401 });
  }

  if (session.barkFingerprint) {
    try {
      const { barkd } = await import("@/lib/barkd");
      const { fingerprint } = await barkd.walletStatus();
      if (!fingerprint || fingerprint !== session.barkFingerprint) {
        return NextResponse.json(
          { error: "barkd wallet changed — unlock again" },
          { status: 401 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Cannot verify barkd wallet" },
        { status: 503 },
      );
    }
  }

  touchSession(sessionId);
  return { sessionId, publicKey: session.publicKey };
}
