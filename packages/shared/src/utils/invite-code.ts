// Excludes I/O/0/1 for readability on job sites (speakable, glove-friendly)
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
  let code = "";
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  for (const byte of array) {
    code += CHARSET.charAt(byte % CHARSET.length);
  }
  return code;
}

export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().trim();
}
