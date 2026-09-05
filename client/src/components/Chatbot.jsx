import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { MessageCircle, X, Send, Sparkles, Star, CreditCard, Calendar, BarChart3 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import './Chatbot.css';

/**
 * Generative UI Components
 */
const MovieMiniCard = ({ movie, navigate }) => (
  <div 
    className="movie-mini-card"
    onClick={() => {
      navigate(`/movies/${movie._id || movie.id}`);
      window.scrollTo(0, 0);
    }}
  >
    <img src={movie.poster_path} alt={movie.title} className="mini-poster" />
    <div className="mini-info">
      <h4 className="mini-title">{movie.title}</h4>
      <div className="mini-meta">
        <span className="mini-genre">{movie.genres?.slice(0, 2).join(', ')}</span>
        <span className="mini-rating">
          <Star size={10} fill="currentColor" /> {movie.vote_average?.toFixed(1) || movie.vote_average}
        </span>
      </div>
    </div>
  </div>
);

const MovieCardList = ({ movies, navigate }) => (
  <div className="movie-cards-container">
    {movies.map((movie, idx) => (
      <MovieMiniCard key={idx} movie={movie} navigate={navigate} />
    ))}
  </div>
);

const CheckoutButton = ({ url }) => (
  <a href={url} target="_blank" rel="noopener noreferrer" className="stripe-link">
    <CreditCard size={14} /> Complete Booking
  </a>
);

const PriceChart = ({ symbol, price, delta }) => (
  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mt-2">
    <div className="flex justify-between items-center mb-2">
      <span className="font-bold text-gray-700">{symbol}</span>
      <span className={delta >= 0 ? 'text-green-600' : 'text-red-600'}>
        {delta >= 0 ? '+' : ''}{delta}%
      </span>
    </div>
    <div className="text-2xl font-bold">${price}</div>
    <div className="h-10 mt-2 flex items-end gap-1">
      {[40, 60, 45, 70, 55, 80, 75].map((h, i) => (
        <div key={i} className="flex-1 bg-blue-400 rounded-t" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
);

const AvailabilityCard = ({ date, available, remainingSeats }) => (
  <div className="p-3 bg-white rounded-lg border border-gray-200 mt-2 flex items-center justify-between">
    <div>
      <div className="text-xs text-gray-500 flex items-center gap-1">
        <Calendar size={12} /> {date}
      </div>
      <div className="text-sm font-bold">
        {available ? `${remainingSeats} Seats Left` : 'Sold Out'}
      </div>
    </div>
    {available && (
      <button className="text-[10px] bg-primary text-white px-2 py-1 rounded font-bold">
        BOOK NOW
      </button>
    )}
  </div>
);

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { getToken, navigate } = useAppContext();
  const messagesEndRef = useRef(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    headers: async () => {
      const token = await getToken();
      return { Authorization: `Bearer ${token}` };
    },
    initialMessages: [
      { id: 'welcome', role: 'assistant', content: 'Welcome to QuickShow! 🎬 I can help you find movies and book tickets. Try asking "What movies are playing?"' }
    ]
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isLoading, isOpen]);

  return (
    <div className="chatbot-container">
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="bot-avatar">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800 m-0">QuickShow AI</h3>
                <p className="text-[10px] text-green-600 m-0 font-medium">● Powered by Vercel AI SDK</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          
          <div className="chatbot-messages">
            {messages.map((m) => (
              <div key={m.id} className={`message ${m.role === 'user' ? 'user' : 'ai'}`}>
                {/* Text Content */}
                {m.content}

                {/* Tool Invocations (Generative UI) */}
                {m.toolInvocations?.map((toolInvocation) => {
                  const { toolName, toolCallId, state } = toolInvocation;

                  if (state === 'result') {
                    const result = toolInvocation.result;
                    switch (toolName) {
                      case 'getNowPlayingMovies':
                        return <MovieCardList key={toolCallId} movies={result} navigate={navigate} />;
                      case 'bookTicket':
                        return result.success ? <CheckoutButton key={toolCallId} url={result.url} /> : null;
                      case 'showPriceChart':
                        return <PriceChart key={toolCallId} {...result} />;
                      case 'checkAvailability':
                        return <AvailabilityCard key={toolCallId} {...result} />;
                      default:
                        return null;
                    }
                  } else {
                    return (
                      <div key={toolCallId} className="text-[10px] text-gray-400 italic animate-pulse mt-1">
                        Calling {toolName}...
                      </div>
                    );
                  }
                })}
              </div>
            ))}
            {isLoading && (
              <div className="typing-indicator">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="chatbot-input-container">
            <div className="chatbot-input">
              <input
                type="text"
                placeholder="Ask about movies..."
                value={input}
                onChange={handleInputChange}
              />
              <button 
                type="submit"
                className="send-button"
                disabled={!input.trim() || isLoading}
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
      
      <button className="chatbot-button" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
};

export default Chatbot;
