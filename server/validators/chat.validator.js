import { body } from 'express-validator';
import { validate } from '../middlewares/validate.middleware.js';

export const validateChatMessage = validate([
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required.')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters.'),
  body('conversationId')
    .isMongoId()
    .withMessage('Invalid conversation ID format.'),
  body('guestHistory')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Guest history must be an array with at most 20 items.'),
  body('guestHistory.*.role')
    .optional()
    .isIn(['user', 'assistant'])
    .withMessage('History role must be user or assistant.'),
  body('guestHistory.*.content')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('History message content cannot exceed 2000 characters.'),
]);
