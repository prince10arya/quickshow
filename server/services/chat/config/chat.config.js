export const CHAT_CONFIG = {
  TIME_ZONE: process.env.CHAT_TIME_ZONE || 'Asia/Kolkata',
  MONTHLY_BUDGET_USD: Number(process.env.CHAT_MONTHLY_BUDGET_USD || 10),
  REQUEST_RESERVE_USD: Number(process.env.CHAT_REQUEST_RESERVE_USD || 0.01),
  INPUT_USD_PER_MILLION: Number(process.env.CHAT_INPUT_USD_PER_MILLION || 0.075),
  OUTPUT_USD_PER_MILLION: Number(process.env.CHAT_OUTPUT_USD_PER_MILLION || 0.3),
  MAX_TICKETS: 5,
  MAX_HISTORY: 14,
  DEFAULT_MODEL: process.env.CHAT_MODEL || 'openai/gpt-oss-20b',
  TEMPERATURE: 0.2,
};
