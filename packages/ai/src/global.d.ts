// Bun runtime provides setTimeout globally but lib: ES2024 does not include timer types
declare function setTimeout(callback: (...args: any[]) => void, ms?: number): number;

// Web Crypto API global -- available in Bun, Node.js 19+, Deno, browsers.
// Redeclared here because @aucta/shared's global.d.ts is not visible during ai package compilation.
declare const crypto: {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
  randomUUID(): string;
};
