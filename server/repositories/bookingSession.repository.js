import mongoose from 'mongoose';
import BookingSession, { BOOKING_SESSION_STATUS } from '../models/bookingSession.model.js';
import { ConflictError, NotFoundError } from '../errors/appError.js';

export class BookingSessionRepository {
  /**
   * Find active booking session for a conversation.
   * Marks as expired if expiresAt is in the past.
   * @param {string} conversationId
   * @returns {Promise<BookingSession|null>}
   */
  async findActiveByConversation(conversationId) {
    if (!conversationId) return null;

    const session = await BookingSession.findOne({
      conversationId: String(conversationId),
      status: {
        $nin: [
          BOOKING_SESSION_STATUS.CONFIRMED,
          BOOKING_SESSION_STATUS.CANCELLED,
          BOOKING_SESSION_STATUS.EXPIRED,
        ],
      },
    }).sort({ updatedAt: -1 });

    if (!session) return null;

    // Check application-level expiration
    if (session.expiresAt && new Date(session.expiresAt) <= new Date()) {
      session.status = BOOKING_SESSION_STATUS.EXPIRED;
      await BookingSession.updateOne(
        { _id: session._id },
        { $set: { status: BOOKING_SESSION_STATUS.EXPIRED, updatedAt: new Date() } }
      );
      return null;
    }

    return session;
  }

  /**
   * Find booking session by ID.
   * @param {string} sessionId
   * @returns {Promise<BookingSession|null>}
   */
  async findById(sessionId) {
    if (!sessionId || !mongoose.isValidObjectId(sessionId)) return null;
    return BookingSession.findById(sessionId);
  }

  /**
   * Create a new booking session.
   * Default TTL is 15 minutes from creation.
   * @param {Object} data
   * @returns {Promise<BookingSession>}
   */
  async create(data) {
    const expiresAt = data.expiresAt || new Date(Date.now() + 15 * 60 * 1000);
    return BookingSession.create({
      ...data,
      expiresAt,
      version: 1,
    });
  }

  /**
   * Update booking session with optimistic concurrency control.
   * Increments version on success.
   * @param {string} sessionId
   * @param {number} expectedVersion
   * @param {Object} updates
   * @returns {Promise<BookingSession>}
   * @throws {ConflictError} when version does not match
   */
  async updateWithVersion(sessionId, expectedVersion, updates) {
    if (!sessionId) throw new NotFoundError('Session ID is required for update');

    const cleanUpdates = { ...updates, updatedAt: new Date() };
    delete cleanUpdates._id;
    delete cleanUpdates.version;

    const result = await BookingSession.updateOne(
      {
        _id: sessionId,
        version: expectedVersion,
      },
      {
        $set: cleanUpdates,
        $inc: { version: 1 },
      }
    );

    if (result.matchedCount === 0) {
      const current = await this.findById(sessionId);
      if (!current) {
        throw new NotFoundError(`Booking session ${sessionId} not found.`);
      }
      throw new ConflictError(
        `Optimistic concurrency conflict on booking session ${sessionId}. Expected version ${expectedVersion}, but found version ${current.version}.`
      );
    }

    return this.findById(sessionId);
  }

  /**
   * Cancel or expire a session.
   * @param {string} sessionId
   * @param {'cancelled'|'expired'} status
   * @returns {Promise<BookingSession>}
   */
  async terminateSession(sessionId, status = BOOKING_SESSION_STATUS.CANCELLED) {
    return BookingSession.findByIdAndUpdate(
      sessionId,
      { $set: { status, updatedAt: new Date() } },
      { new: true }
    );
  }
}

export const bookingSessionRepository = new BookingSessionRepository();
export default bookingSessionRepository;
