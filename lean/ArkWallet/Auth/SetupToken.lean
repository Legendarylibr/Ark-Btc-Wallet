namespace ArkWallet.Auth

structure SetupTokenEntry where
  publicKeyB64 : String
  fingerprint : String
  exp : Nat
  optionsIssuedAt : Option Nat := none
  deriving Inhabited, DecidableEq, Repr

structure SetupTokenStore where
  tokens : List (String × SetupTokenEntry)
  deriving Inhabited, DecidableEq, Repr

def SetupTokenStore.get (store : SetupTokenStore) (id : String) : Option SetupTokenEntry :=
  (store.tokens.find? fun (tid, _) => tid == id).map (·.2)

def validateSetupToken (store : SetupTokenStore) (token fingerprint : String) (now : Nat) :
    Option String :=
  match store.get token with
  | none => none
  | some e =>
    if e.fingerprint ≠ fingerprint || now > e.exp then none
    else some e.publicKeyB64

def optionsCooldownMs : Nat := 60000

/-- `claimSetupTokenForOptions` — at most once per minute per token. -/
def claimSetupTokenForOptions (store : SetupTokenStore) (token fingerprint : String) (now : Nat) :
    Option (SetupTokenStore × String) :=
  match store.get token with
  | none => none
  | some e =>
    if e.fingerprint ≠ fingerprint || now > e.exp then none
    else
      match e.optionsIssuedAt with
      | some issuedAt =>
        if now - issuedAt < optionsCooldownMs then none
        else
          let updated := { e with optionsIssuedAt := some now }
          some ({
            tokens := (token, updated) :: store.tokens.filter fun (tid, _) => tid ≠ token
          }, e.publicKeyB64)
      | none =>
        let updated := { e with optionsIssuedAt := some now }
        some ({
          tokens := (token, updated) :: store.tokens.filter fun (tid, _) => tid ≠ token
        }, e.publicKeyB64)

def consumeSetupToken (store : SetupTokenStore) (token fingerprint : String) (now : Nat) :
    Option (SetupTokenStore × String) :=
  match validateSetupToken store token fingerprint now with
  | none => none
  | some pk =>
    some ({ tokens := store.tokens.filter fun (tid, _) => tid ≠ token }, pk)

end ArkWallet.Auth
