"use client";

import { canAffordSend } from "@/lib/validate";
import { BARK_BROWSER_DATADIR } from "./config";
import { sdkEstimateArkSendFee } from "./fees";
import {
  createSignetConfig,
  loadBarkWasm,
  type WalletLike,
} from "./load";
import type { SdkBalance, SdkSendEstimate, SdkWalletHandle } from "./types";

function toBalance(b: {
  spendableSats: number;
  pendingLightningSendSats?: number;
  claimableLightningReceiveSats?: number;
}): SdkBalance {
  return {
    spendableSats: b.spendableSats,
    pendingLightningSendSats: b.pendingLightningSendSats ?? 0,
    claimableLightningReceiveSats: b.claimableLightningReceiveSats ?? 0,
  };
}

function wrapWallet(inner: WalletLike): SdkWalletHandle {
  return {
    async sync() {
      await inner.sync();
    },
    async balance() {
      return toBalance(await inner.balance());
    },
    async newAddress() {
      return inner.newAddress();
    },
    async estimateArkSend(_destination, amountSat) {
      const balance = await this.balance();
      let feeScheduleJson: string | undefined;
      if (typeof inner.arkInfo === "function") {
        const info = await inner.arkInfo();
        feeScheduleJson = info?.feeScheduleJson;
      }
      const feeSat = sdkEstimateArkSendFee(amountSat, feeScheduleJson);
      const totalSat = amountSat + feeSat;
      return {
        amount_sat: amountSat,
        fee_sat: feeSat,
        total_sat: totalSat,
        spendable_sat: balance.spendableSats,
        affordable: canAffordSend(balance.spendableSats, amountSat, feeSat),
        note:
          feeSat > 0
            ? "Estimate from Ark signet fee schedule (browser SDK)."
            : "Sync wallet first for fee schedule, or fee may be zero.",
      } satisfies SdkSendEstimate;
    },
    async sendArk(destination, amountSat) {
      await inner.sendArkoorPayment(destination, amountSat);
    },
    async refreshReceived() {
      if (typeof inner.refreshVtxos === "function") {
        await inner.refreshVtxos([]);
      }
    },
    close() {
      /* Wallet freed when reference dropped */
    },
  };
}

export async function generateSdkMnemonic(): Promise<string> {
  const mod = await loadBarkWasm();
  return mod.generateMnemonic();
}

export async function validateSdkMnemonic(mnemonic: string): Promise<boolean> {
  const mod = await loadBarkWasm();
  return mod.validateMnemonic(mnemonic);
}

export async function createSdkWallet(mnemonic: string): Promise<SdkWalletHandle> {
  const mod = await loadBarkWasm();
  const config = createSignetConfig(mod);
  const inner = await mod.Wallet.create({
    mnemonic,
    config,
    dbName: BARK_BROWSER_DATADIR,
    forceRescan: false,
  });
  return wrapWallet(inner);
}

export async function openSdkWallet(mnemonic: string): Promise<SdkWalletHandle> {
  const mod = await loadBarkWasm();
  const config = createSignetConfig(mod);
  const inner = await mod.Wallet.open({
    mnemonic,
    config,
    dbName: BARK_BROWSER_DATADIR,
  });
  return wrapWallet(inner);
}
