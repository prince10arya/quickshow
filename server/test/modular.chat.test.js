import assert from 'node:assert/strict';
import test from 'node:test';
import {
  areContiguousSeats,
  CHAT_CONFIG,
  findContiguousSeats,
  formatShowDate,
  formatShowTime,
  getSeatAvailabilityStats,
  getTodayDateString,
} from '../services/chat/index.js';
import { ALL_CHAT_TOOLS } from '../services/chat/tools/index.js';

test('CHAT_CONFIG has valid defaults', () => {
  assert.equal(CHAT_CONFIG.TIME_ZONE, 'Asia/Kolkata');
  assert.equal(CHAT_CONFIG.MAX_TICKETS, 5);
  assert.ok(CHAT_CONFIG.DEFAULT_MODEL);
});

test('ALL_CHAT_TOOLS registers all required tools', () => {
  const toolNames = ALL_CHAT_TOOLS.map((t) => t.name);
  assert.ok(toolNames.includes('list_all_movies'));
  assert.ok(toolNames.includes('list_movies_by_genre'));
  assert.ok(toolNames.includes('get_movie_details'));
  assert.ok(toolNames.includes('search_upcoming_shows'));
  assert.ok(toolNames.includes('check_show_availability'));
  assert.ok(toolNames.includes('suggest_contiguous_seats'));
  assert.ok(toolNames.includes('prepare_booking_summary'));
});

test('seat availability stats calculate correctly', () => {
  const occupied = { A1: true, A2: true, B5: true };
  const stats = getSeatAvailabilityStats(occupied);
  assert.equal(stats.totalSeats, 90);
  assert.equal(stats.occupiedCount, 3);
  assert.equal(stats.availableCount, 87);
  assert.equal(stats.isHouseFull, false);
});

test('date formatting generates valid YYYY-MM-DD', () => {
  const today = getTodayDateString();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
});

test('CHAT_CONFIG configures default model', () => {
  assert.equal(CHAT_CONFIG.DEFAULT_MODEL, 'gemma4:latest');
});

test('createBookingConciergeAgent configures Ollama when useOllama is true', async () => {
  const { createBookingConciergeAgent } = await import('../services/chat/agent/agent.factory.js');
  const agent = await createBookingConciergeAgent({ useOllama: true, modelName: 'gemma4:latest' });
  assert.equal(agent.provider, 'ollama');
  assert.equal(agent.modelName, 'gemma4:latest');
});

test('createBookingConciergeAgent configures NVIDIA model when useOllama is false', async () => {
  const { createBookingConciergeAgent } = await import('../services/chat/agent/agent.factory.js');
  const { closeMcpClient } = await import('../services/chat/agent/mcpClient.js');
  const origKey = process.env.NVIDIA_API_KEY;
  process.env.NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || 'test-key';
  try {
    const agent = await createBookingConciergeAgent({ useOllama: false });
    assert.equal(agent.provider, 'nvidia');
    assert.ok(agent.modelName.includes('deepseek') || agent.modelName === 'deepseek-ai/deepseek-v4.1-flash');
  } finally {
    process.env.NVIDIA_API_KEY = origKey;
    await closeMcpClient();
  }
});


