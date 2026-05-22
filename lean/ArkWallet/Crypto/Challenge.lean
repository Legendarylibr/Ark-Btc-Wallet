namespace ArkWallet.Crypto

/-- Register / setup challenge store (abstract `challenges.ts`). -/
structure ChallengeStore where
  active : List String
  deriving Inhabited

def hasChallenge (store : ChallengeStore) (challenge : String) : Bool :=
  store.active.contains challenge

def issueChallenge (store : ChallengeStore) (challenge : String) : ChallengeStore :=
  if store.active.contains challenge then store
  else { active := challenge :: store.active }

def consumeChallenge (store : ChallengeStore) (challenge : String) : Option ChallengeStore :=
  if hasChallenge store challenge then
    some { active := store.active.filter fun c => c ≠ challenge }
  else
    none

end ArkWallet.Crypto
