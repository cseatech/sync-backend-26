/**
 * Creates and throws an HTTP-aware error for use in service layers.
 *
 * @param {string} message    
 * @param {number} statusCode 
 */
function throwError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

module.exports = { throwError };
