namespace ArkWallet.Auth

structure SetupTokenEntry where
  publicKeyB64 : String
  fingerprint : String
  exp : Nat

structure SetupTokenStore where
  tokens : List (String × SetupTokenEntry)
  deriving Inhabited

def SetupTokenStore.get (store : SetupTokenStore) (id : String) : Option SetupTokenEntry :=
  (store.tokens.find? fun (tid, _) => tid == id).map (·.2)

def validateSetupToken (store : SetupTokenStore) (token fingerprint : String) (now : Nat) :
    Option String :=
  match store.get token with
  | none => none
  | some e =>
    if e.fingerprint ≠ fingerprint || now > e.exp then none
    else some e.publicKeyB64

def consumeSetupToken (store : SetupTokenStore) (token fingerprint : String) (now : Nat) :
    Option (SetupTokenStore × String) :=
  match validateSetupToken store token fingerprint now with
  | none => none
  | some pk =>
    some ({ tokens := store.tokens.filter fun (tid, _) => tid ≠ token }, pk)

end ArkWallet.Auth
