/**
 * An error that carries an HTTP status code.
 *
 * Throw this anywhere in a controller or service; `errorHandler` turns it
 * into a JSON response. Anything else that reaches the handler is treated
 * as an unexpected 500 and its message is hidden from the client.
 */
export class ApiError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} message Message safe to show the user
   * @param {object} [details] Optional field-level details, e.g. Zod issues
   */
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Invalid mobile number, email or password') {
    return new ApiError(401, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message, details) {
    return new ApiError(409, message, details);
  }
}
