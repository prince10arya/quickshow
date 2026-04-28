import express from 'express';
import { chatWithAI } from '../controllers/chat.controller.js';

const chatRouter = express.Router();

chatRouter.post('/', chatWithAI);

export default chatRouter;
