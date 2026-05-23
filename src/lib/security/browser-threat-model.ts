/** Pure threat signals for wallet lock decisions (mirrored in Lean). */

export type ThreatSignal =
  | "blur"
  | "tabHidden"
  | "pagehide"
  | "embedded"
  | "insecureContext";

export interface ThreatGuardConfig {
  lockOnBlur?: boolean;
  lockOnHide?: boolean;
}

export function shouldInvokeLock(
  signal: ThreatSignal,
  cfg: ThreatGuardConfig = {},
): boolean {
  switch (signal) {
    case "blur":
      return cfg.lockOnBlur !== false;
    case "tabHidden":
    case "pagehide":
      return cfg.lockOnHide !== false;
    case "embedded":
    case "insecureContext":
      return true;
  }
}

/** Lock immediately when registering the guard in an unsafe context. */
export function shouldLockAtRegistration(
  embedded: boolean,
  secureContext: boolean,
): boolean {
  return embedded || !secureContext;
}
