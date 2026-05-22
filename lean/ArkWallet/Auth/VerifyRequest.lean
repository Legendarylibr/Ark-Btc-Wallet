import ArkWallet.Prelude.Time
import ArkWallet.Crypto.Canonical
import ArkWallet.Crypto.Ed25519
import ArkWallet.Crypto.Nonce
import ArkWallet.Crypto.NonceStore
import ArkWallet.Crypto.SecureCompare
import ArkWallet.Auth.Session
import ArkWallet.Auth.SessionBinding

namespace ArkWallet.Auth

open ArkWallet.Prelude
open ArkWallet.Crypto

structure SignedHeaders where
  timestamp : String
  nonce : String
  signatureB64 : String
  bodyHashHeader : String
  publicKeyB64 : String

/--
  Pure control-flow model of `verifySignedRequest` (signature check as `sigValid` input).
  Nonce claim updates `NonceStore`; binding mismatch destroys session.
-/
inductive SessionVerifyResult
  | ok
  | noSession
  | expired
  | bindingMissing
  | bindingMismatch
  | missingHeaders
  | invalidNonce
  | invalidTimestamp
  | bodyHashMismatch
  | pubkeyMismatch
  | invalidSignature
  | replay
  deriving BEq, Repr

structure SessionVerifyInput where
  now : Nat
  sessionId : Option String
  binding : String
  method : String
  pathname : String
  search : String
  bodyText : String
  headers : SignedHeaders
  sigValid : Bool

def runSessionVerify
    (sessions : SessionStore) (nonces : NonceStore)
    (inp : SessionVerifyInput) : SessionVerifyResult × SessionStore × NonceStore :=
  match inp.sessionId with
  | none => (.noSession, sessions, nonces)
  | some sid =>
    match sessions.find sid with
    | none => (.expired, sessions, nonces)
    | some session =>
      match ensureSessionClientBinding session inp.binding with
      | .missing => (.bindingMissing, sessions, nonces)
      | .mismatch =>
        (.bindingMismatch, destroySession sessions sid, nonces)
      | .ok =>
        if inp.headers.signatureB64.length < minSigB64Length then
          (.missingHeaders, sessions, nonces)
        else if !isValidNonceUuid inp.headers.nonce then
          (.invalidNonce, sessions, nonces)
        else
          let ts? := inp.headers.timestamp.toNat?
          match ts? with
          | none => (.invalidTimestamp, sessions, nonces)
          | some ts =>
            if !isTimestampValid inp.now ts then
              (.invalidTimestamp, sessions, nonces)
            else if hashBody inp.bodyText ≠ inp.headers.bodyHashHeader then
              (.bodyHashMismatch, sessions, nonces)
            else if inp.headers.publicKeyB64 ≠ session.publicKeyB64 then
              (.pubkeyMismatch, sessions, nonces)
            else if !inp.sigValid then
              (.invalidSignature, sessions, nonces)
            else
              match claimNonce nonces sid inp.headers.nonce with
              | none => (.replay, sessions, nonces)
              | some nonces' =>
                (.ok, touchSession sessions sid inp.now, nonces')

end ArkWallet.Auth
