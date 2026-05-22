namespace ArkWallet.Inbound

def loopbackHosts : List String :=
  ["127.0.0.1", "localhost", "::1", "[::1]"]

def isLoopbackHostname (hostname : String) : Bool :=
  loopbackHosts.contains (hostname.toLower)

def hostFromRequestHeader (hostHeader : Option String) : Option String :=
  hostHeader.map fun h =>
    (h.splitOn ":").head!.toLower

/-- Simplified URL hostname check (mirrors `isLoopbackUrl`). -/
def isLoopbackUrl (url : String) : Bool :=
  if url.startsWith "http://127.0.0.1" then true
  else if url.startsWith "http://localhost" then true
  else if url.startsWith "http://[::1]" then true
  else false

end ArkWallet.Inbound
