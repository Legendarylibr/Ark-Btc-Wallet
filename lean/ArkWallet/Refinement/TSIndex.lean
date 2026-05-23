/-!
  Complete TypeScript ↔ Lean module map (barkd mode + SDK boundary).
  See `docs/formal-verification-lean.md` for proof status and property catalog.
-/

namespace ArkWallet.Refinement.TSIndex

/-- `(TypeScript path, Lean module, security tier)` -/
structure MapEntry where
  tsPath : String
  leanModule : String
  tier : String
  deriving Repr

def tierCore : String := "core"
def tierRoute : String := "route"
def tierGuard : String := "guard"
def tierSdk : String := "sdk"
def tierClient : String := "client"
def tierExternal : String := "external"
def tierAxiom : String := "axiom"

def cryptoMap : List MapEntry := [
  ⟨"src/lib/crypto/canonical.ts", "ArkWallet.Crypto.Canonical", tierCore⟩,
  ⟨"src/lib/crypto/ed25519.ts", "ArkWallet.Crypto.Ed25519", tierAxiom⟩,
  ⟨"src/lib/crypto/nonce-format.ts", "ArkWallet.Crypto.Nonce", tierCore⟩,
  ⟨"src/lib/crypto/nonce-store.ts", "ArkWallet.Crypto.NonceStore", tierCore⟩,
  ⟨"src/lib/crypto/challenges.ts", "ArkWallet.Crypto.Challenge", tierCore⟩,
  ⟨"src/lib/crypto/challenge-messages.ts", "ArkWallet.Crypto.ChallengeMessages", tierCore⟩,
  ⟨"src/lib/crypto/secure-compare.ts", "ArkWallet.Crypto.SecureCompare", tierCore⟩,
  ⟨"src/lib/crypto/vault.ts", "ArkWallet.Refinement.Obligations", tierClient⟩,
  ⟨"src/lib/crypto/pre-session.ts", "ArkWallet.Auth.PreSession", tierCore⟩,
  ⟨"src/lib/crypto/verify-request.ts", "ArkWallet.Auth.VerifyRequest", tierCore⟩,
  ⟨"src/lib/crypto/session-store.ts", "ArkWallet.Auth.Session", tierCore⟩,
  ⟨"src/lib/crypto/cookie.ts", "ArkWallet.Auth.Session", tierGuard⟩,
  ⟨"src/lib/crypto/pubkey-pin.ts", "ArkWallet.Auth.PubkeyPin", tierCore⟩,
  ⟨"src/lib/crypto/setup-token.ts", "ArkWallet.Auth.SetupToken", tierCore⟩,
  ⟨"src/lib/crypto/setup-token-store.ts", "ArkWallet.Auth.SetupToken", tierCore⟩,
  ⟨"src/lib/crypto/unlock-attempt-token.ts", "ArkWallet.Auth.UnlockToken", tierCore⟩,
  ⟨"src/lib/crypto/unlock-token-binding-store.ts", "ArkWallet.Auth.UnlockToken", tierCore⟩,
  ⟨"src/lib/crypto/unlock-rate-limit.ts", "ArkWallet.Refinement.Obligations", tierGuard⟩,
  ⟨"src/lib/crypto/rate-limit.ts", "ArkWallet.Refinement.Obligations", tierGuard⟩,
  ⟨"src/lib/file-lock.ts", "ArkWallet.Crypto.FileLock", tierCore⟩,
  ⟨"src/lib/encrypted-file.ts", "ArkWallet.Crypto.EncryptedFile", tierCore⟩,
  ⟨"src/lib/server-secret.ts", "ArkWallet.Refinement.Obligations", tierAxiom⟩,
]

def sessionMap : List MapEntry := [
  ⟨"src/lib/client-binding.ts", "ArkWallet.Auth.SessionBinding", tierCore⟩,
]

def webauthnMap : List MapEntry := [
  ⟨"src/lib/webauthn/pending-op.ts", "ArkWallet.WebAuthn.PendingOp", tierCore⟩,
  ⟨"src/lib/webauthn/pending-op-store.ts", "ArkWallet.WebAuthn.PendingOp", tierCore⟩,
  ⟨"src/lib/webauthn/pending-op-paths.ts", "ArkWallet.WebAuthn.PendingOpPaths", tierCore⟩,
  ⟨"src/lib/webauthn/hardware-guard.ts", "ArkWallet.WebAuthn.HardwareFresh", tierGuard⟩,
  ⟨"src/lib/webauthn/verify.ts", "ArkWallet.Refinement.Obligations", tierAxiom⟩,
  ⟨"src/lib/webauthn/verify-pending-op-access.ts", "ArkWallet.WebAuthn.CreatorAccess", tierCore⟩,
  ⟨"src/lib/webauthn/store.ts", "ArkWallet.WebAuthn.CredentialStore", tierCore⟩,
  ⟨"src/lib/webauthn/setup-proof.ts", "ArkWallet.Routes.SetupFlows", tierGuard⟩,
  ⟨"src/lib/webauthn/setup-gate.ts", "ArkWallet.WebAuthn.SetupGate", tierGuard⟩,
  ⟨"src/lib/webauthn/config.ts", "ArkWallet.Refinement.Obligations", tierAxiom⟩,
  ⟨"src/lib/webauthn/client.ts", "ArkWallet.Refinement.Obligations", tierClient⟩,
]

def browserSecurityMap : List MapEntry := [
  ⟨"src/lib/security/csp.ts", "ArkWallet.Security.Csp", tierGuard⟩,
  ⟨"src/lib/security/csp-hardening.ts", "ArkWallet.Security.Csp", tierCore⟩,
  ⟨"src/lib/security/trusted-script-url.ts", "ArkWallet.Security.TrustedScriptUrl", tierCore⟩,
  ⟨"src/lib/security/trusted-types.ts", "ArkWallet.Security.TrustedScriptUrl", tierClient⟩,
  ⟨"src/lib/security/browser-threat-model.ts", "ArkWallet.Security.ThreatGuard", tierCore⟩,
  ⟨"src/lib/security/browser-threat-guard.ts", "ArkWallet.Security.ThreatGuard", tierClient⟩,
  ⟨"src/lib/security/execution-context.ts", "ArkWallet.Security.ExecutionContext", tierCore⟩,
  ⟨"src/components/SecuritySentinel.tsx", "ArkWallet.Security.ThreatGuard", tierClient⟩,
]

def inboundMap : List MapEntry := [
  ⟨"src/lib/inbound-security.ts", "ArkWallet.Inbound.ApiGate", tierCore⟩,
  ⟨"src/lib/security/loopback.ts", "ArkWallet.Inbound.Loopback", tierCore⟩,
  ⟨"src/lib/security/session-id.ts", "ArkWallet.Crypto.Nonce", tierCore⟩,
  ⟨"src/lib/security/request-limits.ts", "ArkWallet.Refinement.Obligations", tierGuard⟩,
  ⟨"src/lib/security/retention-policy.ts", "ArkWallet.Refinement.Obligations", tierGuard⟩,
  ⟨"src/lib/ark-client.ts", "ArkWallet.Inbound.ApiGate", tierCore⟩,
  ⟨"src/middleware.ts", "ArkWallet.Routes.MiddlewareWallet", tierGuard⟩,
  ⟨"src/lib/api-guard.ts", "ArkWallet.Auth.VerifyRequest", tierGuard⟩,
  ⟨"src/lib/api-guard-read.ts", "ArkWallet.Routes.WalletOps", tierGuard⟩,
  ⟨"src/lib/api-guard-sensitive.ts", "ArkWallet.Routes.WalletOps", tierGuard⟩,
  ⟨"src/lib/signed-fetch.ts", "ArkWallet.Crypto.Canonical", tierClient⟩,
  ⟨"src/lib/wallet-api.ts", "ArkWallet.Routes.WalletOps", tierClient⟩,
  ⟨"src/lib/barkd.ts", "ArkWallet.Refinement.Obligations", tierExternal⟩,
  ⟨"src/lib/barkd-security.ts", "ArkWallet.Inbound.Loopback", tierCore⟩,
]

def routeMap : List MapEntry := [
  ⟨"src/app/api/health/route.ts", "ArkWallet.Routes.Health", tierRoute⟩,
  ⟨"src/app/api/auth/challenge/route.ts", "ArkWallet.Routes.AuthFlows", tierRoute⟩,
  ⟨"src/app/api/auth/register/route.ts", "ArkWallet.Routes.AuthFlows", tierRoute⟩,
  ⟨"src/app/api/auth/unlock-check/route.ts", "ArkWallet.Routes.AuthFlows", tierRoute⟩,
  ⟨"src/app/api/auth/unlock-failed/route.ts", "ArkWallet.Routes.AuthFlows", tierRoute⟩,
  ⟨"src/app/api/auth/barkd-ready/route.ts", "ArkWallet.Routes.AuthFlows", tierRoute⟩,
  ⟨"src/app/api/auth/logout/route.ts", "ArkWallet.Routes.AuthFlows", tierRoute⟩,
  ⟨"src/app/api/auth/webauthn/status/route.ts", "ArkWallet.Routes.SetupFlows", tierRoute⟩,
  ⟨"src/app/api/auth/webauthn/setup-challenge/route.ts", "ArkWallet.Routes.SetupFlows", tierRoute⟩,
  ⟨"src/app/api/auth/webauthn/setup-proof/route.ts", "ArkWallet.Routes.SetupFlows", tierRoute⟩,
  ⟨"src/app/api/auth/webauthn/register-options/route.ts", "ArkWallet.Routes.SetupFlows", tierRoute⟩,
  ⟨"src/app/api/auth/webauthn/register-verify/route.ts", "ArkWallet.Routes.SetupFlows", tierRoute⟩,
  ⟨"src/app/api/auth/webauthn/auth-options/route.ts", "ArkWallet.Routes.SetupFlows", tierRoute⟩,
  ⟨"src/app/api/auth/webauthn/pending-op/route.ts", "ArkWallet.Routes.SetupFlows", tierRoute⟩,
  ⟨"src/app/api/wallet/balance/route.ts", "ArkWallet.Routes.WalletOps", tierRoute⟩,
  ⟨"src/app/api/wallet/history/route.ts", "ArkWallet.Routes.WalletOps", tierRoute⟩,
  ⟨"src/app/api/wallet/address/route.ts", "ArkWallet.Routes.WalletOps", tierRoute⟩,
  ⟨"src/app/api/wallet/send/route.ts", "ArkWallet.Routes.WalletOps", tierRoute⟩,
  ⟨"src/app/api/wallet/send/estimate/route.ts", "ArkWallet.Routes.WalletOps", tierRoute⟩,
  ⟨"src/app/api/wallet/refresh/route.ts", "ArkWallet.Routes.WalletOps", tierRoute⟩,
  ⟨"src/app/api/wallet/sync/route.ts", "ArkWallet.Routes.WalletOps", tierRoute⟩,
  ⟨"src/app/api/wallet/ready/route.ts", "ArkWallet.Routes.RouteId", tierRoute⟩,
  ⟨"src/app/api/**/route.ts", "ArkWallet.Routes.GuardMatrix", tierRoute⟩,
]

def sdkMap : List MapEntry := [
  ⟨"src/sdk/webauthn/challenges.ts", "ArkWallet.Sdk.PasskeyChallenge", tierSdk⟩,
  ⟨"src/sdk/webauthn/passkey-wallet.ts", "ArkWallet.Sdk.PasskeyChallenge", tierSdk⟩,
  ⟨"src/sdk/webauthn/pending-op.ts", "ArkWallet.Sdk.PasskeyChallenge", tierSdk⟩,
  ⟨"src/sdk/webauthn/assertion-verify.ts", "ArkWallet.Refinement.Obligations", tierSdk⟩,
  ⟨"src/sdk/**", "ArkWallet.Refinement.Obligations", tierSdk⟩,
]

def clientMap : List MapEntry := [
  ⟨"src/store/crypto.ts", "ArkWallet.Refinement.Obligations", tierClient⟩,
  ⟨"src/components/**", "ArkWallet.Refinement.Obligations", tierClient⟩,
  ⟨"src/instrumentation.ts", "ArkWallet.Refinement.Obligations", tierGuard⟩,
]

def completeMap : List MapEntry :=
  cryptoMap ++ sessionMap ++ webauthnMap ++ browserSecurityMap ++ inboundMap ++ routeMap ++ sdkMap ++ clientMap

def routeEntries : List MapEntry :=
  completeMap.filter fun e => e.tier == tierRoute

def coreEntries : List MapEntry :=
  completeMap.filter fun e => e.tier == tierCore

def countByTier (tier : String) : Nat :=
  (completeMap.filter fun e => e.tier == tier).length

def routeCount : Nat := routeMap.length

/-- Legacy flat list for backwards compatibility. -/
def entries : List (String × String) :=
  completeMap.map fun e => (e.tsPath, e.leanModule)

end ArkWallet.Refinement.TSIndex
