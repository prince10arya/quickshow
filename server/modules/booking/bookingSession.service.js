import { bookingSessionRepository } from '../../repositories/bookingSession.repository.js';
import { BOOKING_SESSION_STATUS } from '../../models/bookingSession.model.js';
import {
  applyCascadeInvalidations,
  assertSessionTransition,
} from './bookingSession.stateMachine.js';

export class BookingSessionService {
  constructor(repo = bookingSessionRepository) {
    this.repo = repo;
  }

  /**
   * Get existing active session for conversation or create a new one.
   * @param {string} userId
   * @param {string} conversationId
   * @returns {Promise<BookingSession>}
   */
  async getOrCreateSession(userId, conversationId) {
    let session = await this.repo.findActiveByConversation(conversationId);
    if (!session) {
      session = await this.repo.create({
        userId: userId || null,
        conversationId,
        status: BOOKING_SESSION_STATUS.BROWSING,
      });
    }
    return session;
  }

  /**
   * Update session with transition check, cascade invalidation, and optimistic concurrency.
   * @param {string} sessionId
   * @param {Object} updates
   * @param {number} [expectedVersion]
   * @returns {Promise<BookingSession>}
   */
  async updateSession(sessionId, updates = {}, expectedVersion) {
    const current = await this.repo.findById(sessionId);
    if (!current) {
      throw new Error(`Booking session ${sessionId} not found`);
    }

    const versionToUse = typeof expectedVersion === 'number' ? expectedVersion : current.version;

    // Apply cascade invalidation if parent fields changed
    const sanitizedUpdates = applyCascadeInvalidations(current, updates);

    // If status is transitioning, validate legal transition
    if (sanitizedUpdates.status && sanitizedUpdates.status !== current.status) {
      assertSessionTransition(current.status, sanitizedUpdates.status, sessionId);
    }

    return this.repo.updateWithVersion(sessionId, versionToUse, sanitizedUpdates);
  }

  /**
   * Deterministically update booking session from tool results (Section 24).
   * Does NOT rely on LLM hallucination for database updates.
   * @param {BookingSession} session
   * @param {string} toolName
   * @param {any} output
   * @returns {Promise<BookingSession>}
   */
  async handleToolResult(session, toolName, output) {
    if (!session || !toolName || !output) return session;

    let updates = {};

    switch (toolName) {
      case 'get_movie_details': {
        const movie = output.movie || (output.title ? output : null);
        if (movie) {
          const movieId = movie._id?.toString?.() || movie.id || movie._id;
          const movieTitle = movie.title;
          if (movieId || movieTitle) {
            updates = {
              ...(movieId ? { movieId: String(movieId) } : {}),
              ...(movieTitle ? { movieTitle } : {}),
              status: BOOKING_SESSION_STATUS.MOVIE_SELECTED,
            };
          }
        }
        break;
      }

      case 'search_upcoming_shows': {
        if (output.showId) {
          updates = {
            showId: String(output.showId),
            status: BOOKING_SESSION_STATUS.SHOW_SELECTED,
          };
        } else if (Array.isArray(output.shows) && output.shows.length === 1) {
          // If query narrowed down to a single specific show
          const single = output.shows[0];
          updates = {
            showId: String(single._id || single.id),
            status: BOOKING_SESSION_STATUS.SHOW_SELECTED,
          };
        }
        break;
      }

      case 'check_show_availability': {
        if (output.showId || output.success) {
          updates = {
            ...(output.showId ? { showId: String(output.showId) } : {}),
            status: BOOKING_SESSION_STATUS.AVAILABILITY_CHECKED,
          };
        }
        break;
      }

      case 'suggest_contiguous_seats': {
        const seats = output.seats || (Array.isArray(output) ? output : null);
        if (Array.isArray(seats) && seats.length > 0) {
          updates = {
            selectedSeats: seats.map(String),
            seatCount: seats.length,
            status: BOOKING_SESSION_STATUS.SEATS_SELECTED,
          };
        }
        break;
      }

      case 'prepare_booking_summary': {
        const summary = output.bookingSummary || output;
        if (summary) {
          updates = {
            ...(summary.movieId ? { movieId: String(summary.movieId) } : {}),
            ...(summary.movieTitle ? { movieTitle: summary.movieTitle } : {}),
            ...(summary.showId ? { showId: String(summary.showId) } : {}),
            ...(Array.isArray(summary.seats) ? { selectedSeats: summary.seats.map(String), seatCount: summary.seats.length } : {}),
            status: BOOKING_SESSION_STATUS.REVIEW,
          };
        }
        break;
      }

      default:
        break;
    }

    if (Object.keys(updates).length > 0) {
      return this.updateSession(session._id, updates, session.version);
    }

    return session;
  }
}

export const bookingSessionService = new BookingSessionService();
export default bookingSessionService;
