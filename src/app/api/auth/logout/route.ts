import { NextRequest, NextResponse } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import {
  clearSessionCookie,
  LOGOUT_HEADER,
  SESSION_COOKIE,
} from "@/lib/crypto/cookie";
import { destroySession } from "@/lib/crypto/session-store";
import { purgeEphemeralServerData } from "@/lib/security/purge-ephemeral.server";

export async function POST(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  if (req.headers.get(LOGOUT_HEADER) !== "1") {
    return NextResponse.json({ error: "Invalid logout request" }, { status: 403 });
  }

  const sid = req.cookies.get(SESSION_COOKIE)?.value;
  if (sid) destroySession(sid);
  purgeEphemeralServerData();

  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
