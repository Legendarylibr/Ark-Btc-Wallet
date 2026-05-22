import { NextRequest, NextResponse } from "next/server";
import { withCryptoGuard } from "@/lib/api-guard";
import { BarkdError, barkd } from "@/lib/barkd";
import { safeApiError } from "@/lib/safe-error";

const guarded = withCryptoGuard(async (_req, _bodyText) => {
  try {
    const balance = await barkd.balance();
    return NextResponse.json(balance);
  } catch (e) {
    if (e instanceof BarkdError) {
      return NextResponse.json(
        { error: safeApiError(e) },
        { status: e.status >= 500 ? 503 : e.status },
      );
    }
    return NextResponse.json({ error: "Balance unavailable" }, { status: 500 });
  }
});

export async function GET(req: NextRequest) {
  return guarded(req);
}
