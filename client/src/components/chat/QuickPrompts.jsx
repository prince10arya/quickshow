import { Film, Flame, Sparkles, Ticket } from 'lucide-react';

const SUGGESTIONS = [
  { icon: Film, text: 'What movies are playing today?' },
  { icon: Sparkles, text: 'Show Sci-Fi & Action movies' },
  { icon: Flame, text: 'What are the top rated movies?' },
  { icon: Ticket, text: 'Check showtimes for tonight' },
];

export const QuickPrompts = ({ onSelectPrompt }) => {
  return (
    <div className="space-y-2 py-2">
      <p className="text-[11px] font-medium text-zinc-400">Quick suggestions to get started:</p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {SUGGESTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.text}
              type="button"
              onClick={() => onSelectPrompt(item.text)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5 text-left text-xs text-zinc-200 transition hover:border-primary/50 hover:bg-primary/10 hover:text-white"
            >
              <Icon className="h-3.5 w-3.5 text-primary flex-shrink-0" aria-hidden="true" />
              <span className="line-clamp-1">{item.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickPrompts;
