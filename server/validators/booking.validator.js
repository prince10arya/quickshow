import { body, param } from 'express-validator';
import { validate } from '../middlewares/validate.middleware.js';

export const validateCreateBooking = validate([
  body('showId')
    .trim()
    .notEmpty()
    .withMessage('Show ID is required.')
    .isMongoId()
    .withMessage('Show ID must be a valid MongoDB ObjectId.'),
  body('selectedSeats')
    .isArray({ min: 1, max: 5 })
    .withMessage('You must select between 1 and 5 seats.'),
  body('selectedSeats.*')
    .matches(/^[A-J][1-9]$/)
    .withMessage('Each seat must be in the format row (A-J) and number (1-9), e.g. A4.'),
]);

export const validateGetSeats = validate([
  param('showId')
    .trim()
    .notEmpty()
    .withMessage('Show ID is required.')
    .isMongoId()
    .withMessage('Show ID must be a valid MongoDB ObjectId.'),
]);
