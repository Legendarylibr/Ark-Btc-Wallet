import {
  estimateArkSendFee,
  type ArkInfo,
  type FeeTier,
} from "@/lib/barkd";

function parseFeeTier(raw: unknown): FeeTier | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const min =
    o.min_fee_sat ?? o.minFeeSat ?? o.min_fee ?? o.MinFeeSat;
  const base =
    o.base_fee_sat ?? o.baseFeeSat ?? o.base_fee ?? o.BaseFeeSat;
  const ppm = o.ppm ?? o.Ppm;
  if (
    typeof min !== "number" ||
    typeof base !== "number" ||
    typeof ppm !== "number"
  ) {
    return null;
  }
  return {
    min_fee_sat: min,
    base_fee_sat: base,
    ppm,
  };
}

/** Map Bark SDK feeScheduleJson / nested fees to barkd ArkInfo shape */
export function parseSdkArkFees(raw: unknown): ArkInfo["fees"] | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  const fees = (root.fees ?? root) as Record<string, unknown>;

  const board = parseFeeTier(fees.board);
  const refresh = parseFeeTier(fees.refresh);
  if (!board || !refresh) return null;

  const send = parseFeeTier(fees.send);
  const arkoor = parseFeeTier(fees.arkoor ?? fees.arkoor_send);

  return {
    board,
    refresh,
    ...(send ? { send } : {}),
    ...(arkoor ? { arkoor } : {}),
  };
}

export function arkInfoFromFeeScheduleJson(
  feeScheduleJson: string,
): ArkInfo | null {
  try {
    const parsed = JSON.parse(feeScheduleJson) as unknown;
    const fees = parseSdkArkFees(parsed);
    if (!fees) return null;
    return { network: "signet", fees };
  } catch {
    return null;
  }
}

export function sdkEstimateArkSendFee(
  amountSat: number,
  feeScheduleJson: string | null | undefined,
): number {
  if (!feeScheduleJson) return 0;
  const info = arkInfoFromFeeScheduleJson(feeScheduleJson);
  return estimateArkSendFee(amountSat, info);
}
