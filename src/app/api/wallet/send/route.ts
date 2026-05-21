import { NextRequest, NextResponse } from "next/server";
import { withSensitiveCryptoGuard } from "@/lib/api-guard-sensitive";
import {
  BarkdError,
  barkd,
  estimateArkSendFee,
} from "@/lib/barkd";
import { isArkAddress } from "@/lib/utils";
import { parseJsonBody } from "@/lib/safe-json";
import { parseAmountSat, canAffordSend } from "@/lib/validate";
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

    if (!destination?.trim()) {
      return NextResponse.json(
        { error: "Ark address is required" },
        { status: 400 },
      );
    }
    if (!isArkAddress(destination)) {
      return NextResponse.json(
        { error: "Only valid Ark addresses (ark1…) are supported" },
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

    const arkInfo = await barkd.arkInfo().catch(() => null);
    const feeSat = estimateArkSendFee(amountSat, arkInfo);

    const balanceBefore = await barkd.balance();
    if (!canAffordSend(balanceBefore.spendable_sat, amountSat, feeSat)) {
      return NextResponse.json(
        { error: "Insufficient spendable balance for this payment" },
        { status: 400 },
      );
    }

    await barkd.sync();
    const balanceNow = await barkd.balance();
    if (!canAffordSend(balanceNow.spendable_sat, amountSat, feeSat)) {
      return NextResponse.json(
        { error: "Balance changed — try again" },
        { status: 409 },
      );
    }

    await barkd.sync();
    const result = await barkd.sendArk(destination.trim(), amountSat);
    return NextResponse.json({
      ok: true,
      movement_id: result.movement_id ?? null,
      message: result.message ?? null,
    });
  } catch (e) {
    if (e instanceof BarkdError) {
      return NextResponse.json(
        { error: safeApiError(e) },
        { status: e.status >= 500 ? 503 : e.status },
      );
    }
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }
});

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  return guarded(req, bodyText);
}
