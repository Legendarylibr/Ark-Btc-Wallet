/**
 * Server-side barkd client. Wallet keys and VTXOs are managed by barkd.
 */

import { getValidatedBarkdUrl } from "@/lib/barkd-security";
import { readResponseJson } from "@/lib/safe-json";

export class BarkdError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "BarkdError";
  }
}

const BARKD_TIMEOUT_MS = 60_000;

async function barkdFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = getValidatedBarkdUrl();
  const url = `${base}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  const barkdToken = process.env.BARKD_AUTH_TOKEN;
  const barkdAuthHeader = process.env.BARKD_AUTH_HEADER ?? "Authorization";
  if (barkdToken) {
    headers[barkdAuthHeader] = barkdToken.startsWith("Bearer ")
      ? barkdToken
      : `Bearer ${barkdToken}`;
  }

  const res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(BARKD_TIMEOUT_MS),
  });

  if (!res.ok) {
    let body: unknown;
    const text = await res.text();
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = text || undefined;
    }
    const msg =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: string }).message)
        : `barkd request failed: ${res.status}`;
    throw new BarkdError(msg, res.status, body);
  }

  if (res.status === 204) return undefined as T;
  const data = await readResponseJson<T>(res);
  if (data == null) {
    throw new BarkdError(
      `barkd returned invalid JSON (${res.status})`,
      res.status,
    );
  }
  return data;
}

export interface WalletStatus {
  fingerprint: string | null;
}

export interface Balance {
  spendable_sat: number;
  pending_lightning_send_sat: number;
  claimable_lightning_receive_sat: number;
  pending_in_round_sat: number;
  pending_board_sat: number;
  pending_exit_sat?: number | null;
}

export interface MovementDestination {
  destination: string;
  amount_sat: number;
}

export interface Movement {
  id: number;
  status: "pending" | "successful" | "failed" | "canceled";
  subsystem: { name: string; kind: string };
  intended_balance_sat: number;
  effective_balance_sat: number;
  offchain_fee_sat: number;
  sent_to: MovementDestination[];
  received_on: MovementDestination[];
  input_vtxos: string[];
  output_vtxos: string[];
  exited_vtxos: string[];
  time: {
    created_at: string;
    updated_at: string;
    completed_at?: string | null;
  };
  metadata?: Record<string, unknown> | null;
}

export interface SendResponse {
  message?: string;
  movement_id?: number;
}

export interface FeeTier {
  min_fee_sat: number;
  base_fee_sat: number;
  ppm: number;
}

export interface ArkInfo {
  network: string;
  fees: {
    board: FeeTier;
    refresh: FeeTier;
    send?: FeeTier;
    arkoor?: FeeTier;
  };
}

function feeFromTier(tier: FeeTier, amountSat: number): number {
  const ppmFee = Math.ceil((amountSat * tier.ppm) / 1_000_000);
  return Math.max(tier.min_fee_sat, tier.base_fee_sat + ppmFee);
}

/** Safety margin on top of barkd fee tiers (covers estimate vs actual) */
const FEE_BUFFER_BPS = 1500; // 15%

function applyFeeBuffer(feeSat: number): number {
  if (feeSat <= 0) return 0;
  return Math.ceil(feeSat * (1 + FEE_BUFFER_BPS / 10_000));
}

/** Conservative Ark send fee — max tiers + buffer */
export function estimateArkSendFee(
  amountSat: number,
  arkInfo?: ArkInfo | null,
): number {
  if (!arkInfo?.fees) return 0;

  const { board, refresh, send, arkoor } = arkInfo.fees;
  const candidates: number[] = [
    feeFromTier(board, amountSat),
    feeFromTier(refresh, amountSat),
  ];

  if (send) candidates.push(feeFromTier(send, amountSat));
  if (arkoor) candidates.push(feeFromTier(arkoor, amountSat));

  return applyFeeBuffer(Math.max(...candidates));
}

export const barkd = {
  async daemonReachable(): Promise<boolean> {
    try {
      await barkdFetch<WalletStatus>("/api/v1/wallet");
      return true;
    } catch {
      return false;
    }
  },

  async walletStatus(): Promise<WalletStatus> {
    return barkdFetch<WalletStatus>("/api/v1/wallet");
  },

  async walletExists(): Promise<boolean> {
    const { fingerprint } = await barkd.walletStatus();
    return fingerprint != null && fingerprint.length > 0;
  },

  async connected(): Promise<boolean> {
    try {
      const data = await barkdFetch<{ connected: boolean }>(
        "/api/v1/wallet/connected",
      );
      return data.connected;
    } catch {
      return false;
    }
  },

  async balance(): Promise<Balance> {
    return barkdFetch("/api/v1/wallet/balance");
  },

  async sync(): Promise<void> {
    await barkdFetch("/api/v1/wallet/sync", { method: "POST" });
  },

  async syncMailbox(): Promise<void> {
    await barkdFetch("/api/v1/wallet/sync/mailbox", { method: "POST" });
  },

  async receiveAddress(): Promise<{ address: string }> {
    return barkdFetch("/api/v1/wallet/addresses/index/0");
  },

  async nextAddress(): Promise<{ address: string }> {
    return barkdFetch("/api/v1/wallet/addresses/next");
  },

  async sendArk(
    destination: string,
    amountSat: number,
  ): Promise<SendResponse> {
    return barkdFetch("/api/v1/wallet/send", {
      method: "POST",
      body: JSON.stringify({
        destination,
        amount_sat: amountSat,
      }),
    });
  },

  async history(): Promise<Movement[]> {
    return barkdFetch("/api/v1/wallet/history");
  },

  async refreshReceived(): Promise<void> {
    await barkdFetch("/api/v1/wallet/refresh/counterparty", {
      method: "POST",
    });
  },

  async arkInfo(): Promise<ArkInfo> {
    return barkdFetch("/api/v1/wallet/ark-info");
  },
};

export function isArkMovement(m: Movement): boolean {
  const name = m.subsystem.name.toLowerCase();
  const kind = m.subsystem.kind.toLowerCase();

  if (name.includes("lightning") || kind.includes("lightning")) return false;
  if (kind.includes("board") || kind.includes("offboard")) return false;

  return (
    kind.includes("arkoor") ||
    (name.includes("ark") &&
      (kind.includes("send") ||
        kind.includes("receive") ||
        kind.includes("refresh")))
  );
}

export function satsToBtcDisplay(sats: number): string {
  const whole = Math.floor(sats / 100_000_000);
  const frac = (sats % 100_000_000).toString().padStart(8, "0").slice(0, 2);
  return `${whole.toLocaleString()}.${frac}`;
}
