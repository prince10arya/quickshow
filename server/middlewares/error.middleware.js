import { AppError } from '../errors/appError.js';

export const notFoundHandler = (req, res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
};

export const globalErrorHandler = (err, req, res, _next) => {
  let error = err;

  // If error is not an instance of AppError, convert known patterns
  if (!(error instanceof AppError)) {
    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
      error = new AppError(`Invalid ${err.path}: ${err.value}`, 400, 'INVALID_ID');
    }
    // Mongoose duplicate key
    else if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'field';
      error = new AppError(`Duplicate value for ${field}. Please use another value.`, 409, 'DUPLICATE_KEY');
    }
    // Mongoose validation error
    else if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors || {}).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      error = new AppError('Database validation failed', 400, 'DB_VALIDATION_ERROR', errors);
    }
    // JWT errors
    else if (err.name === 'JsonWebTokenError') {
      error = new AppError('Invalid authentication token', 401, 'INVALID_TOKEN');
    } else if (err.name === 'TokenExpiredError') {
      error = new AppError('Authentication token has expired', 401, 'TOKEN_EXPIRED');
    }
    // Generic fallback
    else {
      const statusCode = err.statusCode || err.status || 500;
      const message = err.message || 'Internal Server Error';
      error = new AppError(message, statusCode, err.code || 'INTERNAL_ERROR');
    }
  }

  const statusCode = error.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';

  // Log non-operational (unexpected) errors
  if (!error.isOperational) {
    console.error('UNEXPECTED SERVER ERROR:', err);
  }

  res.status(statusCode).json({
    success: false,
    message: error.message,
    code: error.code || 'ERROR',
    ...(error.details ? { errors: error.details } : {}),
    ...(isDev && !error.isOperational ? { stack: err.stack } : {}),
  });
};
