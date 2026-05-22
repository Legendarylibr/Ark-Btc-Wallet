namespace ArkWallet.Crypto

/-- Ed25519 public key length in bytes. -/
def ed25519PubLen : Nat := 32

/-- Minimum base64 signature length check in verify paths. -/
def minSigB64Length : Nat := 80

/-- Axiom: noble/ed25519 verify soundness (see `Refinement/Obligations.lean`). -/
axiom ed25519Verify : List Nat → List Nat → List Nat → Bool

end ArkWallet.Crypto
