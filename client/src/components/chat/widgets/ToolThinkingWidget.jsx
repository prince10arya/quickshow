import { Film, Loader2, Search, Sparkles, Ticket } from 'lucide-react';

const TOOL_CONFIG = {
  list_all_movies: { label: 'Browsing theater catalog…', icon: Film },
  list_movies_by_genre: { label: 'Filtering movies by genre…', icon: Film },
  get_movie_details: { label: 'Loading movie synopsis & cast…', icon: Sparkles },
  search_upcoming_shows: { label: 'Checking upcoming showtimes…', icon: Search },
  check_show_availability: { label: 'Checking real-time seat availability…', icon: Ticket },
  suggest_contiguous_seats: { label: 'Finding best contiguous seats…', icon: Ticket },
  prepare_booking_summary: { label: 'Preparing booking ticket…', icon: Ticket },
};

export const ToolThinkingWidget = ({ toolName }) => {
  const config = TOOL_CONFIG[toolName] || { label: 'QuickShow concierge thinking…', icon: Sparkles };
  const Icon = config.icon;

  return (
    <div className="my-2 flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-2 text-xs font-medium text-rose-300 animate-pulse">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
      <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      <span>{config.label}</span>
    </div>
  );
};

export default ToolThinkingWidget;
