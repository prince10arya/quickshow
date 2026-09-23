import { Film, Search, Sparkles, Ticket, Users, CheckCircle2 } from 'lucide-react';

/**
 * Single source of truth mapping all QuickShow MCP tools to:
 * - Active running label
 * - Completed activity label
 * - Booking step
 * - Accessible icon
 * - Safe description
 */
export const TOOL_METADATA = {
  list_all_movies: {
    label: 'Finding movies',
    successLabel: 'Found available movies',
    step: 'discover',
    icon: Film,
    description: 'Browsing theater catalog for available movies',
  },
  list_movies_by_genre: {
    label: 'Finding movies by genre',
    successLabel: 'Filtered movies by genre',
    step: 'discover',
    icon: Film,
    description: 'Filtering catalog by preferred genre',
  },
  get_movie_details: {
    label: 'Getting movie details',
    successLabel: 'Retrieved movie details',
    step: 'movie',
    icon: Sparkles,
    description: 'Looking up synopsis, cast, and rating',
  },
  search_upcoming_shows: {
    label: 'Finding upcoming shows',
    successLabel: 'Found upcoming shows',
    step: 'show',
    icon: Search,
    description: 'Searching showtimes by movie and date',
  },
  check_show_availability: {
    label: 'Checking show availability',
    successLabel: 'Checked show availability',
    step: 'show',
    icon: Ticket,
    description: 'Verifying real-time seat availability',
  },
  suggest_contiguous_seats: {
    label: 'Finding seats together',
    successLabel: 'Found seats together',
    step: 'seats',
    icon: Users,
    description: 'Locating adjacent seating for your party',
  },
  prepare_booking_summary: {
    label: 'Preparing booking summary',
    successLabel: 'Booking summary ready',
    step: 'review',
    icon: CheckCircle2,
    description: 'Generated verified ticket summary',
  },
};

/**
 * Direct mapping between tool names and high-level booking steps.
 * @type {Record<string, import('./types').BookingStep>}
 */
export const TOOL_STEP_MAP = Object.freeze(
  Object.fromEntries(
    Object.entries(TOOL_METADATA).map(([toolName, meta]) => [toolName, meta.step])
  )
);

/**
 * Safe fallback metadata for unknown or dynamically added tools.
 */
export const DEFAULT_TOOL_METADATA = {
  label: 'Working on your request',
  successLabel: 'Completed request',
  step: 'discover',
  icon: Sparkles,
  description: 'Executing agent action',
};

/**
 * Retrieve metadata for any tool name with graceful fallback for unknown tools.
 * @param {string} [toolName]
 * @returns {typeof DEFAULT_TOOL_METADATA}
 */
export const getToolMetadata = (toolName) => {
  if (!toolName || typeof toolName !== 'string') {
    return DEFAULT_TOOL_METADATA;
  }
  return TOOL_METADATA[toolName] || DEFAULT_TOOL_METADATA;
};
