import { ApiError } from '../lib/ApiError.js';

/** 404 handler — mounted after every route. */
export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * The only place in the server that formats an error response.
 *
 * Every error leaves as: { error: { message, details? } }
 *
 * Note: `next` is required even though it's unused in most branches —
 * Express identifies error-handling middleware by its 4-argument arity.
 */
export const errorHandler = (err, req, res, next) => {
  // A response already in flight cannot be rewritten — hand off to Express's
  // default handler, which will destroy the socket rather than throw.
  if (res.headersSent) return next(err);

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  // Mongoose duplicate key — surface which field collided.
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'value';
    return res.status(409).json({
      error: { message: `A record with that ${field} already exists` },
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: { message: err.message } });
  }

  // Malformed ObjectId in a URL parameter.
  if (err.name === 'CastError') {
    return res.status(400).json({ error: { message: `Invalid ${err.path}` } });
  }

  // express.json() rejected the body — a client error, not a server fault.
  if (err.type === 'entity.parse.failed' || (err.status === 400 && err.expose)) {
    return res.status(400).json({ error: { message: 'Malformed JSON body' } });
  }

  console.error('[unhandled]', err);
  return res.status(500).json({ error: { message: 'Something went wrong' } });
};
