const POPULAR_GENRES = [
  { label: 'Action', emoji: '💥' },
  { label: 'Sci-Fi', emoji: '🚀' },
  { label: 'Comedy', emoji: '😂' },
  { label: 'Drama', emoji: '🎭' },
  { label: 'Horror', emoji: '👻' },
  { label: 'Romance', emoji: '💖' },
  { label: 'Thriller', emoji: '🕵️' },
  { label: 'Animation', emoji: '✨' },
];

export const GenreChipsWidget = ({ onSelectGenre }) => {
  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {POPULAR_GENRES.map((g) => (
        <button
          key={g.label}
          type="button"
          onClick={() => onSelectGenre(g.label)}
          className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-primary/40 hover:bg-primary/10 hover:text-white"
        >
          <span>{g.emoji}</span>
          <span>{g.label}</span>
        </button>
      ))}
    </div>
  );
};

export default GenreChipsWidget;
