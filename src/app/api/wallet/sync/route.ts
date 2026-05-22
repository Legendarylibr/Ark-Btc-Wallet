import { NextRequest, NextResponse } from "next/server";
import { withReadCryptoGuard } from "@/lib/api-guard-read";
import { BarkdError, barkd } from "@/lib/barkd";
import { safeApiError } from "@/lib/safe-error";

/** Sync only — balance is returned via read-protected GET /api/wallet/balance */
const guarded = withReadCryptoGuard(async (_req, _bodyText) => {
  try {
    await barkd.syncMailbox();
    await barkd.sync();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof BarkdError) {
      return NextResponse.json(
        { error: safeApiError(e) },
        { status: e.status >= 500 ? 503 : e.status },
      );
    }
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
});

export async function POST(req: NextRequest) {
  return guarded(req);
}
