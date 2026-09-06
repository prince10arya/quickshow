import { ChatGroq } from '@langchain/groq';
import { createAgent, tool, toolStrategy } from 'langchain';
import mongoose from 'mongoose';
import { z } from 'zod';

import AiUsage from '../../models/aiUsage.model.js';
import Movie from '../../models/movie.model.js';
import Show from '../../models/show.model.js';

const TIME_ZONE = process.env.CHAT_TIME_ZONE || 'Asia/Kolkata';
const MONTHLY_BUDGET_USD = Number(process.env.CHAT_MONTHLY_BUDGET_USD || 10);
const REQUEST_RESERVE_USD = Number(process.env.CHAT_REQUEST_RESERVE_USD || 0.01);
const INPUT_USD_PER_MILLION = Number(process.env.CHAT_INPUT_USD_PER_MILLION || 0.075);
const OUTPUT_USD_PER_MILLION = Number(process.env.CHAT_OUTPUT_USD_PER_MILLION || 0.3);
const MAX_TICKETS = 5;

const SlotName = z.enum(['movie', 'date', 'time', 'ticketCount']);
const AgentResponse = z.object({
  message: z.string().min(1).max(500),
  status: z.enum(['collecting', 'ready']),
  requiredSlots: z.array(SlotName).max(4),
  selection: z
    .object({
      showId: z.string().optional(),
      ticketCount: z.number().int().min(1).max(MAX_TICKETS).optional(),
      seats: z.array(z.string().regex(/^[A-J][1-9]$/)).max(MAX_TICKETS).optional(),
    })
    .optional(),
});

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const formatShowDate = (date) => formatter.format(new Date(date));
export const formatShowTime = (date) => timeFormatter.format(new Date(date));

const seatIds = () =>
  Array.from({ length: 10 }, (_, row) =>
    Array.from({ length: 9 }, (_, index) => `${String.fromCharCode(65 + row)}${index + 1}`)
  );

export const findContiguousSeats = (occupiedSeates = {}, ticketCount) => {
  if (!Number.isInteger(ticketCount) || ticketCount < 1 || ticketCount > MAX_TICKETS) return [];

  for (const row of seatIds()) {
    for (let start = 0; start <= row.length - ticketCount; start += 1) {
      const group = row.slice(start, start + ticketCount);
      if (group.every((seat) => !occupiedSeates[seat])) return group;
    }
  }
  return [];
};

export const areContiguousSeats = (seats) => {
  if (!Array.isArray(seats) || seats.length === 0) return false;
  const sorted = [...seats].sort();
  const row = sorted[0][0];
  return sorted.every((seat, index) => {
    const previous = sorted[index - 1];
    return seat[0] === row && (!previous || Number(seat.slice(1)) === Number(previous.slice(1)) + 1);
  });
};

const toShowOption = (show) => ({
  id: show._id.toString(),
  movieId: show.movie._id.toString(),
  title: show.movie.title,
  startsAt: show.showDateTime,
  date: formatShowDate(show.showDateTime),
  time: formatShowTime(show.showDateTime),
  price: show.showPrice,
});

const searchShows = async ({ query, date }) => {
  const movieFilter = query?.trim()
    ? { title: { $regex: query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
    : {};
  const movies = await Movie.find(movieFilter).select('_id title').limit(10);
  if (!movies.length) return [];

  const shows = await Show.find({
    movie: { $in: movies.map((movie) => movie._id) },
    showDateTime: { $gte: new Date().toISOString() },
  })
    .populate('movie')
    .sort({ showDateTime: 1 })
    .limit(30);

  return shows
    .filter((show) => !date || formatShowDate(show.showDateTime) === date)
    .map(toShowOption);
};

const getSeatSuggestion = async ({ showId, ticketCount }) => {
  if (!mongoose.isValidObjectId(showId)) return { seats: [], message: 'That show is not available.' };
  const show = await Show.findOne({ _id: showId, showDateTime: { $gte: new Date().toISOString() } });
  if (!show) return { seats: [], message: 'That show is no longer available.' };
  const seats = findContiguousSeats(show.occupiedSeates, ticketCount);
  return seats.length
    ? { seats, message: 'Contiguous seats found.' }
    : { seats: [], message: 'No contiguous seats remain for that ticket count.' };
};

const monthKey = () => new Date().toISOString().slice(0, 7);

const reserveBudget = async () => {
  const month = monthKey();
  const existing = await AiUsage.findOne({ month }).select('_id');
  if (!existing) {
    if (REQUEST_RESERVE_USD > MONTHLY_BUDGET_USD) throw new Error('The assistant has reached its monthly usage limit.');
    try {
      await AiUsage.create({ month, spentUsd: REQUEST_RESERVE_USD });
      return month;
    } catch (error) {
      if (error.code === 11000) return reserveBudget();
      throw error;
    }
  }

  const usage = await AiUsage.findOneAndUpdate(
    { month, spentUsd: { $lte: MONTHLY_BUDGET_USD - REQUEST_RESERVE_USD } },
    { $inc: { spentUsd: REQUEST_RESERVE_USD } },
    { new: true }
  );
  if (usage) return month;
  throw new Error('The assistant has reached its monthly usage limit.');
};

const settleBudget = async (month, messages) => {
  const usage = messages.reduce(
    (total, message) => ({
      input: total.input + (message.usage_metadata?.input_tokens || 0),
      output: total.output + (message.usage_metadata?.output_tokens || 0),
    }),
    { input: 0, output: 0 }
  );
  const actual = (usage.input / 1_000_000) * INPUT_USD_PER_MILLION + (usage.output / 1_000_000) * OUTPUT_USD_PER_MILLION;
  const refund = Math.max(0, REQUEST_RESERVE_USD - actual);
  if (refund) await AiUsage.updateOne({ month }, { $inc: { spentUsd: -refund } });
};

const buildSummary = async (selection) => {
  if (!selection?.showId || !selection.ticketCount) return null;
  if (!mongoose.isValidObjectId(selection.showId)) return null;
  const show = await Show.findOne({ _id: selection.showId, showDateTime: { $gte: new Date().toISOString() } }).populate('movie');
  if (!show) return null;

  const suggestedSeats = findContiguousSeats(show.occupiedSeates, selection.ticketCount);
  const seats = selection.seats;
  const selectedSeatsAreValid =
    Array.isArray(seats) &&
    seats.length === selection.ticketCount &&
    areContiguousSeats(seats) &&
    seats.every((seat) => !show.occupiedSeates[seat]);

  if (seats && !selectedSeatsAreValid) return null;
  const safeSeats = selectedSeatsAreValid ? [...seats].sort() : suggestedSeats;
  if (safeSeats.length !== selection.ticketCount) return null;

  return {
    venue: 'QuickShow',
    movie: { id: show.movie._id.toString(), title: show.movie.title },
    show: { id: show._id.toString(), startsAt: show.showDateTime },
    ticketCount: selection.ticketCount,
    seats: safeSeats,
    amount: show.showPrice * selection.ticketCount,
  };
};

const systemPrompt = `You are QuickShow's booking concierge for one venue named QuickShow.
Your job is only to help users find an upcoming movie show and prepare a booking summary. Never claim a show, price, seat, or availability unless a tool returned it. Never book, reserve, charge, or link to payments.
Interpret all dates and times in ${TIME_ZONE}. Ask one concise question when movie, date, time, or ticket count is missing. "Evening" means 17:00 through 21:59. A booking has 1 to ${MAX_TICKETS} tickets.
Use search_upcoming_shows before naming availability. Use suggest_contiguous_seats before marking a booking ready. If more than one show matches, ask the user to choose an exact listed time. Return ready only with a tool-returned show id and ticket count. Keep replies under 70 words.`;

const createBookingAgent = () => {
  const searchTool = tool(searchShows, {
    name: 'search_upcoming_shows',
    description: 'Find real upcoming QuickShow movie shows by title query and optional IST date (YYYY-MM-DD).',
    schema: z.object({ query: z.string().max(120), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
  });
  const seatsTool = tool(getSeatSuggestion, {
    name: 'suggest_contiguous_seats',
    description: 'Find currently available contiguous seats for a real show id and ticket count.',
    schema: z.object({ showId: z.string(), ticketCount: z.number().int().min(1).max(MAX_TICKETS) }),
  });
  const model = new ChatGroq({
    model: process.env.CHAT_MODEL || 'openai/gpt-oss-20b',
    temperature: 0,
    maxTokens: 320,
    maxRetries: 1,
  });

  return createAgent({
    model,
    tools: [searchTool, seatsTool],
    systemPrompt,
    responseFormat: toolStrategy(AgentResponse),
  });
};

export const runBookingAssistant = async ({ message, history = [] }) => {
  if (!process.env.GROQ_API_KEY) {
    const error = new Error('The booking assistant is not configured.');
    error.code = 'ASSISTANT_UNAVAILABLE';
    throw error;
  }

  let month;
  try {
    month = await reserveBudget();
  } catch {
    const error = new Error('The assistant has reached its monthly usage limit.');
    error.code = 'BUDGET_EXCEEDED';
    throw error;
  }

  try {
    const agent = createBookingAgent();
    const result = await agent.invoke(
      {
        messages: [...history, { role: 'user', content: message }],
      },
      { recursionLimit: 6 }
    );
    await settleBudget(month, result.messages || []);

    const response = AgentResponse.parse(result.structuredResponse);
    const bookingSummary = response.status === 'ready' ? await buildSummary(response.selection) : null;
    if (!bookingSummary) {
      return {
        message: response.status === 'ready' ? 'That seat suggestion is no longer available. Please choose another time.' : response.message,
        status: 'collecting',
        requiredSlots: response.status === 'ready' ? ['time'] : response.requiredSlots,
        bookingSummary: null,
      };
    }

    return { ...response, requiredSlots: [], bookingSummary };
  } catch (error) {
    if (error.code) throw error;
    console.error('chat assistant error', error.message);
    const serviceError = new Error('The assistant could not respond right now.');
    serviceError.code = 'ASSISTANT_FAILED';
    throw serviceError;
  }
};
