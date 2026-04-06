import { describe, expect, it } from "vitest";
import { ErrorWithCode } from "./errors.js";

describe("ErrorWithCode", () => {
  it("creates an error with NotFound code and message", () => {
    const error = ErrorWithCode.NotFound("Session not found");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("Session not found");
  });

  it("creates an error with Forbidden code and message", () => {
    const error = ErrorWithCode.Forbidden("Access denied");
    expect(error.code).toBe("FORBIDDEN");
    expect(error.message).toBe("Access denied");
  });

  it("creates an error with BadRequest code and message", () => {
    const error = ErrorWithCode.BadRequest("Invalid input");
    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toBe("Invalid input");
  });

  it("creates an error with Conflict code and message", () => {
    const error = ErrorWithCode.Conflict("Already exists");
    expect(error.code).toBe("CONFLICT");
    expect(error.message).toBe("Already exists");
  });

  it("is an instance of Error", () => {
    const error = ErrorWithCode.NotFound("test");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ErrorWithCode);
  });

  it("has name set to ErrorWithCode", () => {
    const error = ErrorWithCode.BadRequest("test");
    expect(error.name).toBe("ErrorWithCode");
  });

  it("preserves the stack trace", () => {
    const error = ErrorWithCode.NotFound("test");
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("ErrorWithCode");
  });
});
