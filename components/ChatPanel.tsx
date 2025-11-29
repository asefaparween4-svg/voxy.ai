
import React, { useRef, useEffect, useState } from 'react';
import { Send, Cpu, Trash2, Terminal, Globe, ExternalLink } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  isLive: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, onClearChat, isLive }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/80 lg:bg-slate-900/50 rounded-xl lg:rounded-2xl border border-slate-800 backdrop-blur-md overflow-hidden relative shadow-lg">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur z-20 shrink-0">
        <div className="flex items-center gap-2">
           <Terminal size={14} className="text-sky-500" />
           <span className="text-[10px] font-tech text-slate-500 tracking-widest">
             {isLive ? 'LIVE TRANSCRIPT_LOG' : 'TEXT_COMMAND_INTERFACE'}
           </span>
        </div>
        <button
          onClick={onClearChat}
          className="text-[10px] flex items-center gap-1.5 text-slate-500 hover:text-rose-400 transition-colors uppercase font-tech tracking-wider group"
          title="Clear History"
        >
          <Trash2 size={14} className="group-hover:animate-pulse" />
          CLEAR
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
            <Cpu size={48} className="mb-2" />
            <p className="font-tech text-xs tracking-widest text-center">SYSTEM READY<br/>AWAITING INPUT</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-sm relative border shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-100 rounded-tr-none'
                    : 'bg-slate-800/80 border-slate-700 text-slate-200 rounded-tl-none'
                }`}
              >
                {/* Speaker Label */}
                <div className={`text-[9px] font-tech mb-1 uppercase tracking-wider ${
                   msg.role === 'user' ? 'text-sky-400 text-right' : 'text-rose-400 text-left'
                }`}>
                  {msg.role === 'user' ? 'Operator' : 'Jarvis'}
                </div>
                
                {/* Message Text */}
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                
                {/* Sources / Citations */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-700/50">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1.5 font-tech uppercase tracking-wider">
                      <Globe size={10} /> Sources Found
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((source, sIdx) => (
                        <a 
                          key={sIdx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs bg-slate-900/50 hover:bg-sky-900/30 border border-slate-700 hover:border-sky-500/50 text-sky-400 px-2 py-1 rounded transition-colors truncate max-w-full"
                        >
                          <ExternalLink size={10} />
                          <span className="truncate max-w-[150px]">{source.title || source.url}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Decorator line */}
                <div className={`absolute top-0 w-3 h-3 border-t border-l ${
                   msg.role === 'user' 
                     ? 'right-0 border-sky-500 -mr-[1px] -mt-[1px]' 
                     : 'left-0 border-rose-500 -ml-[1px] -mt-[1px]'
                }`}></div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Command Line Input Area */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/90 relative z-20 backdrop-blur-sm shrink-0">
        <form 
          onSubmit={handleSubmit} 
          className="flex gap-2 items-center bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 focus-within:border-sky-500/50 focus-within:shadow-[0_0_15px_rgba(14,165,233,0.1)] transition-all"
        >
          <span className="text-sky-500 font-mono text-sm font-bold select-none">{'>'}</span>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isLive ? "VOICE ACTIVE - ENTER TEXT COMMAND..." : "ENTER TEXT QUERY (HYBRID MODE)..."}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-sky-100 placeholder-slate-600 font-mono h-full"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="text-slate-500 hover:text-sky-400 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors p-1"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
