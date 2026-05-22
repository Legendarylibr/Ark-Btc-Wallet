import { NextRequest, NextResponse } from "next/server";
import { withSensitiveCryptoGuard } from "@/lib/api-guard-sensitive";
import { BarkdError, barkd } from "@/lib/barkd";
import { safeApiError } from "@/lib/safe-error";

const guarded = withSensitiveCryptoGuard(async (_req, _bodyText) => {
  try {
    await barkd.refreshReceived();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof BarkdError) {
      return NextResponse.json(
        { error: safeApiError(e) },
        { status: e.status >= 500 ? 503 : e.status },
      );
    }
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
});

export async function POST(req: NextRequest) {
  return guarded(req);
}
