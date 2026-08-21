import { Response, NextFunction } from "express";
import { ZodError } from "zod";

/**
 * Central controller error handler.
 *
 * Handles three error classes in order:
 *  1. ZodError    → 400 with the first validation issue message
 *  2. statusCode  → HTTP error thrown by a service layer (throwError)
 *  3. Everything else → passed to Express global error handler
 *
 * @param error - The caught error (unknown)
 * @param res   - Express Response object
 * @param next  - Express NextFunction
 */
function handleControllerError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  // 1. Zod validation error
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message || "Validation failed";

    res.status(400).json({
      success: false,
      message,
    });

    return;
  }

  // 2. HTTP-aware error from the service layer
  if (error instanceof Error && (error as Error & { statusCode?: number }).statusCode) {
    const httpError = error as Error & { statusCode: number };

    res.status(httpError.statusCode).json({
      success: false,
      message: httpError.message,
    });

    return;
  }

  // 3. Unexpected error — let the global errorHandler log and 500 it
  next(error);
}

export { handleControllerError };
