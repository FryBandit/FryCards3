
import React, { useState, useEffect, useMemo } from 'react';
import { PackResult } from '../types';
import CardDisplay from '../components/CardDisplay';
import { X, Sparkles, ChevronRight } from 'lucide-react';
import Confetti from 'react-confetti';
import { SOUNDS } from '../constants';

interface PackOpenerProps {
  packResult: PackResult | null;
  onClose: () => void;
  packImage: string;
}

const PackOpener: React.FC<PackOpenerProps> = ({ packResult, onClose, packImage }) => {
  const [stage, setStage] = useState<'shaking' | 'opening' | 'revealing' | 'summary'>('shaking');
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Audio Instances (Initialized once per lifecycle, strictly checking for valid sources)
  const sfx = useMemo(() => {
    const createAudio = (src: string) => (src && src.length > 0 ? new Audio(src) : null);
    
    return {
      hover: createAudio(SOUNDS.HOVER),
      click: createAudio(SOUNDS.CLICK),
      shake: createAudio(SOUNDS.PACK_SHAKE),
      open: createAudio(SOUNDS.PACK_OPEN),
      revealCommon: createAudio(SOUNDS.REVEAL_COMMON),
      revealRare: createAudio(SOUNDS.REVEAL_RARE),
      revealLegendary: createAudio(SOUNDS.REVEAL_LEGENDARY),
      success: createAudio(SOUNDS.SUCCESS)
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      // Clean up audio
      Object.values(sfx).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = "";
        }
      });
    };
  }, [sfx]);

  const triggerHaptic = (pattern: number | number[]) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  useEffect(() => {
    if (packResult) {
      if (sfx.shake) {
        sfx.shake.volume = 0.5;
        sfx.shake.play().catch(() => {});
      }
      triggerHaptic([50, 50, 50, 50]);

      const t1 = setTimeout(() => {
        setStage('opening');
        if (sfx.open) {
          sfx.open.volume = 0.6;
          sfx.open.play().catch(() => {});
        }
        triggerHaptic(200);
      }, 1200);

      const t2 = setTimeout(() => setStage('revealing'), 1800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [packResult, sfx]);

  const handleCardClick = (index: number) => {
    if (stage === 'revealing' && !revealedCards.includes(index)) {
      setRevealedCards(prev => [...prev, index]);
      
      const card = packResult?.cards[index];
      if (card) {
        if (['Mythic', 'Divine'].includes(card.rarity)) {
           sfx.revealLegendary?.play().catch(() => {});
           triggerHaptic([100, 50, 100]);
        } else if (['Rare', 'Super-Rare'].includes(card.rarity)) {
           sfx.revealRare?.play().catch(() => {});
           triggerHaptic(50);
        } else {
           sfx.revealCommon?.play().catch(() => {});
           triggerHaptic(20);
        }
      }
    }
  };

  useEffect(() => {
    if (packResult && revealedCards.length === packResult.cards.length && stage === 'revealing') {
      const t = setTimeout(() => {
        setStage('summary');
        sfx.success?.play().catch(() => {});
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [revealedCards, packResult, stage, sfx]);

  if (!packResult) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl overflow-y-auto">
      {stage === 'summary' && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={300} />}

      <button onClick={onClose} className="absolute top-8 right-8 p-3 text-slate-500 hover:text-white bg-slate-900/50 rounded-full z-50 border border-slate-700">
        <X size={24} />
      </button>

      {(stage === 'shaking' || stage === 'opening') && (
        <div className="text-center">
          <div className={`relative transition-all duration-500 ${stage === 'shaking' ? 'animate-pack-shake' : 'scale-150 opacity-0'}`}>
            <img src={packImage} className="w-64 h-auto drop-shadow-2xl" alt="Pack" />
          </div>
          <p className="mt-12 font-heading text-xl font-bold tracking-[0.4em] animate-pulse text-indigo-400">
            {stage === 'shaking' ? 'CONNECTING...' : 'UNPACKING...'}
          </p>
        </div>
      )}

      {(stage === 'revealing' || stage === 'summary') && (
        <div className="w-full max-w-7xl px-8 flex flex-col items-center py-10">
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {packResult.cards.map((card, index) => (
              <div key={index} className={`transition-all duration-500 ${stage === 'summary' ? 'scale-90 opacity-80' : 'scale-100'}`} style={{ transitionDelay: `${index * 50}ms` }}>
                <CardDisplay card={card} isFlipped={revealedCards.includes(index)} onClick={() => handleCardClick(index)} />
              </div>
            ))}
          </div>

          {stage === 'revealing' && (
             <button onClick={() => setRevealedCards(packResult.cards.map((_, i) => i))} className="bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-4 rounded-sm font-heading font-black tracking-widest shadow-xl flex items-center gap-2">
               QUICK REVEAL <ChevronRight size={20} />
             </button>
          )}

          {stage === 'summary' && (
            <div className="text-center bg-slate-900 border border-slate-700 p-10 rounded-3xl shadow-2xl animate-fade-in max-w-md w-full">
              <Sparkles className="mx-auto text-indigo-400 mb-4" size={40} />
              <h2 className="text-3xl font-heading font-black mb-6">SYNC COMPLETE</h2>
              <div className="grid grid-cols-2 gap-4 mb-8 text-center">
                <div className="bg-slate-800 p-4 rounded-xl">
                  <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">XP Gained</div>
                  <div className="text-2xl font-heading text-yellow-400">+{packResult.xp_gained}</div>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl">
                  <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">New Cards</div>
                  <div className="text-2xl font-heading text-cyan-400">{packResult.new_card_count}</div>
                </div>
              </div>
              <button onClick={onClose} className="w-full bg-indigo-600 py-5 rounded-xl font-heading font-black tracking-widest hover:bg-indigo-500 transition-colors">CONFIRM & EXIT</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PackOpener;
