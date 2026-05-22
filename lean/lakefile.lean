import Lake
open Lake DSL

package «ark-wallet-fv» where
  leanOptions := #[
    ⟨`autoImplicit, false⟩
  ]

@[default_target]
lean_lib ArkWallet where
  roots := #[`ArkWallet]
