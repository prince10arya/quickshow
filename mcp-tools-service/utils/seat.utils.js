import { CHAT_CONFIG } from '../config/chat.config.js';

export const seatIds = () =>
  Array.from({ length: 10 }, (_, row) =>
    Array.from({ length: 9 }, (_, index) => `${String.fromCharCode(65 + row)}${index + 1}`)
  );

export const findContiguousSeats = (occupiedSeats = {}, ticketCount) => {
  if (!Number.isInteger(ticketCount) || ticketCount < 1 || ticketCount > CHAT_CONFIG.MAX_TICKETS) return [];

  for (const row of seatIds()) {
    for (let start = 0; start <= row.length - ticketCount; start += 1) {
      const group = row.slice(start, start + ticketCount);
      if (group.every((seat) => !occupiedSeats[seat])) return group;
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

export const getSeatAvailabilityStats = (occupiedSeats = {}) => {
  const totalSeats = 10 * 9; // 90 seats total
  const occupiedCount = Object.keys(occupiedSeats || {}).length;
  const availableCount = Math.max(0, totalSeats - occupiedCount);
  return {
    totalSeats,
    occupiedCount,
    availableCount,
    isHouseFull: availableCount === 0,
  };
};
