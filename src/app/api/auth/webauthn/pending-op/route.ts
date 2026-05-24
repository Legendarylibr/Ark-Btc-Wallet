import { NextRequest, NextResponse } from "next/server";
import { runCryptoGuard } from "@/lib/api-guard";
import { isValidBodyHash } from "@/lib/crypto/canonical";
import { bytesToBase64 } from "@/lib/crypto/ed25519";
import { verifyPreSessionRequest } from "@/lib/crypto/pre-session";
import { assertApiSecurity } from "@/lib/inbound-security";
import { barkd } from "@/lib/barkd";
import { parseJsonBody } from "@/lib/safe-json";
import { readLimitedBody } from "@/lib/security/request-limits";
import { getSessionFingerprint } from "@/lib/webauthn/hardware-guard";
import {
  createPendingOp,
  VALID_PENDING_OP_TYPES,
  type PendingOpType,
} from "@/lib/webauthn/pending-op";
import { PENDING_OP_UNAVAILABLE } from "@/lib/webauthn/setup-gate";
import { SESSION_COOKIE } from "@/lib/crypto/cookie";
import { getSession } from "@/lib/crypto/session-store";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";

const VALID_TYPES = new Set<PendingOpType>(VALID_PENDING_OP_TYPES);

async function postHandler(
  request: NextRequest,
  bodyText: string,
  creatorPublicKeyB64: string,
): Promise<NextResponse> {
  const parsed = parseJsonBody<{ type?: string; bodyHash?: string }>(bodyText);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { type, bodyHash } = parsed.data;
  if (
    !type ||
    !bodyHash ||
    !isValidBodyHash(bodyHash) ||
    !VALID_TYPES.has(type as PendingOpType)
  ) {
    return NextResponse.json({ error: "Invalid pending operation" }, { status: 400 });
  }

  const pendingType = type as PendingOpType;

  let fingerprint: string;
  try {
    const { fingerprint: fp } = await barkd.walletStatus();
    if (!fp) {
      return NextResponse.json(
        { error: PENDING_OP_UNAVAILABLE },
        { status: 401 },
      );
    }
    fingerprint = fp;
  } catch {
    return NextResponse.json(
      { error: PENDING_OP_UNAVAILABLE },
      { status: 401 },
    );
  }

  const opId = createPendingOp(
    fingerprint,
    pendingType,
    bodyHash,
    creatorPublicKeyB64,
  );

  return NextResponse.json({ opId, expiresIn: 120 });
}

export async function POST(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  const ip = clientIp(req);
  if (!rateLimit(`pending-op:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await readLimitedBody(req);
  if (!body.ok) return body.response;

  const sid = req.cookies.get(SESSION_COOKIE)?.value;
  const session = sid ? getSession(sid) : null;

  if (session?.barkFingerprint && getSessionFingerprint(req)) {
    return runCryptoGuard(req, body.text, async (request, bodyText) => {
      const live = getSession(sid!);
      if (!live) {
        return NextResponse.json(
          { error: "Session expired — unlock wallet again" },
          { status: 401 },
        );
      }
      return postHandler(
        request,
        bodyText,
        bytesToBase64(live.publicKey),
      );
    });
  }

  if (sid && session && !session.barkFingerprint) {
    return NextResponse.json(
      { error: "Session invalid — unlock wallet again" },
      { status: 401 },
    );
  }

  if (!rateLimit(`pending-op-pre:${ip}`, 12, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const pre = await verifyPreSessionRequest(req, body.text);
  if (pre instanceof NextResponse) return pre;

  return postHandler(req, body.text, pre.publicKeyB64);
}
