import { body, param } from 'express-validator';
import { validate } from '../middlewares/validate.middleware.js';

export const validateGetShow = validate([
  param('movieId')
    .trim()
    .notEmpty()
    .withMessage('Movie ID is required in URL path.'),
]);

export const validateAddShow = validate([
  body('movieId')
    .trim()
    .notEmpty()
    .withMessage('Movie ID is required.'),
  body('showPrice')
    .notEmpty()
    .withMessage('Show price is required.')
    .isFloat({ min: 1 })
    .withMessage('Show price must be a positive number.'),
  body('showsInput')
    .isArray({ min: 1 })
    .withMessage('showsInput must be an array with at least one show date/time definition.'),
  body('showsInput.*.date')
    .notEmpty()
    .withMessage('Show date is required.')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Show date must be in YYYY-MM-DD format.'),
  body('showsInput.*.time')
    .isArray({ min: 1 })
    .withMessage('Show times must be an array of time strings.'),
]);
