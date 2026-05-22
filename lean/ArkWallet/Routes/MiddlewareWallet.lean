import ArkWallet.Auth.Session
import ArkWallet.Crypto.Ed25519
import ArkWallet.Crypto.Nonce

namespace ArkWallet.Routes

open ArkWallet.Auth
open ArkWallet.Crypto

/--
  Wallet API middleware shape (`middleware.ts` `/api/wallet/*`).
  Does not prove session exists server-side — only header/cookie shape.
-/
structure WalletMiddlewareInput where
  sessionId : Option String
  signatureB64 : Option String
  publicKeyB64 : Option String
  timestamp : Option String
  nonce : Option String
  bodyHash : Option String

def walletMiddlewareAllows (inp : WalletMiddlewareInput) : Bool :=
  match inp.sessionId with
  | none => false
  | some sid =>
    isValidSessionId sid &&
    match inp.signatureB64, inp.publicKeyB64, inp.timestamp, inp.nonce, inp.bodyHash with
    | some sig, some pk, some ts, some nonce, some bh =>
      sig.length ≥ minSigB64Length &&
      pk.length > 0 &&
      ts.length > 0 &&
      isValidNonceUuid nonce &&
      bh.length > 0
    | _, _, _, _, _ => false

end ArkWallet.Routes
