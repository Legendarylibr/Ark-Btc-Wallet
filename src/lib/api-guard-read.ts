import { NextRequest, NextResponse } from "next/server";
import { withCryptoGuard } from "@/lib/api-guard";
import { SESSION_COOKIE } from "@/lib/crypto/cookie";
import {
  getSession,
  isHardwareFreshForRead,
  touchSessionHardware,
} from "@/lib/crypto/session-store";
import {
  assertHardwareAuthForRead,
  getSessionFingerprint,
} from "@/lib/webauthn/hardware-guard";

/** Ed25519 + recent WebAuthn (or fresh read-access confirmation on this request). */
export function withReadCryptoGuard(
  handler: (request: NextRequest, bodyText: string) => Promise<NextResponse>,
) {
  return withCryptoGuard(async (request, bodyText) => {
    const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
    if (!sessionId || !getSession(sessionId)) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    if (!isHardwareFreshForRead(sessionId)) {
      const fingerprint = getSessionFingerprint(request);
      if (!fingerprint) {
        return NextResponse.json(
          {
            error:
              "Recent hardware confirmation required — use your security key",
            code: "HARDWARE_READ_REQUIRED",
          },
          { status: 401 },
        );
      }
      const hwBlock = await assertHardwareAuthForRead(request, fingerprint, "");
      if (hwBlock) return hwBlock;
      touchSessionHardware(sessionId);
    }

    return handler(request, bodyText);
  });
}
