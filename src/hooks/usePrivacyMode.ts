"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ark-wallet-privacy-mode";

export function usePrivacyMode() {
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    setPrivacyMode(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  function togglePrivacyMode() {
    setPrivacyMode((current) => {
      const next = !current;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return { privacyMode, togglePrivacyMode };
}
