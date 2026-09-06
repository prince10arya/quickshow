import { validationResult } from 'express-validator';
import { BadRequestError } from '../errors/appError.js';

export const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    for (const validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      location: err.location,
      value: err.value,
    }));

    return next(new BadRequestError('Validation failed', formattedErrors));
  };
};

export default validate;
