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

end ArkWallet.Refinement
