import ArkWallet.Inbound.ApiGate
import ArkWallet.Inbound.Loopback
import ArkWallet.FvFixtures

namespace ArkWallet.Tests.Inbound

open ArkWallet.Inbound
open ArkWallet.FvFixtures

example : isLoopbackHostname loopbackHost0_input = loopbackHost0_expected := by native_decide
example : isLoopbackHostname loopbackHost1_input = loopbackHost1_expected := by native_decide
example : isLoopbackHostname loopbackHost2_input = loopbackHost2_expected := by native_decide

example : hostFromRequestHeader hostHeader0_input = hostHeader0_expected := by native_decide
example : hostFromRequestHeader hostHeader1_input = hostHeader1_expected := by native_decide

example :
    assertApiSecurity {
      method := "GET"
      host := some "127.0.0.1:3000"
      origin := some "http://127.0.0.1:3000"
      referer := none
      secFetchSite := none
      secFetchDest := none
      pathname := "/api/health"
      arkClient := some arkClientValue
    } == .allow := by
  native_decide

example :
    assertApiSecurity {
      method := "POST"
      host := some "192.168.1.1:3000"
      origin := some "http://127.0.0.1:3000"
      referer := none
      secFetchSite := some "same-origin"
      secFetchDest := none
      pathname := "/api/wallet/send"
      arkClient := some arkClientValue
    } == .deny 403 := by
  native_decide

example :
    assertApiSecurity {
      method := "POST"
      host := some "127.0.0.1:3000"
      origin := some "http://127.0.0.1:3000"
      referer := none
      secFetchSite := some "cross-site"
      secFetchDest := none
      pathname := "/api/wallet/send"
      arkClient := some arkClientValue
    } == .deny 403 := by
  native_decide

end ArkWallet.Tests.Inbound
