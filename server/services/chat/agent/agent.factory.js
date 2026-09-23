import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import { CHAT_CONFIG } from '../config/chat.config.js';
import { buildSystemPrompt } from '../prompts/systemPrompt.js';
import { getMcpChatTools } from './mcpClient.js';

export const createBookingConciergeAgent = async ({ modelName = CHAT_CONFIG.DEFAULT_MODEL } = {}) => {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    const error = new Error('The booking assistant is not configured (missing OPENROUTER_API_KEY).');
    error.code = 'ASSISTANT_UNAVAILABLE';
    throw error;
  }

  const model = new ChatOpenAI({
    model: modelName,
    temperature: CHAT_CONFIG.TEMPERATURE,
    maxTokens: 600,
    apiKey,
    configuration: {
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
        'X-Title': 'QuickShow Movie Concierge',
      },
    },
  });

  const tools = await getMcpChatTools();

  return createAgent({
    model,
    tools,
    systemPrompt: buildSystemPrompt(),
  });
};

