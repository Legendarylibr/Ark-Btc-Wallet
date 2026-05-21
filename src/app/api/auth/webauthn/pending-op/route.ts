import { NextRequest, NextResponse } from "next/server";
import { withCryptoGuard } from "@/lib/api-guard";
import { verifyPreSessionRequest } from "@/lib/crypto/pre-session";
import { assertApiSecurity } from "@/lib/inbound-security";
import { barkd } from "@/lib/barkd";
import { parseJsonBody } from "@/lib/safe-json";
import { getSessionFingerprint } from "@/lib/webauthn/hardware-guard";
import {
  createPendingOp,
  VALID_PENDING_OP_TYPES,
  type PendingOpType,
} from "@/lib/webauthn/pending-op";
import { SESSION_COOKIE } from "@/lib/crypto/cookie";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";

const VALID_TYPES = new Set<PendingOpType>(VALID_PENDING_OP_TYPES);

async function postHandler(
  request: NextRequest,
  bodyText: string,
): Promise<NextResponse> {
  const parsed = parseJsonBody<{ type?: string; bodyHash?: string }>(bodyText);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { type, bodyHash } = parsed.data;
  if (!type || !bodyHash || !VALID_TYPES.has(type as PendingOpType)) {
    return NextResponse.json({ error: "Invalid pending operation" }, { status: 400 });
  }

  const { fingerprint } = await barkd.walletStatus();
  if (!fingerprint) {
    return NextResponse.json({ error: "No barkd fingerprint" }, { status: 503 });
  }

  const opId = createPendingOp(
    fingerprint,
    type as PendingOpType,
    bodyHash,
  );

  return NextResponse.json({ opId, expiresIn: 120 });
}

const guardedSession = withCryptoGuard(postHandler);

export async function POST(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  const ip = clientIp(req);
  if (!rateLimit(`pending-op:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const bodyText = await req.text();

  const sid = req.cookies.get(SESSION_COOKIE)?.value;
  if (sid && getSessionFingerprint(req)) {
    return guardedSession(req, bodyText);
  }

  if (!rateLimit(`pending-op-pre:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const pre = await verifyPreSessionRequest(req, bodyText);
  if (pre instanceof NextResponse) return pre;

  return postHandler(req, bodyText);
}
