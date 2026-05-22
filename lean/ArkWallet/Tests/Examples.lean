import ArkWallet.Crypto.Canonical
import ArkWallet.Crypto.Nonce
import ArkWallet.Crypto.NonceStore
import ArkWallet.FvFixtures

namespace ArkWallet.Tests

open ArkWallet.Crypto
open ArkWallet.FvFixtures

/-- Refinement: `signingPath` (from `tests/unit/crypto.test.ts`). -/
example :
    signingPath signingPath0_pathname signingPath0_search = signingPath0_expected := by
  native_decide

example :
    signingPath signingPath1_pathname signingPath1_search = signingPath1_expected := by
  native_decide

example :
    signingPath signingPath2_pathname signingPath2_search = signingPath2_expected := by
  native_decide

example :
    signingPath signingPath3_pathname signingPath3_search = signingPath3_expected := by
  native_decide

example :
    signingPath signingPath0_pathname signingPath0_search =
      signingPath signingPath1_pathname signingPath1_search := by
  native_decide

example :
    signingPath signingPath2_pathname signingPath2_search ≠
      signingPath signingPath3_pathname signingPath3_search := by
  native_decide

/-- Refinement: `hashBody` fixtures (axioms until SHA-256 in Lean). -/
example : hashBody hashBody0_input = hashBody0_expected := rfl
example : hashBody hashBody1_input = hashBody1_expected := rfl

/-- Refinement: `canonicalRequest` v2 payload. -/
example :
    canonicalRequestText {
      method := canonical0_method
      path := canonical0_path
      timestamp := canonical0_timestamp
      nonce := canonical0_nonce
      bodyHash := canonical0_bodyHash
    } = canonical0_text_expected := by
  native_decide

/-- Refinement: `isValidNonceUuid`. -/
example : isValidNonceUuid nonce0_input = nonce0_valid_expected := by native_decide
example : isValidNonceUuid nonce1_input = nonce1_valid_expected := by native_decide
example : isValidNonceUuid nonce2_input = nonce2_valid_expected := by native_decide

/-- **P0-1** instance: first claim succeeds, second is replay. -/
example :
    (claimNonce default "session" "a1b2c3d4-e5f6-4789-a012-3456789abcde").isSome = true := by
  native_decide

example :
    (claimNonce
        (claimNonce default "session" "a1b2c3d4-e5f6-4789-a012-3456789abcde").get!
        "session"
        "a1b2c3d4-e5f6-4789-a012-3456789abcde").isNone = true := by
  native_decide

end ArkWallet.Tests
