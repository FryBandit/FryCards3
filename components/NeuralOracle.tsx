import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Terminal, Cpu, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'system';
  timestamp: number;
}

const NeuralOracle: React.FC = () => {
  const { user, dashboard } = useGame();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      text: `NEURAL LINK ESTABLISHED.\nIDENTITY VERIFIED: ${user?.email || 'OPERATIVE'}.\nSYSTEM READY.`,
      sender: 'system',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const generateResponse = (query: string): string => {
    const q = query.toLowerCase();
    
    if (q.includes('help') || q.includes('menu')) {
      return "AVAILABLE COMMANDS:\n- STATUS: Check account metrics\n- SHOP: Acquisition Hub protocols\n- LORE: Access historical archives\n- MISSION: Current objectives\n- SYSTEM: Server diagnostics";
    }
    
    if (q.includes('status') || q.includes('gold') || q.includes('gem')) {
      return `OPERATIVE METRICS:\nGOLD: ${dashboard?.profile.gold_balance ?? 'N/A'}\nGEMS: ${dashboard?.profile.gem_balance ?? 'N/A'}\nLEVEL: ${dashboard?.profile.level ?? 'Unknown'}\nXP: ${dashboard?.profile.xp ?? 0}`;
    }

    if (q.includes('shop') || q.includes('pack')) {
      return "The Acquisition Hub is operational. New shipments of Divine-class assets have been detected in the latest data stream. Proceed to the Shop to acquire.";
    }

    if (q.includes('lore') || q.includes('story') || q.includes('history')) {
      const lore = [
        "The FryCards network was established in 2142 after the Great Digital Collapse.",
        "Divine rarity cards are said to contain fragments of the original source code.",
        "The currency 'Gold' is actually mined from the entropy of dead servers.",
        "Operatives who reach Level 100 are granted access to the Inner Circle."
      ];
      return lore[Math.floor(Math.random() * lore.length)];
    }

    if (q.includes('mission') || q.includes('objective')) {
      const active = dashboard?.missions.filter(m => !m.is_completed).length || 0;
      return `ACTIVE OBJECTIVES: ${active}\nCompleting missions increases your clearance level and grants resource allocations.`;
    }

    if (q.includes('hello') || q.includes('hi')) {
      return `Greetings, Operative ${dashboard?.profile.username || ''}. The system is listening.`;
    }

    return "COMMAND UNRECOGNIZED. The neural interface requires precise syntax. Try 'HELP' for protocol list.";
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate network latency/processing
    setTimeout(() => {
      const responseText = generateResponse(userMsg.text);
      const systemMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'system',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, systemMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 1000);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col max-w-4xl mx-auto glass rounded-[2rem] overflow-hidden border border-indigo-500/30 shadow-[0_0_50px_rgba(79,70,229,0.1)] relative">
      {/* Header */}
      <div className="bg-slate-900/90 p-4 border-b border-indigo-500/30 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/50">
            <Bot className="text-indigo-400" size={20} />
          </div>
          <div>
            <h2 className="font-heading font-black text-white tracking-widest text-sm">NEURAL ORACLE v9.0</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] font-mono text-green-500 uppercase">Online // Latency: 12ms</span>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono text-indigo-400/60 uppercase">
           <span className="flex items-center gap-1"><Cpu size={12} /> Core Usage: 12%</span>
           <span className="flex items-center gap-1"><Terminal size={12} /> Encryption: AES-4096</span>
        </div>
      </div>

      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(79,70,229,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(79,70,229,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 scroll-smooth"
      >
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] md:max-w-[70%] rounded-2xl p-5 ${
                  msg.sender === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-lg' 
                    : 'bg-slate-900/80 border border-indigo-500/30 text-indigo-100 rounded-bl-none shadow-[0_0_20px_rgba(79,70,229,0.1)]'
                }`}
              >
                <div className="text-[10px] font-mono opacity-50 mb-2 uppercase tracking-widest flex items-center gap-2">
                   {msg.sender === 'system' ? <Terminal size={10} /> : <span className="w-2 h-2 rounded-full bg-white/50"></span>}
                   {msg.sender === 'user' ? 'OPERATIVE' : 'SYSTEM_CORE'} // {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
                <div className="whitespace-pre-line font-mono text-sm leading-relaxed">
                  {msg.text}
                </div>
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
               <div className="bg-slate-900/80 border border-indigo-500/30 px-6 py-4 rounded-2xl rounded-bl-none flex gap-2 items-center">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
               </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-indigo-500/30 relative z-20">
        <form onSubmit={handleSend} className="flex gap-4 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter command protocol..."
            className="flex-1 bg-slate-950/50 border border-slate-700 hover:border-indigo-500/50 focus:border-indigo-500 rounded-xl px-6 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
            autoFocus
          />
          <button 
            type="submit"
            disabled={!input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white p-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-900/20"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default NeuralOracle;