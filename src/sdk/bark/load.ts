"use client";

export const BARK_WASM_BUILD_HINT =
  "Bark WASM is not built. Run: npm run vendor:bark-wasm && npm run build:bark-wasm (needs Rust + wasm-pack).";

type BarkWasmModule = {
  default: () => Promise<void>;
  generateMnemonic: () => string;
  validateMnemonic: (m: string) => boolean;
  validateArkAddress: (a: string) => boolean;
  Config: {
    create: (opts: Record<string, unknown>) => unknown;
  };
  Network: { Signet: unknown };
  Wallet: {
    create: (
      mnemonic: string,
      config: unknown,
      datadir: string,
      forceRescan: boolean,
    ) => Promise<WalletLike>;
    open: (
      mnemonic: string,
      config: unknown,
      datadir: string,
    ) => Promise<WalletLike>;
  };
};

type WalletLike = {
  sync(): Promise<void>;
  balance(): Promise<{
    spendableSats: bigint;
    pendingLightningSendSats?: bigint;
    claimableLightningReceiveSats?: bigint;
  }>;
  newAddress(): Promise<string>;
  sendArkoorPayment(address: string, amountSats: bigint): Promise<unknown>;
  arkInfo?(): { feeScheduleJson?: string } | null | undefined;
  refreshVtxos?(vtxoIds: string[]): Promise<unknown>;
  [key: string]: unknown;
};

let modulePromise: Promise<BarkWasmModule> | null = null;

export async function loadBarkWasm(): Promise<BarkWasmModule> {
  if (!modulePromise) {
    modulePromise = (async () => {
      try {
        const mod = (await import(
          "@secondts/bark-wasm"
        )) as BarkWasmModule & { default?: () => Promise<void> };
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

export function createSignetConfig(mod: BarkWasmModule): unknown {
  return mod.Config.create({
    serverAddress: "https://ark.signet.2nd.dev",
    esploraAddress: "https://esplora.signet.2nd.dev",
    network: mod.Network.Signet,
    bitcoindAddress: undefined,
    bitcoindCookiefile: undefined,
    bitcoindUser: undefined,
    bitcoindPass: undefined,
    vtxoRefreshExpiryThreshold: undefined,
    vtxoExitMargin: undefined,
    htlcRecvClaimDelta: undefined,
    fallbackFeeRate: undefined,
    roundTxRequiredConfirmations: undefined,
    daemonFastSyncIntervalSecs: undefined,
    daemonSlowSyncIntervalSecs: undefined,
  });
}

export type { WalletLike };
