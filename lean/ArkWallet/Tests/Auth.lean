import ArkWallet.Prelude.Time
import ArkWallet.Crypto.ChallengeMessages
import ArkWallet.FvFixtures

namespace ArkWallet.Tests.Auth

open ArkWallet.Prelude
open ArkWallet.Crypto
open ArkWallet.FvFixtures

example :
    challengeMessage challengeMsg0_challenge = challengeMsg0_register_expected := by
  native_decide

example :
    webauthnSetupMessage challengeMsg0_challenge = challengeMsg0_setup_expected := by
  native_decide

example :
    isTimestampValid timestamp0_now timestamp0_ts = timestamp0_expected := by
  native_decide

example :
    isTimestampValid timestamp1_now timestamp1_ts = timestamp1_expected := by
  native_decide

example :
    isTimestampValid timestamp2_now timestamp2_ts = timestamp2_expected := by
  native_decide

end ArkWallet.Tests.Auth
