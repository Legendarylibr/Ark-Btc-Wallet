"use client";

import { WALLET_LOCK_TIMEOUT_MS } from "@/lib/security/constants-base";
import { shouldLockAtRegistration } from "@/lib/security/browser-threat-model";
import { assertSecureBrowserContext, isEmbeddedFrame } from "@/lib/security/execution-context";

let lockHandler: (() => void) | null = null;
let activityHandler: (() => void) | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let listenersInstalled = false;

export interface WalletThreatGuardOptions {
  onLock: () => void;
  /** Reset idle auto-lock (SDK uses internal timer; barkd uses crypto store). */
  onActivity?: () => void;
  /** Lock when the window loses focus (default true). */
  lockOnBlur?: boolean;
  /** Lock when the tab is hidden or the page is unloaded (default true). */
  lockOnHide?: boolean;
  /** Idle lock after inactivity when `onActivity` is not set (default false). */
  manageIdleTimeout?: boolean;
}

function invokeLock(): void {
  lockHandler?.();
}

function resetIdleTimer(): void {
  if (!manageIdleTimeoutFlag || !lockHandler) return;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(invokeLock, WALLET_LOCK_TIMEOUT_MS);
}

let manageIdleTimeoutFlag = false;

function onUserActivity(): void {
  if (activityHandler) {
    activityHandler();
    return;
  }
  resetIdleTimer();
}

function installListeners(opts: WalletThreatGuardOptions): void {
  if (typeof document === "undefined" || listenersInstalled) return;
  listenersInstalled = true;

  const lockOnBlur = opts.lockOnBlur !== false;
  const lockOnHide = opts.lockOnHide !== false;

  if (lockOnHide) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") invokeLock();
    });
    window.addEventListener("pagehide", invokeLock);
  }

  if (lockOnBlur) {
    window.addEventListener("blur", invokeLock);
  }

  const activityEvents = ["pointerdown", "keydown", "touchstart"] as const;
  for (const ev of activityEvents) {
    document.addEventListener(ev, onUserActivity, {
      capture: true,
      passive: true,
    });
  }
}

/**
 * Lock on blur/hide, reject iframe embedding, and optionally track idle time.
 * Call once from `SecuritySentinel` (or SDK-only legacy entry).
 */
export function registerWalletThreatGuard(opts: WalletThreatGuardOptions): void {
  lockHandler = opts.onLock;
  activityHandler = opts.onActivity ?? null;
  manageIdleTimeoutFlag = opts.manageIdleTimeout === true;
  installListeners(opts);

  let secureContext = true;
  try {
    assertSecureBrowserContext();
  } catch {
    secureContext = false;
  }

  if (shouldLockAtRegistration(isEmbeddedFrame(), secureContext)) invokeLock();
}

/** Reset SDK idle auto-lock after sensitive operations. */
export function touchWalletActivity(): void {
  activityHandler?.();
  if (manageIdleTimeoutFlag) resetIdleTimer();
}

export function clearWalletThreatGuard(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
}
