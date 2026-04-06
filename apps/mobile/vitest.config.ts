import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "mobile",
    environment: "node",
    include: [
      "stores/**/*.test.ts",
      "hooks/**/*.test.ts",
      "lib/**/*.test.ts",
    ],
  },
});
