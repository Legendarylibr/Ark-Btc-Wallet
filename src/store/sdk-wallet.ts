"use client";

import { create } from "zustand";
import { generateSdkMnemonic, openSdkWallet } from "@/sdk/bark/wallet";
import {
  hasSdkWalletVault,
  loadSdkMnemonic,
  loadSdkMnemonicBackup,
  saveSdkMnemonic,
} from "@/sdk/bark/mnemonic-vault";
import type { SdkBalance, SdkSendEstimate } from "@/sdk/bark/types";
import {
  closeActiveSdkWallet,
  requireActiveSdkWallet,
  setActiveSdkWallet,
} from "@/sdk/active-wallet";
import { validatePassphrase } from "@/lib/passphrase";
import {
  confirmSdkOperation,
  registerSdkHardware,
  sdkHardwareRegistered,
  sdkSendBodyHash,
} from "@/sdk/webauthn/client";
import {
  confirmPasskeySensitiveOp,
  createSdkWalletWithPasskey,
  getSdkUnlockMode,
  hasPasskeyRecoveryBackup,
  unlockSdkWalletWithPasskey,
  upgradePassphraseWalletToPasskey,
  type SdkUnlockMode,
} from "@/sdk/webauthn/passkey-wallet";
import { isPrfSupported } from "@/sdk/webauthn/prf";
import { clearClientEphemeralData } from "@/lib/client-ephemeral";
import { clearSdkAutoLock, touchSdkActivity } from "@/sdk/session-lock";
import {
  clearPendingMnemonicBackup,
  setPendingMnemonicBackup,
} from "@/sdk/mnemonic-backup";

interface SdkWalletState {
  ready: boolean;
  hasWallet: boolean;
  unlocked: boolean;
  unlockMode: SdkUnlockMode;
  prfAvailable: boolean;
  hasRecoveryBackup: boolean;
  /** Legacy passphrase + confirm-on-pay */
  hardwareRegistered: boolean;
  balance: SdkBalance | null;
  address: string | null;
  showMnemonicBackup: boolean;
  loading: boolean;
  error: string | null;

  init: () => Promise<void>;
  createWalletWithPasskey: (recoveryPassphrase: string) => Promise<string>;
  createWalletWithPassphrase: (passphrase: string) => Promise<string>;
  unlockWithPasskey: () => Promise<void>;
  unlockWithPassphrase: (passphrase: string) => Promise<void>;
  unlockWithRecoveryPassphrase: (passphrase: string) => Promise<void>;
  upgradeToPasskey: (passphrase: string) => Promise<void>;
  registerHardware: (passphrase: string) => Promise<void>;
  lock: () => void;
  sync: () => Promise<void>;
  refreshAddress: () => Promise<void>;
  estimateSend: (destination: string, amountSat: number) => Promise<SdkSendEstimate>;
  send: (destination: string, amountSat: number) => Promise<void>;
  secure: () => Promise<void>;
  clearError: () => void;
  dismissBackup: () => void;
}

function hideMnemonicBackup(
  set: (partial: Partial<SdkWalletState>) => void,
): void {
  clearPendingMnemonicBackup();
  set({ showMnemonicBackup: false });
}

async function openWalletFromMnemonic(mnemonic: string) {
  const wallet = await openSdkWallet(mnemonic);
  setActiveSdkWallet(wallet);
  await wallet.sync();
  const balance = await wallet.balance();
  const address = await wallet.newAddress();
  return { balance, address };
}

export const useSdkWalletStore = create<SdkWalletState>((set, get) => ({
  ready: false,
  hasWallet: false,
  unlocked: false,
  unlockMode: null,
  prfAvailable: false,
  hasRecoveryBackup: false,
  hardwareRegistered: false,
  balance: null,
  address: null,
  showMnemonicBackup: false,
  loading: false,
  error: null,

  init: async () => {
    const [hasWallet, unlockMode, prfAvailable, hasRecoveryBackup] =
      await Promise.all([
        hasSdkWalletVault(),
        getSdkUnlockMode(),
        isPrfSupported(),
        hasPasskeyRecoveryBackup(),
      ]);
    const hardwareRegistered =
      unlockMode === "passphrase" ? await sdkHardwareRegistered() : false;
    set({
      ready: true,
      hasWallet,
      unlockMode,
      prfAvailable,
      hasRecoveryBackup,
      hardwareRegistered,
    });
  },

  createWalletWithPasskey: async (recoveryPassphrase) => {
    const err = validatePassphrase(recoveryPassphrase);
    if (err) throw new Error(err);

    set({ loading: true, error: null });
    try {
      const mnemonic = await generateSdkMnemonic();
      await createSdkWalletWithPasskey(mnemonic, recoveryPassphrase);
      const opened = await openWalletFromMnemonic(mnemonic);
      touchSdkActivity();
      set({
        hasWallet: true,
        unlocked: true,
        unlockMode: "passkey",
        hasRecoveryBackup: true,
        hardwareRegistered: false,
        ...opened,
        showMnemonicBackup: true,
        loading: false,
      });
      setPendingMnemonicBackup(mnemonic);
      return mnemonic;
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Could not create wallet",
      });
      throw e;
    }
  },

  createWalletWithPassphrase: async (passphrase) => {
    const err = validatePassphrase(passphrase);
    if (err) throw new Error(err);

    set({ loading: true, error: null });
    try {
      const mnemonic = await generateSdkMnemonic();
      await saveSdkMnemonic(passphrase, mnemonic);
      const opened = await openWalletFromMnemonic(mnemonic);
      set({
        hasWallet: true,
        unlocked: true,
        unlockMode: "passphrase",
        hardwareRegistered: false,
        ...opened,
        showMnemonicBackup: true,
        loading: false,
      });
      setPendingMnemonicBackup(mnemonic);
      return mnemonic;
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Could not create wallet",
      });
      throw e;
    }
  },

  unlockWithPasskey: async () => {
    set({ loading: true, error: null });
    try {
      const mnemonic = await unlockSdkWalletWithPasskey();
      const opened = await openWalletFromMnemonic(mnemonic);
      touchSdkActivity();
      set({
        unlocked: true,
        unlockMode: "passkey",
        ...opened,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Passkey unlock failed",
      });
      throw e;
    }
  },

  unlockWithPassphrase: async (passphrase) => {
    set({ loading: true, error: null });
    try {
      const mnemonic = await loadSdkMnemonic(passphrase);
      const opened = await openWalletFromMnemonic(mnemonic);
      const hardwareRegistered = await sdkHardwareRegistered();
      set({
        unlocked: true,
        unlockMode: "passphrase",
        hardwareRegistered,
        ...opened,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Unlock failed",
      });
      throw e;
    }
  },

  unlockWithRecoveryPassphrase: async (passphrase) => {
    set({ loading: true, error: null });
    try {
      const mnemonic = await loadSdkMnemonicBackup(passphrase);
      const opened = await openWalletFromMnemonic(mnemonic);
      set({
        unlocked: true,
        unlockMode: "passkey",
        ...opened,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Recovery unlock failed",
      });
      throw e;
    }
  },

  upgradeToPasskey: async (passphrase) => {
    set({ loading: true, error: null });
    try {
      const mnemonic = await loadSdkMnemonic(passphrase);
      await upgradePassphraseWalletToPasskey(mnemonic, passphrase);
      set({
        unlockMode: "passkey",
        hasRecoveryBackup: true,
        hardwareRegistered: false,
        loading: false,
        error: null,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Passkey upgrade failed",
      });
      throw e;
    }
  },

  registerHardware: async (passphrase) => {
    set({ loading: true, error: null });
    try {
      await registerSdkHardware(passphrase);
      set({ hardwareRegistered: true, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Hardware registration failed",
      });
      throw e;
    }
  },

  lock: () => {
    clearPendingMnemonicBackup();
    closeActiveSdkWallet();
    clearSdkAutoLock();
    clearClientEphemeralData();
    set({
      unlocked: false,
      balance: null,
      address: null,
      showMnemonicBackup: false,
    });
  },

  sync: async () => {
    const wallet = requireActiveSdkWallet();
    set({ loading: true, error: null });
    try {
      await wallet.sync();
      const balance = await wallet.balance();
      set({ balance, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Sync failed",
      });
    }
  },

  refreshAddress: async () => {
    const wallet = requireActiveSdkWallet();
    const { unlockMode } = get();
    touchSdkActivity();
    if (unlockMode === "passphrase") {
      await confirmSdkOperation("rotate-address", "rotate-address");
    } else if (unlockMode === "passkey") {
      await confirmPasskeySensitiveOp("rotate-address", "rotate-address");
    }
    const address = await wallet.newAddress();
    set({ address });
  },

  estimateSend: async (destination, amountSat) => {
    const wallet = requireActiveSdkWallet();
    return wallet.estimateArkSend(destination, amountSat);
  },

  send: async (destination, amountSat) => {
    const wallet = requireActiveSdkWallet();
    const { unlockMode } = get();

    if (unlockMode === "passphrase") {
      if (!get().hardwareRegistered) {
        throw new Error("Register hardware security before sending");
      }
      set({ loading: true, error: null });
      try {
        await confirmSdkOperation("send", sdkSendBodyHash(destination, amountSat));
        await wallet.sendArk(destination, amountSat);
        await wallet.sync();
        set({ balance: await wallet.balance(), loading: false });
      } catch (e) {
        set({
          loading: false,
          error: e instanceof Error ? e.message : "Send failed",
        });
        throw e;
      }
      return;
    }

    touchSdkActivity();
    set({ loading: true, error: null });
    try {
      if (unlockMode === "passkey") {
        await confirmPasskeySensitiveOp(
          "send",
          sdkSendBodyHash(destination, amountSat),
        );
      }
      await wallet.sendArk(destination, amountSat);
      await wallet.sync();
      set({ balance: await wallet.balance(), loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Send failed",
      });
      throw e;
    }
  },

  secure: async () => {
    const wallet = requireActiveSdkWallet();
    const { unlockMode } = get();
    touchSdkActivity();

    if (unlockMode === "passphrase") {
      if (!get().hardwareRegistered) {
        throw new Error("Register hardware security first");
      }
      set({ loading: true, error: null });
      try {
        await confirmSdkOperation("refresh", "refresh");
        await wallet.refreshReceived();
        await wallet.sync();
        set({ balance: await wallet.balance(), loading: false });
      } catch (e) {
        set({
          loading: false,
          error: e instanceof Error ? e.message : "Secure failed",
        });
      }
      return;
    }

    set({ loading: true, error: null });
    try {
      if (unlockMode === "passkey") {
        await confirmPasskeySensitiveOp("refresh", "refresh");
      }
      await wallet.refreshReceived();
      await wallet.sync();
      set({ balance: await wallet.balance(), loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Secure failed",
      });
    }
  },

  clearError: () => set({ error: null }),
  dismissBackup: () => hideMnemonicBackup(set),
}));
