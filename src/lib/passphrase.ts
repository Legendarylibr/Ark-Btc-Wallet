const WEAK = new Set([
  "password123",
  "password1234",
  "passphrase1",
  "passphrase12",
  "123456789012",
  "1234567890123",
  "walletpass1",
  "walletpass12",
  "arkwallet123",
  "qwertyuiop12",
  "abcdefghijkl",
  "correcthorse",
]);

export function validatePassphrase(passphrase: string): string | null {
  if (passphrase.length < 12) {
    return "Use at least 12 characters";
  }
  if (passphrase.length > 128) {
    return "Passphrase too long";
  }
  const lower = passphrase.toLowerCase();
  if (WEAK.has(lower)) {
    return "Choose a stronger passphrase";
  }
  if (/^(.)\1{7,}$/.test(passphrase)) {
    return "Avoid repeated characters";
  }
  if (!/[a-z]/.test(passphrase) || !/[0-9]/.test(passphrase)) {
    return "Include at least one letter and one number";
  }
  return null;
}
