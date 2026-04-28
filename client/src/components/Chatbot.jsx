import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import './Chatbot.css';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Welcome to QuickShow! 🎬 I can help you find movies, check showtimes, and book tickets instantly. What are you in the mood for?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { axios, getToken } = useAppContext();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isTyping, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const token = await getToken();
      const chatMessages = messages.concat(userMessage).map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data } = await axios.post('/api/chat', {
        messages: chatMessages
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to connect to the assistant. Please ensure you are logged in.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatMessage = (content) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="stripe-link">💳 Complete Booking</a>;
      }
      return part;
    });
  };

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
                <h3 className="text-sm font-bold text-gray-800 m-0">QuickShow Assistant</h3>
                <p className="text-[10px] text-green-600 m-0 font-medium">● Online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role === 'user' ? 'user' : 'ai'}`}>
                {formatMessage(msg.content)}
              </div>
            ))}
            {isTyping && (
              <div className="typing-indicator">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-container">
            <div className="chatbot-input">
              <input
                type="text"
                placeholder="Ask about movies..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={handleSend} 
                className="send-button"
                disabled={!input.trim() || isTyping}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
      
      <button className="chatbot-button" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
};

export default Chatbot;
