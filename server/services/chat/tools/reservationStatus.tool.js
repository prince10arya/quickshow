import { tool } from 'langchain';
import { z } from 'zod';
import { reservationService } from '../../../modules/reservation/reservation.service.js';

export const reservationStatusHandler = async ({ reservationId }) => {
  try {
    const reservation = await reservationService.getReservation(reservationId);
    const output = {
      success: true,
      reservationId: reservation._id.toString(),
      status: reservation.status,
      expiresAt: reservation.expiresAt.toISOString(),
      amount: reservation.amount,
      seats: reservation.seatIds,
      showId: reservation.show?._id?.toString() || reservation.show?.toString(),
    };
    return JSON.stringify(output);
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: {
        code: error.code || 'RESERVATION_NOT_FOUND',
        message: error.message || 'Could not locate reservation.',
      },
    });
  }
};

export const reservationStatusTool = tool(reservationStatusHandler, {
  name: 'get_reservation_status',
  description:
    'Check real-time status and time remaining on an active seat reservation hold. READ ONLY.',
  schema: z.object({
    reservationId: z.string().describe('The reservation ID to check'),
  }),
});

export default reservationStatusTool;
