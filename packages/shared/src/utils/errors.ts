export class ErrorWithCode extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ErrorWithCode";
  }

  static NotFound(message: string) {
    return new ErrorWithCode("NOT_FOUND", message);
  }

  static Forbidden(message: string) {
    return new ErrorWithCode("FORBIDDEN", message);
  }

  static BadRequest(message: string) {
    return new ErrorWithCode("BAD_REQUEST", message);
  }

  static Conflict(message: string) {
    return new ErrorWithCode("CONFLICT", message);
  }
}
