import { Router } from 'express';

import { getChatConversation, newChatConversation, sendChatMessage } from '../controllers/chat.controller.js';
import { optionalProtect, protect } from '../middlewares/auth.middleware.js';

const chatRouter = Router();

chatRouter.post('/messages', optionalProtect, sendChatMessage);
chatRouter.get('/conversation', protect, getChatConversation);
chatRouter.post('/new', protect, newChatConversation);

export default chatRouter;
