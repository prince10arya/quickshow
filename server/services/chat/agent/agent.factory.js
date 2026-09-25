import { createAgent } from 'langchain';
import { CHAT_CONFIG } from '../config/chat.config.js';
import { buildSystemPrompt } from '../prompts/systemPrompt.js';
import { getMcpChatTools } from './mcpClient.js';

export const createBookingConciergeAgent = async ({
  modelName = CHAT_CONFIG.DEFAULT_MODEL,
  useOllama,
} = {}) => {
  // Flag to invoke Ollama, otherwise NVIDIA model
  const isOllama =
    typeof useOllama === 'boolean'
      ? useOllama
      : process.env.USE_OLLAMA !== undefined
        ? process.env.USE_OLLAMA === 'true'
        : process.env.CHAT_PROVIDER?.toLowerCase() === 'ollama';

  let model;
  let activeModelName;
  const provider = isOllama ? 'ollama' : 'nvidia';

  if (isOllama) {
    const { ChatOllama } = await import('@langchain/ollama');
    const ollamaModelName =
      process.env.OLLAMA_MODEL ||
      (modelName && !modelName.includes('/') ? modelName : 'gemma4:latest');
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    activeModelName = ollamaModelName;

    console.log(`[Server:Agent] 🦙 Invoking Ollama model: "${ollamaModelName}" at ${baseUrl}`);
    model = new ChatOllama({
      model: ollamaModelName,
      baseUrl,
      temperature: CHAT_CONFIG.TEMPERATURE,
    });
  } else {
    const { ChatOpenAI } = await import('@langchain/openai');
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      const error = new Error('The booking assistant is not configured (missing NVIDIA_API_KEY).');
      error.code = 'ASSISTANT_UNAVAILABLE';
      throw error;
    }

    const nvidiaBaseUrl =
      process.env.NVIDIA_BASE_URL ||
      process.env.OPENROUTER_BASE_URL ||
      'https://integrate.api.nvidia.com/v1';

    const nvidiaModelName =
      process.env.NVIDIA_MODEL ||
      (modelName && modelName !== 'gemma4:latest' ? modelName : 'deepseek-ai/deepseek-v4.1-flash');
    activeModelName = nvidiaModelName;

    console.log(`[Server:Agent] 🟢 Invoking NVIDIA model: "${nvidiaModelName}" at ${nvidiaBaseUrl}`);
    model = new ChatOpenAI({
      model: nvidiaModelName,
      temperature: CHAT_CONFIG.TEMPERATURE,
      maxTokens: 1024,
      apiKey,
      configuration: {
        baseURL: nvidiaBaseUrl,
      },
    });
  }

  const tools = await getMcpChatTools();

  const agent = createAgent({
    model,
    tools,
    systemPrompt: buildSystemPrompt(),
  });

  agent.provider = provider;
  agent.modelName = activeModelName;

  return agent;
};

