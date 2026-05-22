namespace ArkWallet.Crypto

/-- In-memory nonce replay map (abstract model of `nonce-store.ts`). -/
structure NonceStore where
  used : List String
  deriving Inhabited

def scopedKey (scope nonce : String) : String :=
  scope ++ "\u0000" ++ nonce

def NonceStore.keyUsed (store : NonceStore) (key : String) : Bool :=
  (store.used.find? fun s => s == key).isSome

def NonceStore.contains (store : NonceStore) (scope nonce : String) : Bool :=
  store.keyUsed (scopedKey scope nonce)

/--
  Record a nonce after signature verification.
  `none` = replay; `some` = newly claimed (mirrors `claimNonce` success/failure).
-/
def claimNonce (store : NonceStore) (scope nonce : String) : Option NonceStore :=
  let key := scopedKey scope nonce
  if store.keyUsed key then
    none
  else
    some { used := key :: store.used }

end ArkWallet.Crypto
