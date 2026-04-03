const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateId(prefix: string, length = 21): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let id = "";
  for (const byte of array) {
    id += CHARS.charAt(byte % CHARS.length);
  }
  return `${prefix}_${id}`;
}
