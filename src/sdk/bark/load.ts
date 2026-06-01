"use client";

import { BARK_SIGNET } from "./config";

export const BARK_WASM_BUILD_HINT =
  "Bark browser SDK failed to load. Run npm install to install @secondts/bark, then restart the dev server.";

type BarkWasmModule = {
  default?: () => Promise<void>;
  generateMnemonic: () => string;
  validateMnemonic: (m: string) => boolean;
  validateArkAddress: (a: string) => boolean;
  Wallet: {
    create: (args: {
      mnemonic: string;
      config: BarkConfig;
      dbName: string;
      forceRescan: boolean;
    }) => Promise<WalletLike>;
    open: (args: {
      mnemonic: string;
      config: BarkConfig;
      dbName: string;
    }) => Promise<WalletLike>;
  };
};

type BarkConfig = {
  serverAddress: string;
  serverAccessToken?: string;
  esploraAddress?: string;
  bitcoindAddress?: string;
  bitcoindCookiefile?: string;
  bitcoindUser?: string;
  bitcoindPass?: string;
  network: "Bitcoin" | "Testnet" | "Signet" | "Regtest";
  vtxoRefreshExpiryThreshold?: number;
  vtxoExitMargin?: number;
  htlcRecvClaimDelta?: number;
  fallbackFeeRate?: number;
  roundTxRequiredConfirmations?: number;
  daemonSyncIntervalSecs?: number;
  offboardRequiredConfirmations?: number;
  daemonManualSync?: boolean;
  lightningReceiveClaimRetries?: number;
};

type WalletLike = {
  sync(): Promise<void>;
  balance(): Promise<{
    spendableSats: number;
    pendingLightningSendSats?: number;
    claimableLightningReceiveSats?: number;
  }>;
  newAddress(): Promise<string>;
  sendArkoorPayment(address: string, amountSats: number): Promise<unknown>;
  arkInfo?(): Promise<{ feeScheduleJson?: string } | null | undefined>;
  refreshVtxos?(vtxoIds: string[]): Promise<unknown>;
  [key: string]: unknown;
};

let modulePromise: Promise<BarkWasmModule> | null = null;

export async function loadBarkWasm(): Promise<BarkWasmModule> {
  if (!modulePromise) {
    modulePromise = (async () => {
      try {
        const mod = (await import(
          "@secondts/bark/web"
        )) as unknown as BarkWasmModule;
        if (typeof mod.default === "function") {
          await mod.default();
        }
        return mod;
      } catch {
        throw new Error(BARK_WASM_BUILD_HINT);
      }
    })();
  }
  return modulePromise;
}

export function createSignetConfig(mod: BarkWasmModule): BarkConfig {
  void mod;
  return {
    serverAddress: BARK_SIGNET.serverAddress,
    esploraAddress: BARK_SIGNET.esploraAddress,
    network: "Signet",
    bitcoindAddress: undefined,
    bitcoindCookiefile: undefined,
    bitcoindUser: undefined,
    bitcoindPass: undefined,
    vtxoRefreshExpiryThreshold: undefined,
    vtxoExitMargin: undefined,
    htlcRecvClaimDelta: undefined,
    fallbackFeeRate: undefined,
    roundTxRequiredConfirmations: undefined,
    daemonSyncIntervalSecs: undefined,
  } satisfies BarkConfig;
}

export type { WalletLike };
