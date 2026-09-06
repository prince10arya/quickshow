import { ChatGroq } from '@langchain/groq';
import { createAgent } from 'langchain';
import { CHAT_CONFIG } from '../config/chat.config.js';
import { buildSystemPrompt } from '../prompts/systemPrompt.js';
import { ALL_CHAT_TOOLS } from '../tools/index.js';

export const createBookingConciergeAgent = ({ modelName = CHAT_CONFIG.DEFAULT_MODEL } = {}) => {
  if (!process.env.GROQ_API_KEY) {
    const error = new Error('The booking assistant is not configured (missing GROQ_API_KEY).');
    error.code = 'ASSISTANT_UNAVAILABLE';
    throw error;
  }

  const model = new ChatGroq({
    model: modelName,
    temperature: CHAT_CONFIG.TEMPERATURE,
    maxTokens: 600,
    maxRetries: 2,
  });

  return createAgent({
    model,
    tools: ALL_CHAT_TOOLS,
    systemPrompt: buildSystemPrompt(),
  });
};
