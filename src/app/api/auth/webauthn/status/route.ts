import { NextRequest, NextResponse } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";

/** Removed — clients use `getBarkHardwareRegistered()` in IndexedDB after hardware setup. */
export async function GET(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  return NextResponse.json(
    {
      error:
        "Deprecated — use client-side hardware registration state (IndexedDB)",
    },
    { status: 410 },
  );
}
