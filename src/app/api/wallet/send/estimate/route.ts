import { NextRequest, NextResponse } from "next/server";
import { withSensitiveCryptoGuard } from "@/lib/api-guard-sensitive";
import {
  BarkdError,
  barkd,
  estimateArkSendFee,
} from "@/lib/barkd";
import { parseAmountSat, canAffordSend } from "@/lib/validate";
import { isValidArkAddress } from "@/lib/ark-address";
import { parseJsonBody } from "@/lib/safe-json";
import { safeApiError } from "@/lib/safe-error";

const guarded = withSensitiveCryptoGuard(async (_req, bodyText) => {
  try {
    const parsed = parseJsonBody<{
      destination?: string;
      amount_sat?: unknown;
    }>(bodyText);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { destination, amount_sat } = parsed.data;

    if (!destination?.trim() || !isValidArkAddress(destination)) {
      return NextResponse.json(
        { error: "Valid Ark address required" },
        { status: 400 },
      );
    }

    const amountSat = parseAmountSat(amount_sat);
    if (amountSat == null) {
      return NextResponse.json(
        { error: "Enter a valid whole-number amount in sats" },
        { status: 400 },
      );
    }

    await barkd.sync();

    const [balance, arkInfo] = await Promise.all([
      barkd.balance(),
      barkd.arkInfo().catch(() => null),
    ]);

    const feeSat = estimateArkSendFee(amountSat, arkInfo);
    const totalSat = amountSat + feeSat;
    const affordable = canAffordSend(balance.spendable_sat, amountSat, feeSat);

    return NextResponse.json({
      amount_sat: amountSat,
      fee_sat: feeSat,
      total_sat: totalSat,
      spendable_sat: balance.spendable_sat,
      affordable,
      note: "Ark payments settle instantly. Bitcoin keys sign transactions in barkd.",
    });
  } catch (e) {
    if (e instanceof BarkdError) {
      return NextResponse.json(
        { error: safeApiError(e) },
        { status: e.status >= 500 ? 503 : e.status },
      );
    }
    return NextResponse.json({ error: "Estimate failed" }, { status: 500 });
  }
});

export async function POST(req: NextRequest) {
  return guarded(req);
}
