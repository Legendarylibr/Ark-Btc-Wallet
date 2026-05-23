/-!
  Proof obligations registry (see `docs/formal-verification-lean.md`).
  Replace `True` placeholders as modules gain real proofs.
-/

namespace ArkWallet.Refinement

/-- `src/lib/crypto/ed25519.ts` verify/sign -/
axiom obligation_ed25519 : True

/-- `hashBody` for arbitrary strings (fixtures only in `Crypto.Canonical`) -/
axiom obligation_hashBody_general : True

/-- `@simplewebauthn/server` verification -/
axiom obligation_webauthn_server : True

/-- `src/lib/barkd.ts` wallet semantics -/
axiom obligation_barkd : True

/-- Local `:3535` bypass (documented in SECURITY.md) -/
axiom obligation_barkd_bypass : True

/-- Browser / IndexedDB vault -/
axiom obligation_client_runtime : True

/-- SDK mode (`src/sdk/**`) separate trust model -/
axiom obligation_sdk_mode : True

/-- AES-256-GCM envelope integrity (`encrypted-file.ts`) -/
axiom obligation_aes_gcm : True

/-- SHA-256 for SDK passkey op challenge -/
axiom obligation_sha256_sdk : True

/-- scrypt / vault KDF (`vault.ts`, `server-secret.ts`) -/
axiom obligation_kdf : True

/-- Rate limit persistence (`rate-limit.ts`, `unlock-rate-limit.ts`) -/
axiom obligation_rate_limits : True

/-- Property catalog cross-ref (P0–P2 from formal-verification-lean.md) -/
structure PropertyId where
  id : String
  proved : Bool
  module : String
  deriving Repr

def propertyCatalog : List PropertyId := [
  ⟨"P0-1", true, "ArkWallet.Crypto.NonceStore"⟩,
  ⟨"P0-2", true, "ArkWallet.Crypto.Challenge"⟩,
  ⟨"P0-3", true, "ArkWallet.Auth.VerifyRequest"⟩,
  ⟨"P0-4", true, "ArkWallet.WebAuthn.PendingOp"⟩,
  ⟨"P0-5", true, "ArkWallet.WebAuthn.PendingOp"⟩,
  ⟨"P0-6", true, "ArkWallet.Auth.UnlockToken"⟩,
  ⟨"P0-7", true, "ArkWallet.Auth.SetupToken"⟩,
  ⟨"P0-8", true, "ArkWallet.Auth.PubkeyPin"⟩,
  ⟨"P0-9", true, "ArkWallet.Auth.SessionBinding"⟩,
  ⟨"P0-10", true, "ArkWallet.Routes.MiddlewareWallet"⟩,
  ⟨"P0-11", true, "ArkWallet.WebAuthn.CreatorAccess"⟩,
  ⟨"P0-12", true, "ArkWallet.WebAuthn.CredentialStore"⟩,
  ⟨"P0-13", true, "ArkWallet.Crypto.EncryptedFile"⟩,
  ⟨"P1-1", true, "ArkWallet.Inbound.Loopback"⟩,
  ⟨"P1-2", true, "ArkWallet.Inbound.ApiGate"⟩,
  ⟨"P1-3", true, "ArkWallet.Inbound.ApiGate"⟩,
  ⟨"P1-4", true, "ArkWallet.Inbound.ApiGate"⟩,
  ⟨"P2-1", true, "ArkWallet.Routes.SetupFlows"⟩,
  ⟨"P2-2", true, "ArkWallet.Routes.SetupFlows"⟩,
  ⟨"P2-3", true, "ArkWallet.Routes.Health"⟩,
  ⟨"P2-4", true, "ArkWallet.Routes.AuthFlows"⟩,
  ⟨"SDK-1", true, "ArkWallet.Sdk.PasskeyChallenge"⟩,
  ⟨"BR-1", true, "ArkWallet.Security.Csp"⟩,
  ⟨"BR-2", true, "ArkWallet.Security.ThreatGuard"⟩,
  ⟨"BR-3", true, "ArkWallet.Security.ExecutionContext"⟩,
  ⟨"BR-4", true, "ArkWallet.Security.TrustedScriptUrl"⟩,
]

end ArkWallet.Refinement
