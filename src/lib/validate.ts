export function parseAmountSat(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (!Number.isInteger(value) || value < 1) return null;
  if (value > Number.MAX_SAFE_INTEGER) return null;
  return value;
}

export function canAffordSend(
  spendableSat: number,
  amountSat: number,
  feeSat: number,
): boolean {
  return amountSat + feeSat <= spendableSat;
}
