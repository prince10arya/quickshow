import mongoose from 'mongoose';
import AiUsage from '../../../models/aiUsage.model.js';
import { CHAT_CONFIG } from '../config/chat.config.js';

const monthKey = () => new Date().toISOString().slice(0, 7);

export const reserveBudget = async () => {
  const month = monthKey();
  // Fast path: if DB is not connected, don't wait for buffering timeout
  if (mongoose.connection.readyState !== 1) {
    return month;
  }

  try {
    const existing = await AiUsage.findOne({ month }).select('_id');
    if (!existing) {
      if (CHAT_CONFIG.REQUEST_RESERVE_USD > CHAT_CONFIG.MONTHLY_BUDGET_USD) {
        const err = new Error('The assistant has reached its monthly usage limit.');
        err.code = 'BUDGET_EXCEEDED';
        throw err;
      }
      try {
        await AiUsage.create({ month, spentUsd: CHAT_CONFIG.REQUEST_RESERVE_USD });
        return month;
      } catch (error) {
        if (error.code === 11000) return reserveBudget();
        throw error;
      }
    }

    const usage = await AiUsage.findOneAndUpdate(
      { month, spentUsd: { $lte: CHAT_CONFIG.MONTHLY_BUDGET_USD - CHAT_CONFIG.REQUEST_RESERVE_USD } },
      { $inc: { spentUsd: CHAT_CONFIG.REQUEST_RESERVE_USD } },
      { new: true }
    );
    if (usage) return month;

    const err = new Error('The assistant has reached its monthly usage limit.');
    err.code = 'BUDGET_EXCEEDED';
    throw err;
  } catch (err) {
    if (err.code === 'BUDGET_EXCEEDED') throw err;
    console.warn('Budget reserve check skipped:', err.message);
    return month;
  }
};

export const settleBudget = async (month, messages = []) => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const usage = messages.reduce(
      (total, message) => ({
        input: total.input + (message.usage_metadata?.input_tokens || 0),
        output: total.output + (message.usage_metadata?.output_tokens || 0),
      }),
      { input: 0, output: 0 }
    );
    const actual =
      (usage.input / 1_000_000) * CHAT_CONFIG.INPUT_USD_PER_MILLION +
      (usage.output / 1_000_000) * CHAT_CONFIG.OUTPUT_USD_PER_MILLION;
    const refund = Math.max(0, CHAT_CONFIG.REQUEST_RESERVE_USD - actual);
    if (refund && month) {
      await AiUsage.updateOne({ month }, { $inc: { spentUsd: -refund } });
    }
  } catch (err) {
    console.warn('Budget settle error (ignored):', err.message);
  }
};
