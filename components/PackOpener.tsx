import React, { useState, useEffect } from 'react';
import { Card, PackResult } from '../types';
import CardDisplay from './CardDisplay';
import { X, Sparkles, ChevronRight } from 'lucide-react';
import Confetti from 'react-confetti';

interface PackOpenerProps {
  packResult: PackResult | null;
  onClose: () => void;
  packImage: string;
}

const PackOpener: React.FC<PackOpenerProps> = ({ packResult, onClose, packImage }) => {
  const [stage, setStage] = useState<'idle' | 'shaking' | 'opening' | 'revealing' | 'summary'>('idle');
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (packResult) {
      setStage('shaking');
      // Sequences
      const t1 = setTimeout(() => setStage('opening'), 1200);
      const t2 = setTimeout(() => setStage('revealing'), 1800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [packResult]);

  const handleCardClick = (index: number) => {
    if (stage !== 'revealing') return;
    if (!revealedCards.includes(index)) {
      setRevealedCards(prev => [...prev, index]);
    }
  };

  const handleRevealAll = () => {
    if (!packResult) return;
    setRevealedCards(packResult.cards.map((_, i) => i));
  };

  useEffect(() => {
    if (packResult && revealedCards.length === packResult.cards.length && packResult.cards.length > 0) {
      const t = setTimeout(() => setStage('summary'), 1200);
      return () => clearTimeout(t);
    }
  }, [revealedCards, packResult]);

  if (!packResult) return null;

  const hasHighRarity = packResult.cards.some(c => 
    ['Mythic', 'Divine', 'Super-Rare'].includes(c.rarity)
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl transition-all duration-500">
      {(stage === 'summary' && hasHighRarity) && (
        <Confetti 
          width={windowSize.width} 
          height={windowSize.height} 
          numberOfPieces={300} 
          recycle={false} 
          colors={['#4f46e5', '#3b82f6', '#a855f7', '#f97316', '#eab308']}
        />
      )}

      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-3 text-slate-500 hover:text-white bg-slate-900/50 hover:bg-slate-800 rounded-full transition-all z-50 border border-slate-700"
      >
        <X size={24} />
      </button>

      {/* Stage: Shaking/Opening */}
      {(stage === 'shaking' || stage === 'opening') && (
        <div className="flex flex-col items-center">
          <div className={`relative transition-all duration-500 ${stage === 'shaking' ? 'animate-pack-shake' : 'scale-150 opacity-0'}`}>
            <img src={packImage} alt="Pack" className="w-64 h-auto drop-shadow-[0_0_50px_rgba(79,70,229,0.5)]" />
            {stage === 'opening' && (
              <div className="absolute inset-0 bg-white/40 animate-ping rounded-xl"></div>
            )}
          </div>
          <div className="mt-12 text-center">
            <p className="font-heading text-xl font-bold tracking-[0.4em] animate-pulse text-indigo-400">
              {stage === 'shaking' ? 'CONNECTING...' : 'UNPACKING...'}
            </p>
          </div>
        </div>
      )}

      {/* Stage: Revealing */}
      {(stage === 'revealing' || stage === 'summary') && (
        <div className="w-full max-w-7xl px-8 flex flex-col items-center">
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {packResult.cards.map((card, index) => (
              <div 
                key={card.id + index} 
                className={`transform transition-all duration-500 ${
                    stage === 'summary' ? 'scale-90 opacity-80' : 'scale-100'
                }`}
                style={{
                    transitionDelay: `${index * 50}ms`,
                    transform: revealedCards.includes(index) ? '' : `translateY(${Math.sin(index) * 10}px)`
                }}
              >
                <CardDisplay 
                  card={card} 
                  isFlipped={revealedCards.includes(index)} 
                  onClick={() => handleCardClick(index)}
                  size="md"
                />
              </div>
            ))}
          </div>

          {stage === 'revealing' && (
            <div className="flex flex-col items-center gap-4">
               <p className="text-slate-400 font-medium animate-bounce">Click cards to reveal</p>
               <button 
                onClick={handleRevealAll}
                className="group relative flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-4 rounded-full font-heading font-black tracking-widest shadow-[0_0_30px_rgba(79,70,229,0.3)] transition-all active:scale-95"
              >
                QUICK REVEAL
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {stage === 'summary' && (
            <div className="text-center bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-10 rounded-3xl shadow-2xl animate-fade-in max-w-lg w-full">
              <div className="mb-4">
                <div className="inline-flex p-4 bg-indigo-500/10 rounded-full mb-4">
                  <Sparkles className="text-indigo-400" size={40} />
                </div>
                <h2 className="text-3xl font-heading font-black text-white mb-2 tracking-tighter">DATA SYNC COMPLETE</h2>
                <p className="text-slate-400 mb-8 font-medium italic">Collection updated with new assets.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">XP ACQUIRED</div>
                  <div className="text-2xl font-heading font-bold text-yellow-400">+{packResult.xp_gained}</div>
                </div>
                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">NEW ASSETS</div>
                  <div className="text-2xl font-heading font-bold text-cyan-400">{packResult.new_card_count}</div>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white py-5 rounded-2xl font-heading font-black tracking-widest shadow-xl transition-all active:scale-[0.98]"
              >
                CONFIRM & RETURN
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PackOpener;