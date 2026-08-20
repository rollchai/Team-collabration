import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Trash2, Loader2, MessageSquare } from 'lucide-react';
import API from '../services/api';
import { toast } from 'react-toastify';

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(localStorage.getItem('ai_chat_session_id') || null);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [history, isOpen]);

  // Load existing session history on mount if session ID exists
  useEffect(() => {
    const loadSessionHistory = async () => {
      if (!sessionId) return;
      try {
        const response = await API.post('/aichat/AImessages', { sessionId });
        if (response.data.success) {
          setHistory(response.data.messages || []);
        }
      } catch (err) {
        console.error('Failed to load AI chat history:', err);
        // If session was deleted on backend, clear it locally
        if (err.response?.status === 404 || err.response?.status === 500) {
          handleClearChat();
        }
      }
    };

    loadSessionHistory();
  }, [sessionId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');
    setLoading(true);

    // Optimistically update the UI with the user's message
    const tempHistory = [...history, { role: 'user', content: userMessage }];
    setHistory(tempHistory);

    try {
      const response = await API.post('/aichat/AImessages', {
        sessionId,
        message: userMessage,
      });

      if (response.data.success) {
        if (!sessionId) {
          // If starting a new session, save the newly generated session ID
          setSessionId(response.data.sessionId);
          localStorage.setItem('ai_chat_session_id', response.data.sessionId);
        }
        setHistory(response.data.messages);
      }
    } catch (err) {
      console.error('AI Chat Error:', err);
      toast.error(err.response?.data?.message || 'Failed to get response from AI');
      // Revert optimistic update on failure
      setHistory(history);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setSessionId(null);
    setHistory([]);
    localStorage.removeItem('ai_chat_session_id');
    toast.success('AI conversation history cleared');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="mb-4 w-[360px] h-[500px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0b1322]/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/10">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xs text-slate-800 dark:text-white">
                    SyncFlow AI
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-slate-400">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={handleClearChat}
                    title="Clear Chat History"
                    className="rounded-lg p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-premium">
              {history.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-500 animate-bounce">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Ask me anything!
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-400 leading-normal max-w-[220px] mx-auto">
                      Get help with workspace navigation, tasks, services, or details about SyncFlow.
                    </p>
                  </div>
                </div>
              ) : (
                history.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-medium rounded-br-none shadow-md shadow-emerald-500/5'
                          : 'bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/10'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 max-w-[80%] rounded-2xl rounded-bl-none px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200/10 text-slate-400 text-xs">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSendMessage}
              className="border-t border-slate-200/60 dark:border-slate-800/60 p-3 bg-slate-50/50 dark:bg-slate-950/20"
            >
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 focus-within:border-emerald-500/50 dark:focus-within:border-emerald-500/50 transition-all">
                <input
                  type="text"
                  placeholder="Ask a question..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={loading}
                  className="flex-1 bg-transparent text-xs text-slate-800 dark:text-white outline-none placeholder-slate-400"
                />
                <button
                  type="submit"
                  disabled={!message.trim() || loading}
                  className="rounded-lg p-1.5 bg-gradient-to-tr from-emerald-500 to-teal-500 text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-xl shadow-emerald-500/20 cursor-pointer border border-emerald-400/20 relative group"
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <>
            <Sparkles className="h-5 w-5 animate-pulse" />
            {/* Tooltip */}
            <span className="absolute right-14 scale-0 group-hover:scale-100 transition-all duration-150 origin-right rounded-lg bg-slate-900 dark:bg-slate-950 px-2 py-1 text-4xs font-extrabold uppercase tracking-wider text-white border border-slate-800 pointer-events-none whitespace-nowrap shadow-lg">
              AI Assistant
            </span>
          </>
        )}
      </motion.button>
    </div>
  );
};

export default AIAssistant;
