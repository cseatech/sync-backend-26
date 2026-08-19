/**
 * Creates and throws an HTTP-aware error for use in service layers.
 *
 * @param message - Error message
 * @param statusCode - HTTP status code
 */
function throwError(
  message: string,
  statusCode: number
): never {
  const error = new Error(message);
  error.statusCode = statusCode;

  throw error;
}

export {
  throwError,
};