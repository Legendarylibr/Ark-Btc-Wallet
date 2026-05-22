import ArkWallet.Crypto.Nonce

namespace ArkWallet.Auth

open ArkWallet.Crypto

structure UnlockTokenStore where
  /-- token id → client binding hash -/
  bindings : List (String × String)
  active : List String
  deriving Inhabited

def issueUnlockToken (store : UnlockTokenStore) (token binding : String) : UnlockTokenStore :=
  { bindings := (token, binding) :: store.bindings
    active := token :: store.active }

def consumeUnlockAttemptToken (store : UnlockTokenStore) (token binding : String) : Option UnlockTokenStore :=
  if !isValidNonceUuid token then
    none
  else
    match store.bindings.find? fun (t, _) => t == token with
    | none => none
    | some (_, b) =>
      if b ≠ binding then
        none
      else if !store.active.contains token then
        none
      else
        some {
          bindings := store.bindings.filter fun (t, _) => t ≠ token
          active := store.active.filter fun t => t ≠ token
        }

end ArkWallet.Auth
