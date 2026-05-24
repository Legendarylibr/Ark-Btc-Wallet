"use client";

import { useEffect, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWalletStore } from "@/store/wallet";
import { useCryptoStore } from "@/store/crypto";

const SYNC_INTERVAL_MS = 15_000;
const HEALTH_POLL_MS = 5_000;

export function useWallet() {
  const {
    onboarded,
    connected,
    balance,
    history,
    receiveAddress,
    sheet,
    loading,
    error,
    secureStatus,
    setSheet,
    fetchHealth,
  } = useWalletStore(
    useShallow((s) => ({
      onboarded: s.onboarded,
      connected: s.connected,
      balance: s.balance,
      history: s.history,
      receiveAddress: s.receiveAddress,
      sheet: s.sheet,
      loading: s.loading,
      error: s.error,
      secureStatus: s.secureStatus,
      setSheet: s.setSheet,
      fetchHealth: s.fetchHealth,
    })),
  );

  const cryptoReady = useCryptoStore(
    (s) => s.identity != null && s.sessionRegistered,
  );

  useEffect(() => {
    useWalletStore.getState().fetchHealth();
  }, []);

  useEffect(() => {
    if (onboarded) return;
    const id = setInterval(() => {
      useWalletStore.getState().fetchHealth();
    }, HEALTH_POLL_MS);
    return () => clearInterval(id);
  }, [onboarded]);

  useEffect(() => {
    if (!onboarded || !cryptoReady) return;

    void useWalletStore.getState().refreshAll();
    const id = setInterval(() => {
      void useWalletStore.getState().refreshAll();
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(id);
  }, [onboarded, cryptoReady]);

  const fetchAddressCb = useCallback(
    (rotate?: boolean) => useWalletStore.getState().fetchAddress(rotate),
    [],
  );

  const refreshAllCb = useCallback(
    () => useWalletStore.getState().refreshAll(),
    [],
  );

  const secureFundsCb = useCallback(
    () => useWalletStore.getState().secureFunds(),
    [],
  );

  return {
    onboarded,
    connected,
    balance,
    history,
    receiveAddress,
    sheet,
    loading,
    error,
    secureStatus,
    cryptoReady,
    setSheet,
    fetchHealth,
    fetchAddress: fetchAddressCb,
    refreshAll: refreshAllCb,
    secureFunds: secureFundsCb,
  };
}
