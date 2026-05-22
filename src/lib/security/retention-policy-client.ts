"use client";

/** Browser-only flag (set in `.env.local` for dev builds). */
export function isClientZeroRetention(): boolean {
  return process.env.NEXT_PUBLIC_ARK_ZERO_RETENTION === "true";
}
