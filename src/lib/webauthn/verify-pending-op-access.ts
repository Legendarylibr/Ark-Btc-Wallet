import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/crypto/cookie";
import { bytesToBase64 } from "@/lib/crypto/ed25519";
import { verifyPreSessionRequest } from "@/lib/crypto/pre-session";
import { constantTimeEqualString } from "@/lib/crypto/secure-compare";
import { getSession } from "@/lib/crypto/session-store";
import { verifySignedRequest } from "@/lib/crypto/verify-request";
import { HARDWARE_AUTH_UNAVAILABLE } from "./setup-gate";

function unavailable(): NextResponse {
  return NextResponse.json(
    { error: HARDWARE_AUTH_UNAVAILABLE },
    { status: 401 },
  );
}

/** Only the identity that created a pending op may fetch its WebAuthn auth options. */
export async function verifyPendingOpCreatorAccess(
  request: NextRequest,
  creatorPublicKeyB64: string | undefined,
  bodyText = "",
): Promise<NextResponse | null> {
  if (!creatorPublicKeyB64) return unavailable();

  const sid = request.cookies.get(SESSION_COOKIE)?.value;
  if (sid && getSession(sid)) {
    const auth = await verifySignedRequest(request, bodyText);
    if (auth instanceof NextResponse) return unavailable();
    const pkB64 = bytesToBase64(auth.publicKey);
    if (!constantTimeEqualString(pkB64, creatorPublicKeyB64)) {
      return unavailable();
    }
    return null;
  }

  const pre = await verifyPreSessionRequest(request, bodyText);
  if (pre instanceof NextResponse) return unavailable();
  if (!constantTimeEqualString(pre.publicKeyB64, creatorPublicKeyB64)) {
    return unavailable();
  }
  return null;
}
