import { body } from 'express-validator';
import { validate } from '../middlewares/validate.middleware.js';

export const validateUpdateFavourite = validate([
  body('movieId')
    .trim()
    .notEmpty()
    .withMessage('Movie ID is required in request body.'),
]);
