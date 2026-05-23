namespace ArkWallet.Security

/-- Ed25519 signing and SDK WASM ops require a top-level frame (mirrors `execution-context.ts`). -/
def signingPermitted (embedded : Bool) : Bool :=
  !embedded

end ArkWallet.Security
