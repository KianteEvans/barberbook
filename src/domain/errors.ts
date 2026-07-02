/**
 * Typed application errors. Server actions catch these and surface the message
 * to the form; anything else is logged and shown as a generic failure.
 */

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {}
export class UnauthorizedError extends AppError {
  constructor(message = "You must be signed in.") {
    super(message);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to that.") {
    super(message);
  }
}
export class NotFoundError extends AppError {}
export class ConflictError extends AppError {}

/** Map an unknown error to a user-facing message (AppError) or a generic one. */
export function toActionError(err: unknown): string {
  if (err instanceof AppError) return err.message;
  console.error("[action] unexpected error:", err);
  return "Something went wrong. Please try again.";
}
