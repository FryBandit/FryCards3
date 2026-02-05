import React from 'react';
import { Card } from '../types';
import { Star } from 'lucide-react';

interface CardDisplayProps {
  card: Card;
  isFlipped?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showQuantity?: boolean;
}

const CardDisplay: React.FC<CardDisplayProps> = ({ 
  card, 
  isFlipped = false, 
  onClick, 
  size = 'md',
  showQuantity = false 
}) => {
  const rarityLower = card.rarity.toLowerCase().replace(' ', '-');
  const rarityClass = `rarity-${rarityLower}`;
  const isHighRarity = ['Mythic', 'Divine', 'Super-Rare'].includes(card.rarity);
  
  const sizeClasses = {
    sm: 'w-32 h-48',
    md: 'w-48 h-72',
    lg: 'w-64 h-96',
  };

  const getRarityStars = (rarity: string) => {
    switch (rarity) {
      case 'Common': return 1;
      case 'Uncommon': return 2;
      case 'Rare': return 3;
      case 'Super-Rare': return 4;
      case 'Mythic': return 5;
      case 'Divine': return 6;
      default: return 1;
    }
  };

  const starCount = getRarityStars(card.rarity);

  return (
    <div 
      className={`relative perspective-1000 ${sizeClasses[size]} cursor-pointer group select-none`}
      onClick={onClick}
    >
      <div 
        className={`w-full h-full relative transform-style-3d transition-transform duration-700 ease-out ${isFlipped ? 'rotate-y-180' : ''}`}
      >
        {/* Card Back */}
        <div className="absolute w-full h-full backface-hidden rounded-xl border-4 border-slate-700 bg-slate-900 flex items-center justify-center overflow-hidden shadow-2xl">
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 opacity-90"></div>
           <div className="relative z-10 text-center transform group-hover:scale-110 transition-transform">
             <div className="font-heading text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tighter">FRY</div>
             <div className="font-heading text-xs font-bold text-slate-500 tracking-[0.3em] mt-1">CARDS</div>
           </div>
           {/* Geometric Pattern Overlay */}
           <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]"></div>
        </div>

        {/* Card Front */}
        <div 
          className={`absolute w-full h-full backface-hidden rotate-y-180 rounded-xl overflow-hidden bg-slate-900 ${rarityClass} flex flex-col shadow-2xl shine-effect`}
        >
          {/* Holographic Overlay */}
          {isHighRarity && (
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 mix-blend-overlay"></div>
          )}
          
          {/* Divine Sparkle */}
          {card.rarity === 'Divine' && (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,215,0,0.1)_0%,_transparent_70%)] animate-pulse pointer-events-none z-10"></div>
          )}

          {/* Image Area */}
          <div className="h-[52%] w-full bg-black relative overflow-hidden">
             {card.is_video ? (
                <video 
                  src={card.image_url} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover" 
                />
             ) : (
                <img src={card.image_url || 'https://picsum.photos/300/400'} alt={card.name} className="w-full h-full object-cover" />
             )}
             
             {/* Gradient Shade */}
             <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-900 to-transparent"></div>

             {/* New Badge */}
             {card.is_new && (
               <div className="absolute top-2 right-2 z-30 bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded-sm shadow-lg animate-bounce">
                 NEW
               </div>
             )}
          </div>

          {/* Info Area */}
          <div className="flex-1 p-3 flex flex-col relative z-20 bg-slate-900">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-heading font-black text-[13px] leading-none text-white tracking-tight uppercase" title={card.name}>{card.name}</h3>
              {showQuantity && (card.quantity || 0) > 1 && (
                <span className="bg-indigo-600/50 border border-indigo-400/30 text-[10px] px-1.5 py-0.5 rounded text-white font-mono font-bold shrink-0 ml-1">
                  x{card.quantity}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-0.5 mb-2">
              {Array.from({ length: starCount }).map((_, i) => (
                <Star key={i} size={10} className="fill-current text-yellow-500 drop-shadow-[0_0_2px_rgba(234,179,8,0.8)]" />
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                {card.description || card.flavor_text || "Standard issue asset."}
              </p>
            </div>
            
            <div className="mt-auto pt-2 border-t border-slate-800/50 flex justify-between items-center">
               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{card.card_type}</span>
               {card.set_name && <span className="text-[9px] font-mono text-indigo-400/70">{card.set_name}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDisplay;