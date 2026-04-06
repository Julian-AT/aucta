// Web Crypto API global -- available in Node.js 19+, Bun, Deno, and browsers.
// Declared here to avoid coupling this package to DOM or @types/node.
declare const crypto: {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
  randomUUID(): string;
};
