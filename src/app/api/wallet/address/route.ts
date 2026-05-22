import { NextRequest, NextResponse } from "next/server";
import { withCryptoGuard } from "@/lib/api-guard";
import { withSensitiveCryptoGuard } from "@/lib/api-guard-sensitive";
import { BarkdError, barkd } from "@/lib/barkd";
import { safeApiError } from "@/lib/safe-error";

async function addressHandler(_req: NextRequest): Promise<NextResponse> {
  try {
    const rotate = _req.nextUrl.searchParams.get("rotate") === "1";
    let address: string;
    if (rotate) {
      ({ address } = await barkd.nextAddress());
    } else {
      try {
        ({ address } = await barkd.receiveAddress());
      } catch (e) {
        if (e instanceof BarkdError && e.status === 404) {
          ({ address } = await barkd.nextAddress());
        } else {
          throw e;
        }
      }
    }
    return NextResponse.json({ address });
  } catch (e) {
    if (e instanceof BarkdError) {
      return NextResponse.json(
        { error: safeApiError(e) },
        { status: e.status >= 500 ? 503 : e.status },
      );
    }
    return NextResponse.json({ error: "Address unavailable" }, { status: 500 });
  }
}

const guardedRead = withCryptoGuard(async (req, _bodyText) =>
  addressHandler(req),
);
const guardedRotate = withSensitiveCryptoGuard(async (req, _bodyText) =>
  addressHandler(req),
);

export async function GET(req: NextRequest) {
  const rotate = req.nextUrl.searchParams.get("rotate") === "1";
  if (rotate) {
    return guardedRotate(req);
  }
  return guardedRead(req);
}
