import ArkWallet.FvFixtures
import ArkWallet.Security.Csp
import ArkWallet.Security.ExecutionContext
import ArkWallet.Security.ThreatGuard
import ArkWallet.Security.TrustedScriptUrl

namespace ArkWallet.Tests.BrowserSecurity

open ArkWallet.Security
open ArkWallet.FvFixtures

example : pageCspMeetsHardening pageCsp0_text = pageCsp0_hardened_expected := by native_decide
example : apiCspMeetsHardening apiCsp0_text = apiCsp0_hardened_expected := by native_decide
example : pageScriptSrcNoUnsafeInline pageCsp0_text = true := by native_decide

example :
    (trustedScriptUrlAllowed trustedUrl0_origin trustedUrl0_url) =
      trustedUrl0_allowed_expected := by native_decide

example :
    (trustedScriptUrlAllowed trustedUrl1_origin trustedUrl1_url) =
      trustedUrl1_allowed_expected := by native_decide

example :
    (trustedScriptUrlAllowed trustedUrl2_origin trustedUrl2_url) =
      trustedUrl2_allowed_expected := by native_decide

example : signingPermitted signing0_embedded = signing0_permitted_expected := by native_decide
example : signingPermitted signing1_embedded = signing1_permitted_expected := by native_decide

example :
    shouldInvokeLock threat0_signal threat0_cfg = threat0_lock_expected := by native_decide

example :
    shouldInvokeLock threat1_signal threat1_cfg = threat1_lock_expected := by native_decide

example :
    shouldInvokeLock threat2_signal threat2_cfg = threat2_lock_expected := by native_decide

example :
    shouldLockAtRegistration reg0_embedded reg0_secure = reg0_lock_expected := by native_decide

example :
    shouldLockAtRegistration reg1_embedded reg1_secure = reg1_lock_expected := by native_decide

end ArkWallet.Tests.BrowserSecurity
