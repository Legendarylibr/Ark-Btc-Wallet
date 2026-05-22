import { NextRequest, NextResponse } from "next/server";
import { MAX_API_BODY_BYTES } from "./constants";

export function assertBodyWithinLimit(
  contentLengthHeader: string | null,
  bodyLength: number,
): NextResponse | null {
  if (contentLengthHeader) {
    const declared = Number(contentLengthHeader);
    if (Number.isFinite(declared) && declared > MAX_API_BODY_BYTES) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }
  }
  if (bodyLength > MAX_API_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }
  return null;
}

/** Read body with a hard size cap (DoS protection on JSON routes). */
export async function readLimitedBody(
  request: NextRequest,
): Promise<{ ok: true; text: string } | { ok: false; response: NextResponse }> {
  const lenHeader = request.headers.get("content-length");
  const pre = assertBodyWithinLimit(lenHeader, 0);
  if (pre) return { ok: false, response: pre };

  const text = await request.text();
  const post = assertBodyWithinLimit(lenHeader, text.length);
  if (post) return { ok: false, response: post };

  return { ok: true, text };
}
