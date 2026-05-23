import ArkWallet.FvFixtures

namespace ArkWallet.Security

def cspContainsAll (csp : String) (markers : List String) : Bool :=
  markers.all fun m => (csp.splitOn m).length > 1

def pageCspMarkers : List String := [
  "script-src-attr 'none'",
  "require-trusted-types-for 'script'",
  "trusted-types ark-wallet",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "worker-src 'none'",
  "child-src 'none'",
  "object-src 'none'",
  "'strict-dynamic'",
]

def apiCspMarkers : List String := [
  "default-src 'none'",
  "script-src 'none'",
  "script-src-attr 'none'",
  "frame-ancestors 'none'",
]

def pageCspMeetsHardening (csp : String) : Bool :=
  cspContainsAll csp pageCspMarkers

def apiCspMeetsHardening (csp : String) : Bool :=
  cspContainsAll csp apiCspMarkers

/-- Page CSP must not allow `unsafe-inline` in the primary `script-src` directive. -/
def pageScriptSrcNoUnsafeInline (csp : String) : Bool :=
  match csp.splitOn "script-src " with
  | _ :: seg :: _ =>
    let first := (seg.splitOn ";").head?.getD seg
    (first.splitOn "unsafe-inline").length ≤ 1
  | _ => true

end ArkWallet.Security
