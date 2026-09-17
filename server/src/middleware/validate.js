import { ApiError } from '../lib/ApiError.js';

/**
 * Validates one part of the request against a Zod schema and REPLACES it
 * with the parsed result, so controllers always receive coerced, trimmed data.
 *
 * Usage: router.post('/login', validate(loginSchema), controller.login)
 *
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} source
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    // Flatten to { fieldName: firstMessage } — the shape the client forms expect.
    const details = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join('.') || source;
      if (!details[field]) details[field] = issue.message;
    }
    return next(ApiError.badRequest('Please correct the highlighted fields', details));
  }

  // Express 5 makes req.query a getter, so assign to a parallel property.
  if (source === 'query') {
    req.validatedQuery = result.data;
  } else {
    req[source] = result.data;
  }

  return next();
};
