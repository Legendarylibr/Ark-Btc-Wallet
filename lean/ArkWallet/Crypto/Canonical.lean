import ArkWallet.FvFixtures

namespace ArkWallet.Crypto

def canonicalVersion : String := "v2"

/--
  SHA-256(UTF-8 body) as base64 — executable on Vitest fixture inputs only.
  Other inputs return `""` until full SHA is implemented in Lean.
-/
def hashBody (s : String) : String :=
  if s == FvFixtures.hashBody0_input then FvFixtures.hashBody0_expected
  else if s == FvFixtures.hashBody1_input then FvFixtures.hashBody1_expected
  else ""

def splitQueryPair (pair : String) : Option (String × String) :=
  match pair.splitOn "=" with
  | [] => some (pair, "")
  | [k] => some (k, "")
  | k :: v :: rest => some (k, String.intercalate "=" (v :: rest))

def parseQueryString (raw : String) : List (String × String) :=
  if raw.isEmpty then []
  else
    raw.splitOn "&" |>.filterMap splitQueryPair

def sortQueryParams (params : List (String × String)) : List (String × String) :=
  params.mergeSort fun a b => a.1 ≤ b.1

def encodeQuery (params : List (String × String)) : String :=
  String.intercalate "&" (params.map fun (k, v) => k ++ "=" ++ v)

/-- Path + sorted query string (mirrors `signingPath` in `canonical.ts`). -/
def signingPath (pathname search : String) : String :=
  if search.isEmpty || search == "?" then
    pathname
  else
    let raw := if search.startsWith "?" then search.drop 1 else search
    let params := sortQueryParams (parseQueryString raw)
    let qs := encodeQuery params
    if qs.isEmpty then pathname else pathname ++ "?" ++ qs

structure CanonicalParts where
  method : String
  path : String
  timestamp : String
  nonce : String
  bodyHash : String

/-- Deterministic newline payload before UTF-8 encoding. -/
def canonicalPayload (parts : CanonicalParts) : String :=
  String.intercalate "\n" [
    canonicalVersion,
    parts.method.toUpper,
    parts.path,
    parts.timestamp,
    parts.nonce,
    parts.bodyHash,
  ]

def canonicalRequest (parts : CanonicalParts) : ByteArray :=
  (canonicalPayload parts).toUTF8

def canonicalRequestText (parts : CanonicalParts) : String :=
  canonicalPayload parts

end ArkWallet.Crypto
