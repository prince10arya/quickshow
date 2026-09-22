import { useEffect, useRef } from 'react';
import BookingTicketWidget from './widgets/BookingTicketWidget';
import GenreChipsWidget from './widgets/GenreChipsWidget';
import MovieGridWidget from './widgets/MovieGridWidget';
import ShowtimesWidget from './widgets/ShowtimesWidget';
import ToolThinkingWidget from './widgets/ToolThinkingWidget';
import QuickPrompts from './QuickPrompts';
import ChatMessageMarkdown from './ChatMessageMarkdown';

export const ChatMessageList = ({
  messages,
  activeTool,
  loading,
  user,
  paying,
  onProceedToPayment,
  onSelectPrompt,
}) => {
  const bottomRef = useRef(null);

  // Auto-scroll on new tokens or messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTool, loading]);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
      {/* Welcome message and starter prompts when no history */}
      {!messages.length && (
        <div className="space-y-4">
          <div className="max-w-sm rounded-2xl rounded-tl-sm border border-primary/20 bg-primary/10 p-4 text-xs sm:text-sm leading-relaxed text-zinc-200">
            <p className="font-semibold text-white mb-1">👋 Welcome to QuickShow!</p>
            I'm your personal movie concierge. Ask me what’s playing, get movie recommendations by genre, check showtimes, or book your seats in seconds!
          </div>

          <GenreChipsWidget onSelectGenre={(genre) => onSelectPrompt(`Show me ${genre} movies`)} />

          <QuickPrompts onSelectPrompt={onSelectPrompt} />
        </div>
      )}

      {/* Messages */}
      {messages.map((message, index) => {
        const isUser = message.role === 'user';

        return (
          <div
            key={`${message.role}-${index}`}
            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
          >
            {/* Text Bubble */}
            {(message.content || message.isStreaming) && (
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'rounded-tr-sm bg-gradient-to-r from-primary to-rose-600 text-white shadow-md shadow-rose-950/40 whitespace-pre-wrap'
                    : 'rounded-tl-sm border border-white/10 bg-zinc-900/90 text-zinc-200 shadow-md'
                }`}
              >
                {isUser ? (
                  message.content
                ) : (
                  <ChatMessageMarkdown content={message.content} />
                )}
                {message.isStreaming && (
                  <span className="inline-block h-3.5 w-1.5 ml-1 animate-pulse bg-primary align-middle" />
                )}
              </div>
            )}

            {/* Generative UI Widgets attached to message */}
            {message.widgets?.map((widget, wIdx) => {
              if (widget.type === 'movie_grid') {
                return (
                  <div key={`widget-${wIdx}`} className="w-full max-w-[95%]">
                    <MovieGridWidget widget={widget} onSelectPrompt={onSelectPrompt} />
                  </div>
                );
              }
              if (widget.type === 'showtimes') {
                return (
                  <div key={`widget-${wIdx}`} className="w-full max-w-[95%]">
                    <ShowtimesWidget widget={widget} onSelectPrompt={onSelectPrompt} />
                  </div>
                );
              }
              if (widget.type === 'booking_summary' || widget.bookingSummary) {
                return (
                  <div key={`widget-${wIdx}`} className="w-full max-w-[95%]">
                    <BookingTicketWidget
                      summary={widget.bookingSummary}
                      user={user}
                      paying={paying}
                      onProceedToPayment={onProceedToPayment}
                    />
                  </div>
                );
              }
              return null;
            })}

            {/* If legacy bookingSummary exists and wasn't in widgets */}
            {message.bookingSummary &&
              !message.widgets?.some((w) => w.type === 'booking_summary') && (
                <div className="w-full max-w-[95%]">
                  <BookingTicketWidget
                    summary={message.bookingSummary}
                    user={user}
                    paying={paying}
                    onProceedToPayment={onProceedToPayment}
                  />
                </div>
              )}
          </div>
        );
      })}

      {/* Active Tool Running Indicator */}
      {activeTool && (
        <div className="max-w-[80%]">
          <ToolThinkingWidget toolName={activeTool.name} />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default ChatMessageList;
