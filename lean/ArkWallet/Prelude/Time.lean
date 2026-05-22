namespace ArkWallet.Prelude

/-- Ed25519 clock skew (`MAX_CLOCK_SKEW_MS`). -/
def maxClockSkewMs : Nat := 5 * 60 * 1000

/-- Server session TTL (default 24h; retention mode may shorten in TS). -/
def serverSessionTtlMs : Nat := 24 * 60 * 60 * 1000

/-- Server session idle (`SERVER_SESSION_IDLE_MS`). -/
def serverSessionIdleMs : Nat := 15 * 60 * 1000

/-- Read hardware freshness window (`READ_HARDWARE_TTL_MS`). -/
def readHardwareTtlMs : Nat := 5 * 60 * 1000

def absDiff (a b : Nat) : Nat :=
  if a ≥ b then a - b else b - a

/-- Mirrors `isTimestampValid` in `session-store.ts`. -/
def isTimestampValid (now timestamp : Nat) : Bool :=
  absDiff now timestamp ≤ maxClockSkewMs

def sessionExpiredByTtl (now createdAt : Nat) : Bool :=
  now - createdAt > serverSessionTtlMs

def sessionExpiredByIdle (now lastSeenAt : Nat) : Bool :=
  now - lastSeenAt > serverSessionIdleMs

def hardwareFresh (now lastHardwareAt : Nat) : Bool :=
  now - lastHardwareAt ≤ readHardwareTtlMs

end ArkWallet.Prelude
