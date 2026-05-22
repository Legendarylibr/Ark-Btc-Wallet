import ArkWallet.Auth.VerifyRequest
import ArkWallet.Auth.Session
import ArkWallet.Crypto.NonceStore
import ArkWallet.FvFixtures

namespace ArkWallet.Tests.Verify

open ArkWallet.Auth
open ArkWallet.Crypto
open ArkWallet.FvFixtures

def longSig : String :=
  String.mk (List.replicate 80 'x')

example :
    let store :=
      (createSession default "a1b2c3d4-e5f6-4789-a012-3456789abcde" "pk" none (some "abc")
        1700000000000).1
    (runSessionVerify
      store
      default
      {
        now := 1700000000000
        sessionId := some "a1b2c3d4-e5f6-4789-a012-3456789abcde"
        binding := "abc"
        method := "POST"
        pathname := "/api/wallet/balance"
        search := ""
        bodyText := hashBody0_input
        headers := {
          timestamp := "1700000000000"
          nonce := "b2c3d4e5-f6a7-4890-b123-456789abcdef"
          signatureB64 := longSig
          bodyHashHeader := hashBody0_expected
          publicKeyB64 := "pk"
        }
        sigValid := true
      }).1 == .ok := by
  native_decide

example :
    let store := (createSession default "sess" "pk" none (some "bind1") 1000).1
    (runSessionVerify
      store
      default
      {
        now := 1000
        sessionId := some "sess"
        binding := "bind2"
        method := "GET"
        pathname := "/api/wallet/balance"
        search := ""
        bodyText := ""
        headers := {
          timestamp := "1000"
          nonce := "a1b2c3d4-e5f6-4789-a012-3456789abcde"
          signatureB64 := longSig
          bodyHashHeader := "ignored"
          publicKeyB64 := "pk"
        }
        sigValid := true
      }).1 == .bindingMismatch := by
  native_decide

end ArkWallet.Tests.Verify
