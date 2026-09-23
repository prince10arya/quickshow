/**
 * Ordered list of high-level booking workflow steps.
 * @type {readonly import('./types').BookingStep[]}
 */
export const BOOKING_STEPS = /** @type {const} */ ([
  'discover',
  'movie',
  'show',
  'seats',
  'review',
]);

/**
 * Human-friendly metadata for each high-level booking step.
 */
export const STEP_METADATA = {
  discover: {
    id: 'discover',
    label: 'Discover',
    shortLabel: 'Discover',
    description: 'Browse current & trending movies',
    order: 0,
  },
  movie: {
    id: 'movie',
    label: 'Movie',
    shortLabel: 'Movie',
    description: 'Explore synopsis, cast & rating',
    order: 1,
  },
  show: {
    id: 'show',
    label: 'Show',
    shortLabel: 'Show',
    description: 'Select theater showtime & date',
    order: 2,
  },
  seats: {
    id: 'seats',
    label: 'Seats',
    shortLabel: 'Seats',
    description: 'Select contiguous seats',
    order: 3,
  },
  review: {
    id: 'review',
    label: 'Review',
    shortLabel: 'Review',
    description: 'Review booking & checkout',
    order: 4,
  },
};
