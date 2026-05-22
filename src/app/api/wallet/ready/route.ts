import { NextRequest, NextResponse } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";

/** Removed — use signed POST /api/auth/barkd-ready after vault unlock. */
export async function GET(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  return NextResponse.json(
    {
      error:
        "Deprecated — use POST /api/auth/barkd-ready with pre-session signature",
    },
    { status: 410 },
  );
}
