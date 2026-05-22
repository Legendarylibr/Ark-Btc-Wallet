import ArkWallet.Inbound.Loopback
import ArkWallet.WebAuthn.PendingOpPaths

namespace ArkWallet.Inbound

open ArkWallet.WebAuthn

def arkClientHeader : String := "x-ark-client"
def arkClientValue : String := "ark-wallet/1"

structure RequestCtx where
  method : String
  host : Option String
  origin : Option String
  referer : Option String
  secFetchSite : Option String
  secFetchDest : Option String
  pathname : String
  arkClient : Option String
  allowRemoteHost : Bool := false
  strictFetchSite : Bool := false

inductive GateResult
  | allow
  | deny (status : Nat)
  deriving BEq, Repr

def mutationMethod (method : String) : Bool :=
  method == "POST" || method == "PUT" || method == "PATCH" || method == "DELETE"

def assertAllowedMethod (ctx : RequestCtx) : GateResult :=
  if ctx.method == "TRACE" || ctx.method == "TRACK" || ctx.method == "CONNECT" then
    .deny 405
  else
    .allow

def assertLocalApiHost (ctx : RequestCtx) : GateResult :=
  if ctx.allowRemoteHost then .allow
  else
    match hostFromRequestHeader ctx.host with
    | none => .deny 403
    | some h => if isLoopbackHostname h then .allow else .deny 403

def assertArkClient (ctx : RequestCtx) : GateResult :=
  if ctx.arkClient == some arkClientValue then .allow else .deny 403

def assertSameSiteFetch (ctx : RequestCtx) : GateResult :=
  if ctx.allowRemoteHost then .allow
  else if !mutationMethod ctx.method then .allow
  else
    match ctx.secFetchSite.map String.toLower with
    | some "cross-site" => .deny 403
    | some site =>
      if site == "same-origin" || site == "same-site" || site == "none" then
        GateResult.allow
      else
        .deny 403
    | none =>
      match ctx.secFetchDest.map String.toLower with
      | some dest =>
        if dest == "document" || dest == "iframe" || dest == "embed" then .deny 403 else .allow
      | none => .allow

def assertStrictFetchSite (ctx : RequestCtx) : GateResult :=
  if !ctx.strictFetchSite || !mutationMethod ctx.method then .allow
  else
    if ctx.secFetchSite.map String.toLower == some "same-origin" then .allow else .deny 403

def assertStrictReadFetchSite (ctx : RequestCtx) : GateResult :=
  if !ctx.strictFetchSite || ctx.method ≠ "GET" then .allow
  else if !isReadProtectedPath ctx.pathname then .allow
  else
    if ctx.secFetchSite.map String.toLower == some "same-origin" then .allow else .deny 403

def assertLocalOrigin (ctx : RequestCtx) : GateResult :=
  if ctx.allowRemoteHost then .allow
  else
    match ctx.origin with
    | some o => if isLoopbackUrl o then .allow else .deny 403
    | none =>
      if ctx.method == "GET" || ctx.method == "HEAD" then .allow
      else
        match ctx.referer with
        | some r => if isLoopbackUrl r then .allow else .deny 403
        | none => .deny 403

/--
  Composition order matches `assertApiSecurity` in `inbound-security.ts`.
-/
def assertApiSecurity (ctx : RequestCtx) : GateResult :=
  match assertAllowedMethod ctx with
  | .deny s => .deny s
  | .allow =>
    match assertLocalApiHost ctx with
    | .deny s => .deny s
    | .allow =>
      match assertArkClient ctx with
      | .deny s => .deny s
      | .allow =>
        match assertSameSiteFetch ctx with
        | .deny s => .deny s
        | .allow =>
          match assertStrictFetchSite ctx with
          | .deny s => .deny s
          | .allow =>
            match assertStrictReadFetchSite ctx with
            | .deny s => .deny s
            | .allow => assertLocalOrigin ctx

end ArkWallet.Inbound
