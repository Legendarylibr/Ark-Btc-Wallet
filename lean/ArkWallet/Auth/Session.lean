import ArkWallet.Prelude.Time
import ArkWallet.Crypto.Nonce

namespace ArkWallet.Auth

open ArkWallet.Prelude
open ArkWallet.Crypto

structure WalletSession where
  id : String
  publicKeyB64 : String
  barkFingerprint : Option String
  clientBinding : Option String
  createdAt : Nat
  lastSeenAt : Nat
  lastHardwareAt : Option Nat
  deriving Inhabited

structure SessionStore where
  sessions : List (String × WalletSession)
  deriving Inhabited

def SessionStore.find (store : SessionStore) (id : String) : Option WalletSession :=
  (store.sessions.find? fun (sid, _) => sid == id).map (·.2)

def getSession (store : SessionStore) (id : String) (now : Nat) : Option WalletSession :=
  match store.find id with
  | none => none
  | some s =>
    if sessionExpiredByTtl now s.createdAt then none
    else if sessionExpiredByIdle now s.lastSeenAt then none
    else some s

def createSession (store : SessionStore) (id publicKeyB64 : String)
    (barkFingerprint clientBinding : Option String) (now : Nat) : SessionStore × WalletSession :=
  let s : WalletSession := {
    id := id
    publicKeyB64 := publicKeyB64
    barkFingerprint := barkFingerprint
    clientBinding := clientBinding
    createdAt := now
    lastSeenAt := now
    lastHardwareAt := some now
  }
  ({ sessions := (id, s) :: store.sessions }, s)

def destroySession (store : SessionStore) (id : String) : SessionStore :=
  { sessions := store.sessions.filter fun (sid, _) => sid ≠ id }

def touchSession (store : SessionStore) (id : String) (now : Nat) : SessionStore :=
  { sessions := store.sessions.map fun (sid, s) =>
      if sid == id then (sid, { s with lastSeenAt := now }) else (sid, s) }

def isValidSessionId (id : String) : Bool :=
  isValidNonceUuid id

end ArkWallet.Auth
