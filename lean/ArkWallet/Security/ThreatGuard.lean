namespace ArkWallet.Security

inductive ThreatSignal
  | blur
  | tabHidden
  | pagehide
  | embedded
  | insecureContext
  deriving Repr, DecidableEq

structure ThreatGuardConfig where
  lockOnBlur : Bool := true
  lockOnHide : Bool := true
  deriving Repr

def shouldInvokeLock (signal : ThreatSignal) (cfg : ThreatGuardConfig) : Bool :=
  match signal with
  | .blur => cfg.lockOnBlur
  | .tabHidden | .pagehide => cfg.lockOnHide
  | .embedded | .insecureContext => true

def shouldLockAtRegistration (embedded secureContext : Bool) : Bool :=
  embedded || !secureContext

end ArkWallet.Security
