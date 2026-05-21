import { NextRequest, NextResponse } from "next/server";
import { withCryptoGuard } from "@/lib/api-guard";
import { BarkdError, barkd } from "@/lib/barkd";
import { safeApiError } from "@/lib/safe-error";

const guarded = withCryptoGuard(async (_req, _bodyText) => {
  try {
    await barkd.syncMailbox();
    await barkd.sync();
    const balance = await barkd.balance();
    return NextResponse.json({ ok: true, balance });
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
  const bodyText = await req.text();
  return guarded(req, bodyText);
}
