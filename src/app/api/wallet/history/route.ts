import { NextRequest, NextResponse } from "next/server";
import { withReadCryptoGuard } from "@/lib/api-guard-read";
import { BarkdError, barkd, isArkMovement } from "@/lib/barkd";
import { safeApiError } from "@/lib/safe-error";

const guarded = withReadCryptoGuard(async (_req, _bodyText) => {
  try {
    const history = await barkd.history();
    const arkOnly = history.filter(isArkMovement);
    return NextResponse.json(arkOnly);
  } catch (e) {
    if (e instanceof BarkdError) {
      return NextResponse.json(
        { error: safeApiError(e) },
        { status: e.status >= 500 ? 503 : e.status },
      );
    }
    return NextResponse.json({ error: "History unavailable" }, { status: 500 });
  }
});

export async function GET(req: NextRequest) {
  return guarded(req);
}
