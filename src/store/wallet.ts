import { create } from "zustand";
import type { Balance, Movement } from "@/lib/barkd";
import {
  getStoredReceiveAddress,
  setStoredReceiveAddress,
} from "@/lib/storage";
import { arkClientHeaders } from "@/lib/ark-client";
import {
  walletApi,
  walletApiJson,
  walletApiJsonWithHardware,
  walletApiWithHardware,
  WalletApiError,
} from "@/lib/wallet-api";
import { useCryptoStore } from "@/store/crypto";

export type Sheet = "send" | "receive" | null;

interface WalletState {
  onboarded: boolean;
  daemon: boolean;
  connected: boolean;
  balance: Balance | null;
  history: Movement[];
  receiveAddress: string | null;
  sheet: Sheet;
  loading: boolean;
  error: string | null;
  secureStatus: "idle" | "loading" | "success" | "error";

  setSheet: (s: Sheet) => void;
  setError: (e: string | null) => void;
  fetchHealth: () => Promise<void>;
  fetchBalance: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  fetchAddress: (rotate?: boolean) => Promise<void>;
  refreshAll: () => Promise<void>;
  secureFunds: () => Promise<void>;
}

function handleApiError(e: unknown, set: (p: Partial<WalletState>) => void) {
  if (e instanceof WalletApiError) {
    set({ error: e.message });
    return;
  }
  set({ error: e instanceof Error ? e.message : "Something went wrong" });
}

export const useWalletStore = create<WalletState>((set, get) => ({
  onboarded: false,
  daemon: false,
  connected: false,
  balance: null,
  history: [],
  receiveAddress: null,
  sheet: null,
  loading: true,
  error: null,
  secureStatus: "idle",

  setSheet: (s) => set({ sheet: s }),
  setError: (e) => set({ error: e }),

  fetchHealth: async () => {
    try {
      const res = await fetch("/api/health", {
        cache: "no-store",
        headers: arkClientHeaders(),
      });
      const data = (await res.json()) as { ok?: boolean };
      const onboarded = data.ok === true;
      set({
        daemon: onboarded,
        connected: onboarded,
        onboarded,
        loading: false,
        error: onboarded
          ? null
          : "Start barkd on this machine (see setup steps)",
      });
      if (onboarded) {
        const cached = getStoredReceiveAddress();
        if (cached) set({ receiveAddress: cached });
      }
    } catch {
      set({
        daemon: false,
        connected: false,
        loading: false,
        error: "Cannot reach wallet API",
      });
    }
  },

  fetchBalance: async () => {
    try {
      const balance = await walletApiJson<Balance>("/api/wallet/balance");
      set({ balance, error: null });
    } catch (e) {
      handleApiError(e, set);
      throw e;
    }
  },

  fetchHistory: async () => {
    try {
      const history = await walletApiJson<Movement[]>("/api/wallet/history");
      set({ history });
    } catch (e) {
      if (e instanceof WalletApiError && e.status === 401) {
        await useCryptoStore.getState().lock();
        set({ error: "Session expired — unlock again", history: [] });
        return;
      }
      handleApiError(e, set);
    }
  },

  fetchAddress: async (rotate = false) => {
    const url = rotate ? "/api/wallet/address?rotate=1" : "/api/wallet/address";
    try {
      const { address } = rotate
        ? await walletApiJsonWithHardware<{ address: string }>(url)
        : await walletApiJson<{ address: string }>(url);
      setStoredReceiveAddress(address);
      set({ receiveAddress: address, error: null });
    } catch (e) {
      handleApiError(e, set);
      throw e;
    }
  },

  refreshAll: async () => {
    if (!get().onboarded) return;
    try {
      await walletApi("/api/wallet/sync", { method: "POST", body: "" });
      await Promise.all([get().fetchBalance(), get().fetchHistory()]);
      set({ error: null });
    } catch (e) {
      handleApiError(e, set);
    }
  },

  secureFunds: async () => {
    set({ secureStatus: "loading", error: null });
    try {
      const res = await walletApiWithHardware("/api/wallet/refresh", {
        method: "POST",
        body: "",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new WalletApiError(err.error ?? "Refresh failed", res.status);
      }
      await get().refreshAll();
      set({ secureStatus: "success" });
      setTimeout(() => set({ secureStatus: "idle" }), 3000);
    } catch (e) {
      handleApiError(e, set);
      set({ secureStatus: "error" });
      setTimeout(() => set({ secureStatus: "idle" }), 4000);
    }
  },
}));
