import { tool } from 'langchain';
import { z } from 'zod';
import { reservationService } from '../../../modules/reservation/reservation.service.js';
import { CHAT_CONFIG } from '../config/chat.config.js';

export const holdSeatsHandler = async ({ showId, seats, userId }) => {
  try {
    const effectiveUserId = userId || 'guest_user';
    const reservation = await reservationService.holdSeats({
      userId: effectiveUserId,
      showId,
      seatIds: seats,
      ttlMs: 300000, // 5 min
    });

    const output = {
      success: true,
      reservationId: reservation._id.toString(),
      status: reservation.status,
      expiresAt: reservation.expiresAt.toISOString(),
      amount: reservation.amount,
      seats: reservation.seatIds,
      message: `Seats ${seats.join(', ')} successfully held for 5 minutes. Total: ₹${reservation.amount}.`,
    };

    return JSON.stringify(output);
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: {
        code: error.code || 'SEAT_HOLD_FAILED',
        message: error.message || 'Unable to hold selected seats.',
      },
    });
  }
};

export const holdSeatsTool = tool(holdSeatsHandler, {
  name: 'hold_seats',
  description:
    'Temporarily hold selected seats for a show for 5 minutes before payment. MUTATING action with side-effects.',
  schema: z.object({
    showId: z.string().describe('The showId to reserve seats for'),
    seats: z
      .array(z.string())
      .min(1)
      .max(CHAT_CONFIG.MAX_TICKETS)
      .describe('Array of seat IDs to hold (e.g. ["G12", "G13"])'),
    userId: z.string().optional().describe('User identifier holding the seats'),
  }),
});

export default holdSeatsTool;
