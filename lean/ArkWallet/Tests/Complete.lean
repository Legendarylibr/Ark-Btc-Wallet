import ArkWallet.Refinement.TSIndex
import ArkWallet.Auth.SetupToken
import ArkWallet.Crypto.FileLock
import ArkWallet.Crypto.EncryptedFile
import ArkWallet.WebAuthn.CredentialStore
import ArkWallet.WebAuthn.CreatorAccess
import ArkWallet.WebAuthn.PendingOp
import ArkWallet.Routes.GuardMatrix
import ArkWallet.Sdk.PasskeyChallenge

namespace ArkWallet.Tests.Complete

open ArkWallet.Auth
open ArkWallet.Crypto
open ArkWallet.Routes
open ArkWallet.WebAuthn
open ArkWallet.Refinement.TSIndex

-- P0-4: pending op consumed once
example : routeCount = 23 := by native_decide

example : allRoutes.length = 22 := by native_decide

example :
    let store := (default : PendingOpStore)
    let store' := createPendingOp store "op1" "fp" .send "hash" "pk" 0 120
    matchesPendingOp store' "op1" "fp" .send "hash" 1 := by native_decide

-- P0-12: monotonic counter
example :
    let c : StoredCredential := { credentialId := "c", publicKey := "p", counter := 5 }
    let store := updateCounter { credentials := [("fp", c)] } "fp" 3
    (store.get "fp").get!.counter = 5 := by native_decide

example :
    let c : StoredCredential := { credentialId := "c", publicKey := "p", counter := 5 }
    let store := updateCounter { credentials := [("fp", c)] } "fp" 8
    (store.get "fp").get!.counter = 8 := by native_decide

-- Setup token options cooldown
example :
    (claimSetupTokenForOptions
      { tokens := [("tok", { publicKeyB64 := "pk", fingerprint := "fp", exp := 100000 })] }
      "tok" "fp" 1000).isSome := by native_decide

example :
    (claimSetupTokenForOptions
      { tokens := [("tok", {
        publicKeyB64 := "pk", fingerprint := "fp", exp := 100000, optionsIssuedAt := some 1000
      })] }
      "tok" "fp" 2000).isNone := by native_decide

-- Creator access denies missing creator
example :
    verifyPendingOpCreatorAccess {
      sessionId := none, sessionStore := default, creatorPublicKeyB64 := none,
      signerPublicKeyB64 := "pk", now := 0
    } = .deny := by native_decide

-- File lock: first acquire succeeds
example : (tryAcquireLock default "f.enc.json").isSome := by native_decide

-- File lock: double acquire on same path fails
example :
    Option.isNone <|
      (tryAcquireLock default "f.enc.json").bind fun acquired =>
        tryAcquireLock acquired "f.enc.json" := by native_decide

-- Guard matrix: auth-options requires creator sig
example : (guardsFor .webauthnAuthOptions).pendingOpCreatorSig = true := by native_decide

end ArkWallet.Tests.Complete
