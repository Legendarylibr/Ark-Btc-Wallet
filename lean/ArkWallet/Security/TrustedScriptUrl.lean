namespace ArkWallet.Security

/-- Mirrors `trustedScriptUrlAllowed` in `trusted-script-url.ts`. -/
def trustedScriptUrlAllowed (origin url : String) : Bool :=
  url.startsWith "/" || url.startsWith (origin ++ "/")

end ArkWallet.Security
