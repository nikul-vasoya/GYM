/**
 * Wraps an async route handler so a rejected promise reaches Express's
 * error pipeline instead of hanging the request.
 *
 * Usage: router.get('/', asyncHandler(controller.list));
 */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
