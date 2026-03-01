import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Terminal, X, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { getChatResponse, speak } from '../services/geminiService';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

interface AiChatProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

export const AiChat: React.FC<AiChatProps> = ({ isOpen, onClose, accentColor, onSpeakStart, onSpeakEnd }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: 'CORE AI ONLINE. STATUS: READY. OPERATOR, PROVIDE INPUT.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getChatResponse(userMessage.text, []);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response || 'SYSTEM ERROR.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMessage]);
      
      // Automatically speak the AI response
      if (response) {
        await speak(response, onSpeakStart, onSpeakEnd);
      }
    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              height: isMinimized ? '64px' : '90vh'
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "relative w-full max-w-6xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden transition-all duration-500",
              isMinimized ? "h-16" : "h-[90vh]"
            )}
          >
            {/* Header */}
            <div className={cn("p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80 backdrop-blur-md", accentColor)}>
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full animate-pulse shadow-[0_0_10px_currentColor]", accentColor.replace('text-', 'bg-'))} />
                <div className="flex flex-col">
                  <span className="text-sm font-mono font-black text-white tracking-[0.2em] uppercase flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    AI COMMAND CORE v4.0
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Neural Link Established // Secure Channel</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400"
                  title={isMinimized ? "Expand" : "Minimize"}
                >
                  {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 scrollbar-thin scrollbar-thumb-zinc-800 custom-scrollbar"
                >
                  <div className="max-w-4xl mx-auto w-full space-y-8">
                    <AnimatePresence initial={false}>
                      {messages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "flex gap-4 sm:gap-6",
                            msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border",
                            msg.role === 'model' 
                              ? cn("bg-black border-zinc-800", accentColor) 
                              : "bg-zinc-900 border-zinc-800 text-zinc-500"
                          )}>
                            {msg.role === 'model' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                          </div>
                          
                          <div className={cn(
                            "flex flex-col gap-2 max-w-[85%] sm:max-w-[75%]",
                            msg.role === 'user' ? "items-end" : "items-start"
                          )}>
                            <div className="flex items-center gap-2 px-1">
                              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] font-bold">
                                {msg.role === 'model' ? 'SYSTEM_CORE' : 'OPERATOR_AUTH'}
                              </span>
                              <span className="text-[8px] font-mono text-zinc-700">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                            <div className={cn(
                              "p-4 sm:p-6 rounded-3xl text-sm font-mono leading-relaxed shadow-xl",
                              msg.role === 'user' 
                                ? "bg-white text-black font-bold rounded-tr-none" 
                                : "bg-zinc-900/50 border border-zinc-800 text-zinc-200 rounded-tl-none"
                            )}>
                              {msg.text}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {isLoading && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-4 text-xs font-mono text-zinc-500"
                      >
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full animate-bounce" />
                        </div>
                        ANALYZING INPUT...
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-6 sm:p-10 border-t border-zinc-800 bg-zinc-950">
                  <div className="max-w-4xl mx-auto w-full relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 rounded-[2rem] blur opacity-20 group-focus-within:opacity-40 transition duration-1000" />
                    <div className="relative">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="TRANSMIT COMMAND TO CORE..."
                        className="w-full bg-zinc-900/80 border-2 border-zinc-800 rounded-[1.5rem] py-5 pl-8 pr-20 text-sm font-mono text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-all shadow-2xl"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={cn(
                          "absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-2xl transition-all",
                          input.trim() && !isLoading 
                            ? "bg-white text-black hover:scale-105 active:scale-95" 
                            : "text-zinc-700"
                        )}
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="mt-4 text-center text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em]">
                      Direct Neural Link // End-to-End Encryption Active
                    </p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
