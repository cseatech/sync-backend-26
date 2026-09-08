/**
 * Creates and throws an HTTP-aware error for use in service layers.
 *
 * @param message - Error message
 * @param statusCode - HTTP status code
 */
function throwError(message: string, statusCode: number): never {
  const error = new Error(message);
  error.statusCode = statusCode;

  throw error;
}

// Map of PostgreSQL error codes to [statusCode, human-readable message]
const PG_ERROR_MAP: Record<string, [number, string]> = {
  "23505": [409, "A record with this data already exists"],
  "23503": [400, "Referenced record does not exist"],
  "23502": [400, "A required field is missing"],
  "23514": [400, "Data violates a constraint"],
  "40001": [409, "Transaction conflict, please retry"],
  "40P01": [409, "Deadlock detected, please retry"],
};

/**
 * Inspects a raw database error, maps known PostgreSQL error codes
 * to HTTP-aware errors, and re-throws unknown errors unchanged.
 *
 * Usage: wrap every db write in a try/catch and call this in the catch block.
 *
 * @param error - The caught error from a Drizzle / pg operation
 */
function handleDbError(error: unknown): never {
  // DrizzleQueryError wraps the original pg error in `cause`
  const cause = (error as { cause?: { code?: string; detail?: string } })?.cause;
  const pgCode = cause?.code;

  if (pgCode && PG_ERROR_MAP[pgCode]) {
    const [statusCode, defaultMessage] = PG_ERROR_MAP[pgCode];
    // Prefer human readable error mapping to pass up to frontend
    throwError(defaultMessage, statusCode);
  }

  // Unknown DB error — re-throw so the global errorHandler logs and 500s it
  throw error;
}

export { throwError, handleDbError };
