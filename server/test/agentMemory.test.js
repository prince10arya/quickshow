import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOOKING_SESSION_STATUS,
} from '../models/bookingSession.model.js';
import {
  isValidSessionTransition,
  assertSessionTransition,
  applyCascadeInvalidations,
} from '../modules/booking/bookingSession.stateMachine.js';
import { BookingSessionService } from '../modules/booking/bookingSession.service.js';
import { ContextSerializer } from '../modules/context/context.serializer.js';
import { ContextBuilder } from '../modules/context/context.builder.js';
import { INTENT_TYPES } from '../modules/context/context.types.js';
import { MemoryRetriever } from '../modules/memory/memory.retriever.js';
import { MemoryExtractor } from '../modules/memory/memory.extractor.js';
import { ConversationSummaryService } from '../modules/memory/memory.summary.js';

// --- In-Memory Repository Mocks for Unit Isolation ---

class MockBookingSessionRepo {
  constructor() {
    this.sessions = new Map();
  }

  async findActiveByConversation(conversationId) {
    for (const session of this.sessions.values()) {
      if (
        session.conversationId === conversationId &&
        ![BOOKING_SESSION_STATUS.CONFIRMED, BOOKING_SESSION_STATUS.CANCELLED, BOOKING_SESSION_STATUS.EXPIRED].includes(session.status)
      ) {
        if (session.expiresAt && new Date(session.expiresAt) <= new Date()) {
          session.status = BOOKING_SESSION_STATUS.EXPIRED;
          return null;
        }
        return { ...session };
      }
    }
    return null;
  }

  async findById(id) {
    const s = this.sessions.get(id);
    return s ? { ...s } : null;
  }

  async create(data) {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const session = {
      _id: id,
      version: 1,
      expiresAt: data.expiresAt || new Date(Date.now() + 15 * 60 * 1000),
      selectedSeats: [],
      seatCount: 0,
      status: BOOKING_SESSION_STATUS.BROWSING,
      ...data,
    };
    this.sessions.set(id, session);
    return { ...session };
  }

  async updateWithVersion(id, expectedVersion, updates) {
    const session = this.sessions.get(id);
    if (!session) throw new Error('Session not found');
    if (session.version !== expectedVersion) {
      const err = new Error(`Optimistic lock conflict: expected ${expectedVersion}, got ${session.version}`);
      err.code = 'CONFLICT';
      throw err;
    }
    Object.assign(session, updates, { version: session.version + 1, updatedAt: new Date() });
    this.sessions.set(id, session);
    return { ...session };
  }
}

class MockMessageRepo {
  constructor() {
    this.messages = [];
  }

  async createMessage(data) {
    const msg = {
      _id: `msg_${this.messages.length + 1}`,
      createdAt: new Date(),
      ...data,
    };
    this.messages.push(msg);
    return msg;
  }

  async getRecentMessages(conversationId, options = {}) {
    const filtered = this.messages
      .filter((m) => m.conversationId === conversationId)
      .slice(-options.limit || -20);
    return filtered;
  }

  async getMessagesAfter(conversationId, afterId = null, limit = 50) {
    let list = this.messages.filter((m) => m.conversationId === conversationId);
    if (afterId) {
      const idx = list.findIndex((m) => m._id === afterId);
      if (idx !== -1) list = list.slice(idx + 1);
    }
    return list.slice(0, limit);
  }
}

class MockPreferenceRepo {
  constructor() {
    this.prefs = new Map(); // key: `${userId}:${key}`
  }

  async getUserPreferences(userId) {
    const results = [];
    for (const [k, v] of this.prefs.entries()) {
      if (k.startsWith(`${userId}:`)) results.push({ ...v });
    }
    return results;
  }

  async upsertPreference({ userId, key, value, source = 'explicit', confidence = 1.0 }) {
    const mapKey = `${userId}:${key}`;
    const existing = this.prefs.get(mapKey);

    // Explicit user statements take precedence over inferred
    if (existing && existing.source === 'explicit' && source === 'inferred') {
      return existing;
    }

    const pref = { userId, key, value, source, confidence, updatedAt: new Date() };
    this.prefs.set(mapKey, pref);
    return pref;
  }
}

class MockMemoryRepo {
  constructor() {
    this.memories = [];
  }

  async create(data) {
    const mem = { _id: `mem_${this.memories.length + 1}`, ...data };
    this.memories.push(mem);
    return mem;
  }

  async findByUser(userId, options = {}) {
    return this.memories.filter((m) => m.userId === userId).slice(0, options.limit || 10);
  }

  async searchByKeyword(userId, keyword, limit = 5) {
    const lower = keyword.toLowerCase();
    return this.memories
      .filter((m) => m.userId === userId && m.content.toLowerCase().includes(lower))
      .slice(0, limit);
  }
}

class MockSummaryRepo {
  constructor() {
    this.summaries = new Map();
  }

  async getSummary(conversationId) {
    return this.summaries.get(conversationId) || null;
  }

  async upsertSummary(conversationId, summary, summarizedUntilMessageId) {
    const existing = this.summaries.get(conversationId);
    const version = existing ? existing.version + 1 : 1;
    const doc = { conversationId, summary, summarizedUntilMessageId, version };
    this.summaries.set(conversationId, doc);
    return doc;
  }
}

// ============================================================================
// TESTS
// ============================================================================

test('Booking State Machine: Legal forward transitions', () => {
  assert.equal(isValidSessionTransition(BOOKING_SESSION_STATUS.BROWSING, BOOKING_SESSION_STATUS.MOVIE_SELECTED), true);
  assert.equal(isValidSessionTransition(BOOKING_SESSION_STATUS.MOVIE_SELECTED, BOOKING_SESSION_STATUS.SHOW_SELECTED), true);
  assert.equal(isValidSessionTransition(BOOKING_SESSION_STATUS.SHOW_SELECTED, BOOKING_SESSION_STATUS.AVAILABILITY_CHECKED), true);
  assert.equal(isValidSessionTransition(BOOKING_SESSION_STATUS.AVAILABILITY_CHECKED, BOOKING_SESSION_STATUS.SEATS_SELECTED), true);
  assert.equal(isValidSessionTransition(BOOKING_SESSION_STATUS.SEATS_SELECTED, BOOKING_SESSION_STATUS.REVIEW), true);
  assert.equal(isValidSessionTransition(BOOKING_SESSION_STATUS.REVIEW, BOOKING_SESSION_STATUS.CONFIRMED), true);
});

test('Booking State Machine: Disallow illegal direct transitions', () => {
  // Browsing directly to confirmed is forbidden
  assert.equal(isValidSessionTransition(BOOKING_SESSION_STATUS.BROWSING, BOOKING_SESSION_STATUS.CONFIRMED), false);
  assert.throws(() => {
    assertSessionTransition(BOOKING_SESSION_STATUS.BROWSING, BOOKING_SESSION_STATUS.CONFIRMED);
  }, /Invalid booking session transition/);
});

test('Booking State Machine: Cascade invalidations when parent state changes', () => {
  const current = {
    movieId: 'movie_1',
    movieTitle: 'Interstellar',
    showId: 'show_100',
    selectedSeats: ['G10', 'G11'],
    seatCount: 2,
    status: BOOKING_SESSION_STATUS.SEATS_SELECTED,
  };

  // Movie changes: invalidate show and seats
  const movieChangedUpdates = applyCascadeInvalidations(current, {
    movieId: 'movie_2',
    movieTitle: 'Inception',
  });
  assert.equal(movieChangedUpdates.movieId, 'movie_2');
  assert.equal(movieChangedUpdates.showId, null);
  assert.deepEqual(movieChangedUpdates.selectedSeats, []);
  assert.equal(movieChangedUpdates.seatCount, 0);
  assert.equal(movieChangedUpdates.status, BOOKING_SESSION_STATUS.MOVIE_SELECTED);

  // Show changes: invalidate seats
  const showChangedUpdates = applyCascadeInvalidations(current, {
    showId: 'show_200',
  });
  assert.equal(showChangedUpdates.showId, 'show_200');
  assert.deepEqual(showChangedUpdates.selectedSeats, []);
  assert.equal(showChangedUpdates.seatCount, 0);
  assert.equal(showChangedUpdates.status, BOOKING_SESSION_STATUS.SHOW_SELECTED);
});

test('Booking Session Service: Optimistic concurrency control', async () => {
  const mockRepo = new MockBookingSessionRepo();
  const service = new BookingSessionService(mockRepo);

  const session = await service.getOrCreateSession('user_123', 'conv_123');
  assert.equal(session.version, 1);

  // Successful update increments version to 2
  const updated1 = await service.updateSession(session._id, {
    status: BOOKING_SESSION_STATUS.MOVIE_SELECTED,
    movieId: 'm1',
  }, 1);
  assert.equal(updated1.version, 2);

  // Concurrent request with stale version 1 must fail
  await assert.rejects(async () => {
    await service.updateSession(session._id, {
      status: BOOKING_SESSION_STATUS.SHOW_SELECTED,
      showId: 's1',
    }, 1); // Stale version 1
  }, /Optimistic lock conflict/);
});

test('Booking Session Service: Session expiration', async () => {
  const mockRepo = new MockBookingSessionRepo();
  const expiredSession = await mockRepo.create({
    conversationId: 'conv_expired',
    expiresAt: new Date(Date.now() - 1000), // In past
  });

  const active = await mockRepo.findActiveByConversation('conv_expired');
  assert.equal(active, null); // Gracefully expired
});

test('Booking Session Service: Deterministic tool result updates', async () => {
  const mockRepo = new MockBookingSessionRepo();
  const service = new BookingSessionService(mockRepo);
  const session = await service.getOrCreateSession('user_1', 'conv_tools');

  // 1. get_movie_details updates movie
  const s1 = await service.handleToolResult(session, 'get_movie_details', {
    movie: { _id: 'm_interstellar', title: 'Interstellar' },
  });
  assert.equal(s1.movieId, 'm_interstellar');
  assert.equal(s1.movieTitle, 'Interstellar');
  assert.equal(s1.status, BOOKING_SESSION_STATUS.MOVIE_SELECTED);

  // 2. search_upcoming_shows updates show
  const s2 = await service.handleToolResult(s1, 'search_upcoming_shows', {
    showId: 'show_evening_8pm',
  });
  assert.equal(s2.showId, 'show_evening_8pm');
  assert.equal(s2.status, BOOKING_SESSION_STATUS.SHOW_SELECTED);

  // 3. suggest_contiguous_seats updates seats
  const s3 = await service.handleToolResult(s2, 'suggest_contiguous_seats', {
    seats: ['G10', 'G11'],
  });
  assert.deepEqual(s3.selectedSeats, ['G10', 'G11']);
  assert.equal(s3.seatCount, 2);
  assert.equal(s3.status, BOOKING_SESSION_STATUS.SEATS_SELECTED);

  // 4. prepare_booking_summary sets review
  const s4 = await service.handleToolResult(s3, 'prepare_booking_summary', {
    bookingSummary: { movieTitle: 'Interstellar', seats: ['G10', 'G11'], totalAmount: 500 },
  });
  assert.equal(s4.status, BOOKING_SESSION_STATUS.REVIEW);
});

test('User Preferences: Explicit preference overrides inferred preference', async () => {
  const repo = new MockPreferenceRepo();

  // 1. Explicit preference set
  await repo.upsertPreference({
    userId: 'u1',
    key: 'preferred_format',
    value: 'IMAX',
    source: 'explicit',
    confidence: 1.0,
  });

  let prefs = await repo.getUserPreferences('u1');
  assert.equal(prefs.find((p) => p.key === 'preferred_format').value, 'IMAX');

  // 2. Later inferred preference attempts overwrite: MUST BE REJECTED
  await repo.upsertPreference({
    userId: 'u1',
    key: 'preferred_format',
    value: '2D',
    source: 'inferred',
    confidence: 0.6,
  });

  prefs = await repo.getUserPreferences('u1');
  assert.equal(prefs.find((p) => p.key === 'preferred_format').value, 'IMAX'); // Still IMAX!

  // 3. New explicit preference can overwrite
  await repo.upsertPreference({
    userId: 'u1',
    key: 'preferred_format',
    value: '4DX',
    source: 'explicit',
    confidence: 1.0,
  });
  prefs = await repo.getUserPreferences('u1');
  assert.equal(prefs.find((p) => p.key === 'preferred_format').value, '4DX');
});

test('Semantic Memory: Strict user isolation', async () => {
  const memRepo = new MockMemoryRepo();
  const retriever = new MemoryRetriever(null, memRepo);

  await memRepo.create({
    userId: 'user_A',
    content: 'User A loves Sci-Fi movies and IMAX',
  });
  await memRepo.create({
    userId: 'user_B',
    content: 'User B prefers Romantic comedies only',
  });

  // Query as User A: must never see User B memories
  const userAMemories = await retriever.retrieve({
    userId: 'user_A',
    query: 'What movie should I watch?',
    intent: INTENT_TYPES.RECOMMENDATION,
  });
  assert.equal(userAMemories.length, 1);
  assert.equal(userAMemories[0].userId, 'user_A');
  assert.ok(userAMemories[0].content.includes('User A'));

  // Query as User B: must never see User A memories
  const userBMemories = await retriever.retrieve({
    userId: 'user_B',
    query: 'Suggest something',
    intent: INTENT_TYPES.RECOMMENDATION,
  });
  assert.equal(userBMemories.length, 1);
  assert.equal(userBMemories[0].userId, 'user_B');
  assert.ok(userBMemories[0].content.includes('User B'));
});

test('Memory Retriever: Intent-aware retrieval skips semantic search for booking action', async () => {
  const memRepo = new MockMemoryRepo();
  const retriever = new MemoryRetriever(null, memRepo);
  await memRepo.create({ userId: 'u1', content: 'Preference: IMAX' });

  // Pure booking action "Book two seats": skips semantic memory
  const results = await retriever.retrieve({
    userId: 'u1',
    query: 'Book two seats for Interstellar',
    intent: INTENT_TYPES.BOOKING_ACTION,
  });
  assert.deepEqual(results, []);
});

test('Memory Extractor: Filters conversational noise and captures explicit preferences', async () => {
  const prefRepo = new MockPreferenceRepo();
  const memRepo = new MockMemoryRepo();
  const extractor = new MemoryExtractor({ prefRepo, memRepo });

  // 1. Noise phrases ignored
  assert.equal(extractor.isNoise('ok'), true);
  assert.equal(extractor.isNoise('thank you'), true);
  assert.equal(extractor.isNoise('sure!'), true);
  assert.equal(extractor.isNoise('show me'), true);

  const noiseRes = await extractor.extractAndPersist({
    userId: 'u1',
    conversationId: 'c1',
    messageId: 'm1',
    text: 'ok thanks',
  });
  assert.deepEqual(noiseRes, []);

  // 2. Explicit preference captured
  const prefRes = await extractor.extractAndPersist({
    userId: 'u1',
    conversationId: 'c1',
    messageId: 'm2',
    text: 'I always prefer IMAX movies',
  });
  assert.equal(prefRes.length, 1);
  assert.equal(prefRes[0].key, 'preferred_format');
  assert.equal(prefRes[0].value, 'IMAX');

  const savedPrefs = await prefRepo.getUserPreferences('u1');
  assert.equal(savedPrefs.length, 1);
  assert.equal(savedPrefs[0].value, 'IMAX');
});

test('Context Builder & Serializer: Parallel assembly and bounded sanitization', async () => {
  const msgRepo = new MockMessageRepo();
  const summaryRepo = new MockSummaryRepo();
  const bookingRepo = new MockBookingSessionRepo();
  const prefRepo = new MockPreferenceRepo();
  const memRepo = new MockMemoryRepo();
  const retriever = new MemoryRetriever(null, memRepo);

  await bookingRepo.create({
    conversationId: 'c_full',
    movieTitle: 'Interstellar',
    selectedSeats: ['G10', 'G11'],
    seatCount: 2,
    status: BOOKING_SESSION_STATUS.REVIEW,
  });

  await prefRepo.upsertPreference({
    userId: 'u_full',
    key: 'preferred_format',
    value: 'IMAX',
  });

  await msgRepo.createMessage({
    conversationId: 'c_full',
    role: 'user',
    content: 'Find 2 seats for Interstellar',
  });

  const builder = new ContextBuilder({
    messageRepo: msgRepo,
    summaryRepo,
    bookingRepo,
    preferenceRepo: prefRepo,
    retriever,
  });

  const context = await builder.build({
    userId: 'u_full',
    conversationId: 'c_full',
    userMessage: 'Recommend something good',
  });

  assert.ok(context.bookingState);
  assert.equal(context.bookingState.movieTitle, 'Interstellar');
  assert.equal(context.userPreferences.length, 1);
  assert.equal(context.recentMessages.length, 1);

  // Serializer produces structured Markdown without leaking internal Mongo IDs
  const serializer = new ContextSerializer();
  const serialized = serializer.serialize(context, 'Confirm booking');

  assert.ok(serialized.includes('## CURRENT BOOKING SESSION'));
  assert.ok(serialized.includes('Movie: Interstellar'));
  assert.ok(serialized.includes('Selected seats: G10, G11'));
  assert.ok(serialized.includes('## USER PREFERENCES'));
  assert.ok(serialized.includes('preferred_format: IMAX'));
  assert.ok(serialized.includes('## RECENT CONVERSATION'));
  assert.ok(serialized.includes('User: Find 2 seats for Interstellar'));
  assert.ok(serialized.includes('## CURRENT REQUEST\nConfirm booking'));
});

test('Conversation Summary Service: Threshold-based summarization', async () => {
  const msgRepo = new MockMessageRepo();
  const summaryRepo = new MockSummaryRepo();
  const service = new ConversationSummaryService({ summaryRepo, msgRepo });

  // Add 12 messages (> threshold of 10)
  for (let i = 1; i <= 12; i++) {
    await msgRepo.createMessage({
      conversationId: 'c_thresh',
      role: i % 2 === 1 ? 'user' : 'assistant',
      content: `Message ${i} about Interstellar movie`,
    });
  }

  const should = await service.shouldSummarize('c_thresh');
  assert.equal(should, true);

  const summary = await service.summarizeIfNeeded('c_thresh');
  assert.ok(summary);
  assert.equal(summary.version, 1);
  assert.ok(summary.summary.includes('Interstellar'));
  assert.equal(summary.summarizedUntilMessageId, 'msg_12');
});
