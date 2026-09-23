import { ChatOllama } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import { CHAT_CONFIG } from '../config/chat.config.js';
import { buildSystemPrompt } from '../prompts/systemPrompt.js';
import { getMcpChatTools } from './mcpClient.js';

export const createBookingConciergeAgent = async ({ modelName = CHAT_CONFIG.DEFAULT_MODEL } = {}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isOllama =
    process.env.CHAT_PROVIDER === 'ollama' ||
    process.env.USE_OLLAMA === 'true' ||
    modelName?.startsWith('gemma4') ||
    modelName?.includes('ollama') ||
    (isDevelopment && (process.env.CHAT_MODEL === 'gemma4:latest' || !process.env.OPENROUTER_API_KEY));

  let model;

  if (isOllama) {
    const ollamaModelName = modelName?.startsWith('gemma4') ? modelName : process.env.OLLAMA_MODEL || 'gemma4:latest';
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    console.log(`[Server:Agent] 🦙 Initializing ChatOllama (${ollamaModelName} at ${baseUrl})`);
    model = new ChatOllama({
      model: ollamaModelName,
      baseUrl,
      temperature: CHAT_CONFIG.TEMPERATURE,
    });
  } else {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;
    if (!apiKey) {
      const error = new Error('The booking assistant is not configured (missing OPENROUTER_API_KEY).');
      error.code = 'ASSISTANT_UNAVAILABLE';
      throw error;
    }

    console.log(`[Server:Agent] 🌐 Initializing OpenRouter model (${modelName})`);
    model = new ChatOpenAI({
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
  }

  const tools = await getMcpChatTools();

  return createAgent({
    model,
    tools,
    systemPrompt: buildSystemPrompt(),
  });
};

