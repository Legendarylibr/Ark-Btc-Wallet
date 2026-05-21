import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { hashBody } from "@/lib/crypto/canonical";
import { getSession } from "@/lib/crypto/session-store";
import { SESSION_COOKIE } from "@/lib/crypto/cookie";
import { verifyHardwareAuthentication } from "./verify";
import {
  consumePendingOp,
  invalidatePendingOp,
  matchesPendingOp,
  pendingOpTypeForPath,
  type PendingOpType,
} from "./pending-op";
import { HARDWARE_AUTH_HEADER, PENDING_OP_HEADER } from "./constants";

export {
  HARDWARE_AUTH_HEADER,
  PENDING_OP_HEADER,
  SETUP_TOKEN_HEADER,
} from "./constants";

export function getSessionFingerprint(
  request: NextRequest,
): string | null {
  const sid = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const session = getSession(sid);
  return session?.barkFingerprint ?? null;
}

async function assertHardwareAuthWithType(
  request: NextRequest,
  fingerprint: string,
  bodyText: string,
  opType: PendingOpType,
  missingHeadersError: string,
  pendingMismatchError: string,
): Promise<NextResponse | null> {
  const raw = request.headers.get(HARDWARE_AUTH_HEADER);
  const opId = request.headers.get(PENDING_OP_HEADER);
  if (!raw || !opId) {
    return NextResponse.json({ error: missingHeadersError }, { status: 401 });
  }

  const bodyHash = hashBody(bodyText);
  if (!matchesPendingOp(opId, fingerprint, opType, bodyHash)) {
    return NextResponse.json({ error: pendingMismatchError }, { status: 401 });
  }

  let response: AuthenticationResponseJSON;
  let expectedChallenge: string;
  try {
    const parsed = JSON.parse(raw) as {
      response: AuthenticationResponseJSON;
      challenge: string;
      opId?: string;
    };
    response = parsed.response;
    expectedChallenge = parsed.challenge;
    if (parsed.opId && parsed.opId !== opId) {
      invalidatePendingOp(opId);
      return NextResponse.json(
        { error: "Operation binding mismatch" },
        { status: 401 },
      );
    }
  } catch {
    invalidatePendingOp(opId);
    return NextResponse.json(
      { error: "Invalid hardware auth payload" },
      { status: 400 },
    );
  }

  const result = await verifyHardwareAuthentication(
    request,
    fingerprint,
    expectedChallenge,
    response,
    opId,
  );

  if (!result.ok) {
    invalidatePendingOp(opId);
    const msg =
      result.error.includes("expired") || result.error.includes("failed")
        ? "Device confirmation failed or timed out — tap Unlock and try again"
        : result.error;
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  if (!consumePendingOp(opId, fingerprint, opType, bodyHash)) {
    return NextResponse.json({ error: pendingMismatchError }, { status: 401 });
  }

  return null;
}

export async function assertHardwareAuth(
  request: NextRequest,
  fingerprint: string,
  bodyText: string,
): Promise<NextResponse | null> {
  const opType = pendingOpTypeForPath(
    request.nextUrl.pathname,
    request.nextUrl.search,
  );
  if (!opType) {
    return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
  }

  return assertHardwareAuthWithType(
    request,
    fingerprint,
    bodyText,
    opType,
    "Hardware confirmation required — use your security key, YubiKey, or Touch ID",
    "This action expired or was already confirmed — start again from the app",
  );
}

export async function assertHardwareAuthForRegister(
  request: NextRequest,
  fingerprint: string,
  registerBodyText: string,
): Promise<NextResponse | null> {
  return assertHardwareAuthWithType(
    request,
    fingerprint,
    registerBodyText,
    "session-register",
    "Hardware confirmation required for unlock",
    "Unlock confirmation expired — enter passphrase and tap Unlock again",
  );
}
