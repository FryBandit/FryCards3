
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../types';
import { Star, Shield, Zap, CircleDot, Box, ImageOff, Sparkles } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface CardDisplayProps {
  card: Card;
  isFlipped?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showQuantity?: boolean;
  showFoilEffect?: boolean;
}

const CardDisplay: React.FC<CardDisplayProps> = ({ 
  card, 
  isFlipped = true, 
  onClick, 
  size = 'md',
  showQuantity = false,
  showFoilEffect = true
}) => {
  const isHighRarity = ['Mythic', 'Divine', 'Super-Rare'].includes(card.rarity);
  const isFoil = card.is_foil || (card.foil_quantity || 0) > 0;
  
  const cardRef = useRef<HTMLDivElement>(null);

  // Motion values for tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smoothing springs
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  // Rotation mapping (-15 to 15 degrees)
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-15, 15]);

  // Holographic Shimmer mapping
  const shimmerX = useTransform(mouseXSpring, [-0.5, 0.5], [0, 100]);
  const shimmerY = useTransform(mouseYSpring, [-0.5, 0.5], [0, 100]);
  const shimmerOpacity = useTransform(mouseXSpring, [-0.5, 0.5], [0.1, 0.6]);

  // Accelerometer / Gyroscope Handler
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // Gamma: Left/Right tilt (-90 to 90)
      // Beta: Front/Back tilt (-180 to 180)
      if (e.gamma !== null && e.beta !== null) {
        // Normalize gamma to -0.5 to 0.5 range
        const xVal = Math.min(Math.max(e.gamma, -45), 45) / 90; 
        // Normalize beta to -0.5 to 0.5 range (assuming holding phone roughly upright)
        const yVal = Math.min(Math.max(e.beta - 45, -45), 45) / 90;
        
        x.set(xVal);
        y.set(yVal);
      }
    };

    if (window.DeviceOrientationEvent && typeof (window.DeviceOrientationEvent as any).requestPermission === 'function') {
         // Permission handling would go here for iOS 13+
    } else {
         window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [x, y]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !isFlipped) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = (mouseX / width) - 0.5;
    const yPct = (mouseY / height) - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const rarityColor = {
    'Common': 'text-slate-400 border-slate-600 shadow-slate-500/20',
    'Uncommon': 'text-emerald-400 border-emerald-500 shadow-emerald-500/30',
    'Rare': 'text-blue-400 border-blue-500 shadow-blue-500/40',
    'Super-Rare': 'text-purple-400 border-purple-500 shadow-purple-500/50',
    'Mythic': 'text-orange-400 border-orange-500 shadow-orange-500/50',
    'Divine': 'text-yellow-300 border-yellow-400 shadow-yellow-500/60'
  }[card.rarity] || 'text-slate-400 border-slate-600';
  
  const sizeClasses = {
    sm: 'w-[135px] h-[180px]', 
    md: 'w-[240px] h-[320px]', 
    lg: 'w-[300px] h-[400px]',
  };

  const getRarityIcon = () => {
    switch(card.rarity) {
      case 'Common': return <CircleDot size={12} />;
      case 'Uncommon': return <Box size={12} />;
      case 'Rare': return <Shield size={12} />;
      case 'Super-Rare': return <Zap size={12} />;
      case 'Mythic': return <Star size={12} />;
      case 'Divine': return <Star size={12} className="fill-current" />;
      default: return <CircleDot size={12} />;
    }
  };

  return (
    <motion.div 
      ref={cardRef}
      className={`relative ${sizeClasses[size]} cursor-pointer group select-none`}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ 
        perspective: '1200px',
        rotateX: isFlipped ? rotateX : 0,
        rotateY: isFlipped ? rotateY : 180,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <motion.div 
        className="w-full h-full relative"
        initial={false}
        animate={{ rotateY: isFlipped ? 0 : 180 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front of Card (Face Up) */}
        <div 
          className={`absolute inset-0 rounded-xl overflow-hidden bg-slate-900 flex flex-col shadow-2xl ${rarityColor.split(' ').pop()}`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}
        >
          {/* Border / Frame Glow */}
          <div className={`absolute inset-0 border-[3px] rounded-xl z-20 pointer-events-none opacity-80 ${rarityColor.split(' ')[1]} ${isFoil ? 'border-amber-300/50' : ''}`}></div>
          
          {/* Foil Rainbow Overlay */}
          {showFoilEffect && isFoil && (
            <div className="absolute inset-0 z-30 pointer-events-none opacity-30 mix-blend-overlay bg-[linear-gradient(135deg,rgba(255,0,0,0.4),rgba(255,165,0,0.4),rgba(255,255,0,0.4),rgba(0,128,0,0.4),rgba(0,0,255,0.4),rgba(75,0,130,0.4),rgba(238,130,238,0.4))] bg-[length:200%_200%] animate-hologram"></div>
          )}

          {/* Reactive Holographic Foil for High Rarity */}
          {(isHighRarity || isFoil) && (
            <motion.div 
              className="absolute inset-0 z-30 pointer-events-none opacity-40 mix-blend-color-dodge"
              style={{
                background: `linear-gradient(
                  ${115}deg,
                  transparent 0%,
                  rgba(255, 255, 255, 0.2) 25%,
                  rgba(6, 182, 212, 0.4) 45%,
                  rgba(236, 72, 153, 0.4) 55%,
                  rgba(6, 182, 212, 0.4) 75%,
                  rgba(255, 255, 255, 0.2) 100%
                )`,
                backgroundSize: '200% 200%',
                backgroundPosition: useTransform(
                  [shimmerX, shimmerY],
                  ([xVal, yVal]) => `${xVal}% ${yVal}%`
                ),
                opacity: shimmerOpacity
              }}
            ></motion.div>
          )}

          {/* Image Layer */}
          <div className="absolute inset-0 bg-black">
             {card.is_video ? (
                <video src={card.image_url} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-90 glitch-hover" />
             ) : card.image_url ? (
                <img src={card.image_url} alt={card.name} className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110 glitch-hover" />
             ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-600">
                    <ImageOff size={32} />
                    <span className="text-[10px] font-mono mt-2">NO DATA</span>
                </div>
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent opacity-90"></div>
          </div>

          {/* New Tag */}
          {card.is_new && (
            <div className="absolute -top-1 -right-1 z-40 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-[10px] font-black px-3 py-1 skew-x-[-10deg] shadow-lg border-b-2 border-l-2 border-black/20 font-heading">
              NEW
            </div>
          )}

          {/* Content Layer */}
          <div className="relative z-20 flex flex-col h-full p-4 justify-between">
            {/* Header */}
            <div className="flex justify-between items-start">
               <div className={`flex items-center gap-1.5 px-2 py-1 rounded-sm bg-black/60 backdrop-blur-md border border-white/10 ${rarityColor.split(' ')[0]}`}>
                 {getRarityIcon()}
                 <span className="text-[10px] font-black uppercase tracking-wider font-heading">{card.rarity === 'Super-Rare' ? 'S. RARE' : card.rarity}</span>
               </div>
               
               <div className="flex flex-col items-end gap-1">
                 {isFoil && (
                   <div className="bg-gradient-to-r from-amber-300 to-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded-sm shadow-lg font-heading tracking-widest flex items-center gap-1">
                     <Sparkles size={8} className="fill-black" /> FOIL
                   </div>
                 )}
                 {showQuantity && (card.quantity || 0) > 1 && (
                   <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-sm shadow-lg border border-indigo-400/30 font-mono">
                     x{card.quantity}
                   </div>
                 )}
               </div>
            </div>

            {/* Footer / Info */}
            <div>
              <div className="mb-2">
                <h3 className="font-heading font-black text-sm leading-tight text-white tracking-wide drop-shadow-md uppercase mb-1 truncate">{card.name}</h3>
                <div className="flex items-center gap-2 mb-2">
                   <div className="h-0.5 w-8 bg-current rounded-full opacity-50"></div>
                   <span className="text-[9px] font-mono text-slate-300 uppercase tracking-widest">{card.card_type}</span>
                </div>
              </div>
              
              <div className="bg-slate-950/80 backdrop-blur-sm rounded-sm p-2 border border-white/10 group-hover:border-white/20 transition-colors">
                <p className="text-[9px] text-slate-300 leading-relaxed font-medium line-clamp-3 italic opacity-90 font-mono">
                  "{card.description || card.flavor_text || "Standard issue digital card."}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back of Card (Face Down) */}
        <div 
          className="absolute inset-0 rounded-xl border-[3px] border-slate-700 bg-slate-900 flex items-center justify-center overflow-hidden shadow-2xl"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black"></div>
           <div className="absolute inset-0 opacity-10" style={{ 
             backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .3) 25%, rgba(255, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .3) 75%, rgba(255, 255, 255, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .3) 25%, rgba(255, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .3) 75%, rgba(255, 255, 255, .3) 76%, transparent 77%, transparent)',
             backgroundSize: '30px 30px'
           }}></div>

           <div className="relative z-10 text-center">
             <div className="w-16 h-16 mx-auto mb-3 border-2 border-indigo-500/30 rounded-full flex items-center justify-center bg-indigo-500/10 backdrop-blur-sm relative">
                <div className="absolute inset-0 rounded-full border border-t-indigo-400 border-r-transparent border-b-indigo-400 border-l-transparent animate-spin"></div>
                <Zap size={24} className="text-indigo-400" />
             </div>
             <div className="font-heading text-xl font-black text-white tracking-tighter drop-shadow-[2px_2px_0_rgba(236,72,153,1)]">FRY<span className="text-indigo-500">CARDS</span></div>
             <div className="text-[8px] font-mono text-slate-500 tracking-[0.3em] mt-1">SECURE CARD</div>
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CardDisplay;
