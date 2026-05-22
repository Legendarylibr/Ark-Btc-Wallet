/-!
  TypeScript ↔ Lean index (barkd mode security surface).
  See `docs/formal-verification-lean.md` for proof status.
-/

namespace ArkWallet.Refinement.TSIndex

def entries : List (String × String) := [
  ("src/lib/crypto/canonical.ts", "ArkWallet.Crypto.Canonical"),
  ("src/lib/crypto/nonce-format.ts", "ArkWallet.Crypto.Nonce"),
  ("src/lib/crypto/nonce-store.ts", "ArkWallet.Crypto.NonceStore"),
  ("src/lib/crypto/challenges.ts", "ArkWallet.Crypto.Challenge"),
  ("src/lib/crypto/challenge-messages.ts", "ArkWallet.Crypto.ChallengeMessages"),
  ("src/lib/crypto/session-store.ts", "ArkWallet.Auth.Session"),
  ("src/lib/crypto/verify-request.ts", "ArkWallet.Auth.VerifyRequest"),
  ("src/lib/crypto/pre-session.ts", "ArkWallet.Auth.PreSession"),
  ("src/lib/crypto/pubkey-pin.ts", "ArkWallet.Auth.PubkeyPin"),
  ("src/lib/crypto/setup-token.ts", "ArkWallet.Auth.SetupToken"),
  ("src/lib/crypto/unlock-attempt-token.ts", "ArkWallet.Auth.UnlockToken"),
  ("src/lib/client-binding.ts", "ArkWallet.Auth.SessionBinding"),
  ("src/lib/inbound-security.ts", "ArkWallet.Inbound.ApiGate"),
  ("src/lib/security/loopback.ts", "ArkWallet.Inbound.Loopback"),
  ("src/lib/webauthn/pending-op.ts", "ArkWallet.WebAuthn.PendingOp"),
  ("src/lib/webauthn/pending-op-paths.ts", "ArkWallet.WebAuthn.PendingOpPaths"),
  ("src/lib/webauthn/hardware-guard.ts", "ArkWallet.WebAuthn.HardwareFresh"),
  ("src/middleware.ts", "ArkWallet.Routes.MiddlewareWallet"),
  ("src/app/api/**/route.ts", "ArkWallet.Routes.RouteId"),
]

end ArkWallet.Refinement.TSIndex
