/** Trusted Types API (not yet in all TS lib.dom versions). */

interface ArkTrustedTypePolicy {
  createHTML(input: string): string;
  createScript(input: string): string;
  createScriptURL(input: string): string;
}

interface ArkTrustedTypePolicyFactory {
  createPolicy(
    name: string,
    rules: {
      createHTML?: (input: string, ...args: unknown[]) => string;
      createScript?: (input: string, ...args: unknown[]) => string;
      createScriptURL?: (input: string, ...args: unknown[]) => string;
    },
  ): ArkTrustedTypePolicy | null;
  getPolicy(name: string): ArkTrustedTypePolicy | null;
}

interface Window {
  trustedTypes?: ArkTrustedTypePolicyFactory;
}
