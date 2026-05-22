import ArkWallet.Crypto.SecureCompare

namespace ArkWallet.Auth

open ArkWallet.Crypto

structure PinStore where
  pins : List (String × String)
  deriving Inhabited

inductive PinResult
  | okFirst
  | okExisting
  | reject (reason : String)

def PinStore.lookup (store : PinStore) (fingerprint : String) : Option String :=
  (store.pins.find? fun (fp, _) => fp == fingerprint).map (·.2)

/--
  One Ed25519 pubkey per barkd fingerprint (`verifyOrPinPubkey`).
-/
def verifyOrPinPubkey (store : PinStore) (fingerprint publicKeyB64 : String) : PinStore × PinResult :=
  match store.lookup fingerprint with
  | none =>
    ({ pins := (fingerprint, publicKeyB64) :: store.pins }, .okFirst)
  | some existing =>
    if constantTimeEqualString existing publicKeyB64 then
      (store, .okExisting)
    else
      (store, .reject "pubkey mismatch")

def hasAnyPubkeyPin (store : PinStore) : Bool :=
  store.pins ≠ []

def getFingerprintForPubkey (store : PinStore) (publicKeyB64 : String) : Option String :=
  (store.pins.find? fun (_, pk) => constantTimeEqualString pk publicKeyB64).map (·.1)

end ArkWallet.Auth
