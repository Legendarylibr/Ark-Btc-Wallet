/** Reject wallet crypto when the page is embedded or otherwise unsafe to run. */

export class InsecureExecutionContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsecureExecutionContextError";
  }
}

export function isEmbeddedFrame(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** Whether signing / WASM wallet ops are allowed (mirrored in Lean). */
export function signingPermitted(embedded: boolean): boolean {
  return !embedded;
}

export function assertSecureBrowserContext(): void {
  if (typeof window === "undefined") return;
  if (!signingPermitted(isEmbeddedFrame())) {
    throw new InsecureExecutionContextError(
      "Wallet cannot run inside an iframe or embedded frame",
    );
  }
}
