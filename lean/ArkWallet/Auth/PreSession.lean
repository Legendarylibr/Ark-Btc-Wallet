import ArkWallet.Prelude.Time
import ArkWallet.Crypto.Canonical
import ArkWallet.Crypto.Ed25519
import ArkWallet.Crypto.Nonce
import ArkWallet.Crypto.NonceStore
import ArkWallet.Auth.VerifyRequest

namespace ArkWallet.Auth

open ArkWallet.Prelude
open ArkWallet.Crypto

def preSessionNonceScope (publicKeyB64 : String) : String :=
  "pre-session:" ++ publicKeyB64

inductive PreSessionVerifyResult
  | ok
  | missingHeaders
  | invalidNonce
  | invalidTimestamp
  | bodyHashMismatch
  | invalidPubkey
  | invalidSignature
  | replay

structure PreSessionVerifyInput where
  now : Nat
  publicKeyB64 : String
  method : String
  pathname : String
  search : String
  bodyText : String
  headers : SignedHeaders
  sigValid : Bool

def runPreSessionVerify (nonces : NonceStore) (inp : PreSessionVerifyInput) :
    PreSessionVerifyResult × NonceStore :=
  if inp.headers.signatureB64.length < minSigB64Length then
    (.missingHeaders, nonces)
  else if !isValidNonceUuid inp.headers.nonce then
    (.invalidNonce, nonces)
  else
    let ts? := inp.headers.timestamp.toNat?
    match ts? with
    | none => (.invalidTimestamp, nonces)
    | some ts =>
      if !isTimestampValid inp.now ts then
        (.invalidTimestamp, nonces)
      else if hashBody inp.bodyText ≠ inp.headers.bodyHashHeader then
        (.bodyHashMismatch, nonces)
      else if inp.headers.publicKeyB64 ≠ inp.publicKeyB64 then
        (.invalidPubkey, nonces)
      else if !inp.sigValid then
        (.invalidSignature, nonces)
      else
        let scope := preSessionNonceScope inp.publicKeyB64
        match claimNonce nonces scope inp.headers.nonce with
        | none => (.replay, nonces)
        | some nonces' => (.ok, nonces')

end ArkWallet.Auth
