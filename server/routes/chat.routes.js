import { Router } from 'express';

import {
  getChatConversation,
  newChatConversation,
  sendChatMessage,
  streamChatMessage,
} from '../controllers/chat.controller.js';
import { optionalProtect } from '../middlewares/auth.middleware.js';
import { validateChatMessage } from '../validators/chat.validator.js';

const chatRouter = Router();

chatRouter.post('/stream', optionalProtect, validateChatMessage, streamChatMessage);
chatRouter.post('/messages', optionalProtect, validateChatMessage, sendChatMessage);
chatRouter.get('/conversation', optionalProtect, getChatConversation);
chatRouter.post('/new', optionalProtect, newChatConversation);

export default chatRouter;
