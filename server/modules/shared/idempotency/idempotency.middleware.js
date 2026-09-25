import { idempotencyService } from './idempotency.service.js';

/**
 * Express Middleware to handle Idempotency-Key headers on mutation routes.
 */
export const idempotencyMiddleware = (req, res, next) => {
  const key = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

  // If no idempotency key was supplied by the client, proceed normally
  if (!key || typeof key !== 'string' || !key.trim()) {
    return next();
  }

  const cleanKey = key.trim();
  const requestHash = idempotencyService.hashRequest(req.method, req.originalUrl || req.path, req.body);

  const acquisition = idempotencyService.acquire(cleanKey, requestHash);

  if (acquisition.status === 'CACHED') {
    res.setHeader('X-Cache-Lookup', 'HIT-IDEMPOTENT');
    return res.status(acquisition.record.responseStatus).json(acquisition.record.responseBody);
  }

  if (acquisition.status === 'IN_PROGRESS') {
    return res.status(409).json({
      success: false,
      code: 'IDEMPOTENCY_IN_PROGRESS',
      message: 'A request with this Idempotency-Key is currently being processed. Please retry shortly.',
    });
  }

  if (acquisition.status === 'HASH_MISMATCH') {
    return res.status(422).json({
      success: false,
      code: 'IDEMPOTENCY_CONFLICT',
      message: 'Idempotency-Key was already used with a different request payload or endpoint.',
    });
  }

  // Intercept response to record result
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const code = res.statusCode || 200;
    if (code >= 200 && code < 300) {
      idempotencyService.complete(cleanKey, code, body);
    } else {
      idempotencyService.abort(cleanKey);
    }
    return originalJson(body);
  };

  next();
};
