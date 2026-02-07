
import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { supabase } from '../supabaseClient';
import { Deck, BattleState, Friend, Card } from '../types';
import CardDisplay from '../components/CardDisplay';
import { Sword, Zap, ChevronRight, Trophy, RotateCcw, Activity, Layout, Skull, Users, Cpu, ShieldAlert, Crosshair, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DamageNumber {
  id: string;
  value: number;
  x: number;
  y: number;
  isCrit: boolean;
  target: 'player' | 'opponent';
}

const BattleArena: React.FC = () => {
  const { user, refreshDashboard } = useGame();
  const [userDecks, setUserDecks] = useState<Deck[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  
  // Navigation State
  const [phase, setPhase] = useState<'mode_select' | 'opponent_select' | 'deck_select' | 'battle' | 'result'>('mode_select');
  const [gameMode, setGameMode] = useState<'pve' | 'pvp'>('pve');
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState<{name: string, avatar?: string, id?: string} | null>(null);

  // Battle Logic State
  const [playerPower, setPlayerPower] = useState(0);
  const [attackingCardIndex, setAttackingCardIndex] = useState<number | null>(null);

  const [battle, setBattle] = useState<BattleState>({
    playerHP: 100,
    opponentHP: 100,
    turn: 'player',
    log: ['BATTLE SYSTEM INITIALIZED'],
    isFinished: false
  });

  const [rewards, setRewards] = useState<{xp: number, gold: number} | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Animation states
  const [shakePlayer, setShakePlayer] = useState(false);
  const [shakeOpponent, setShakeOpponent] = useState(false);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);

  const battleLogEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (battleLogEndRef.current) {
      battleLogEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [battle.log]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      const [decksRes, friendsRes] = await Promise.all([
        supabase.from('decks').select('*').eq('user_id', user.id),
        supabase.rpc('get_friends', { p_user_id: user.id })
      ]);
      
      if (decksRes.data) setUserDecks(decksRes.data);
      if (friendsRes.data) setFriends(friendsRes.data);
    };
    loadData();
  }, [user]);

  const calculatePower = (cards: Card[]) => {
    return cards.reduce((total, card) => {
        let statSum = (card.attack || 0) + (card.defense || 0) + (card.hp || 0);
        if (statSum === 0) statSum = 10;
        let rarityMult = 1;
        switch(card.rarity) {
            case 'Uncommon': rarityMult = 1.2; break;
            case 'Rare': rarityMult = 1.5; break;
            case 'Super-Rare': rarityMult = 2.0; break;
            case 'Mythic': rarityMult = 3.0; break;
            case 'Divine': rarityMult = 5.0; break;
        }
        return total + Math.floor(statSum * rarityMult);
    }, 0);
  };

  const initiateBattleSequence = (deck: Deck) => {
    setSelectedDeck(deck);
    setRewards(null);
    setSubmitting(false);
    
    // Calculate Deck Power for Damage Scaling
    const power = calculatePower(deck.cards || []);
    setPlayerPower(power);

    // Default PvE Opponent
    let opponent: { name: string; avatar?: string; id?: string } = { name: 'SYSTEM_GUARDIAN' };
    
    if (gameMode === 'pvp' && selectedOpponent) {
        opponent = selectedOpponent;
    } else {
        setSelectedOpponent(opponent);
    }

    setBattle({
      playerHP: 100,
      opponentHP: 100,
      turn: 'player',
      log: [`CONNECTION ESTABLISHED`, `HOST: ${user?.user_metadata?.full_name || 'OPERATIVE'}`, `TARGET: ${opponent.name}`, `SQUAD POWER: ${power}`],
      isFinished: false
    });
    setPhase('battle');
  };

  const spawnDamageText = (value: number, isCrit: boolean, target: 'player' | 'opponent') => {
    const id = Math.random().toString(36);
    // Randomize position slightly
    const x = Math.random() * 40 - 20;
    const y = Math.random() * 20 - 10;
    
    setDamageNumbers(prev => [...prev, { id, value, isCrit, target, x, y }]);
    
    setTimeout(() => {
      setDamageNumbers(prev => prev.filter(d => d.id !== id));
    }, 1000);
  };

  const submitResults = async (winner: 'player' | 'opponent') => {
    if (!user || submitting) return;
    setSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('submit_battle_result', {
         p_winner_id: winner === 'player' ? user.id : (selectedOpponent?.id || 'cpu'),
         p_loser_id: winner === 'player' ? (selectedOpponent?.id || 'cpu') : user.id,
         p_is_pve: gameMode === 'pve'
      });

      if (!error && data) {
         setRewards({ xp: data.xp_earned || 0, gold: data.gold_earned || 0 });
         await refreshDashboard();
      } else {
         // Fallback visuals if RPC fails or is void
         setRewards({ xp: winner === 'player' ? 100 : 25, gold: winner === 'player' ? 50 : 10 });
      }
    } catch (e) {
      console.error("Battle submission error", e);
    } finally {
      setSubmitting(false);
    }
  };

  const executeTurn = (playerMove: boolean) => {
    if (battle.isFinished) return;

    setBattle(prev => {
      const isPlayerTurn = prev.turn === 'player';
      
      // Calculate Damage based on Power Scaling
      // Base logic: Power ranges from ~50 (starter) to ~1000 (godly)
      // HP is 100. We want battle to last 3-6 turns.
      // Avg dmg should be around 15-25.
      
      let baseDmg = 0;
      if (isPlayerTurn) {
          // Player damage scales with deck power
          // Divisor 10 means 100 power -> 10 dmg (+variance)
          // Divisor 5 means 100 power -> 20 dmg
          const powerFactor = Math.max(1, Math.floor(playerPower / 8));
          baseDmg = powerFactor;
          
          // Animate a random card "attacking"
          if (selectedDeck?.cards?.length) {
              const cardIdx = Math.floor(Math.random() * selectedDeck.cards.length);
              setAttackingCardIndex(cardIdx);
              setTimeout(() => setAttackingCardIndex(null), 500);
          }
      } else {
          // Opponent damage
          // For PvE, scale based on player power to keep it challenging but beatable
          // For PvP, theoretically we should fetch opponent deck power, but here we simulate.
          const opponentPower = gameMode === 'pve' ? Math.floor(playerPower * 0.9) : playerPower;
          const powerFactor = Math.max(1, Math.floor(opponentPower / 8));
          baseDmg = powerFactor;
      }

      const variance = Math.floor(Math.random() * 8) - 4; // +/- 4 variance
      let damage = Math.max(1, baseDmg + variance);
      
      const crit = Math.random() > 0.85;
      if (crit) damage = Math.floor(damage * 1.5);
      
      const attackerName = isPlayerTurn ? 'YOU' : (selectedOpponent?.name || 'ENEMY');

      const nextLog = [...prev.log, 
        `${attackerName} ${crit ? 'CRITICALLY HIT' : 'HIT'} FOR ${damage} DMG`
      ];

      const newOpponentHP = isPlayerTurn ? Math.max(0, prev.opponentHP - damage) : prev.opponentHP;
      const newPlayerHP = !isPlayerTurn ? Math.max(0, prev.playerHP - damage) : prev.playerHP;
      
      // Trigger animations
      if (isPlayerTurn) {
         setShakeOpponent(true);
         spawnDamageText(damage, crit, 'opponent');
         setTimeout(() => setShakeOpponent(false), 500);
      } else {
         setShakePlayer(true);
         spawnDamageText(damage, crit, 'player');
         setTimeout(() => setShakePlayer(false), 500);
      }
      
      const finished = newOpponentHP <= 0 || newPlayerHP <= 0;
      const winner = newOpponentHP <= 0 ? 'player' : (newPlayerHP <= 0 ? 'opponent' : undefined);

      if (finished) {
        nextLog.push(`SESSION TERMINATED. WINNER: ${winner === 'player' ? 'YOU' : selectedOpponent?.name}`);
        // Submit results asynchronously
        setTimeout(() => submitResults(winner!), 500);
      }

      return {
        ...prev,
        playerHP: newPlayerHP,
        opponentHP: newOpponentHP,
        turn: isPlayerTurn ? 'opponent' : 'player',
        log: nextLog,
        isFinished: finished,
        winner
      };
    });
  };

  const surrender = () => {
      if(!confirm("Abort mission? This counts as a loss.")) return;
      setBattle(prev => ({
          ...prev,
          playerHP: 0,
          isFinished: true,
          winner: 'opponent',
          log: [...prev.log, 'MISSION ABORTED BY USER.']
      }));
      submitResults('opponent');
  };

  // Auto opponent turn
  useEffect(() => {
    if (battle.turn === 'opponent' && !battle.isFinished && phase === 'battle') {
      const timer = setTimeout(() => executeTurn(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [battle.turn, battle.isFinished, phase]);

  const handleModeSelect = (mode: 'pve' | 'pvp') => {
      setGameMode(mode);
      if (mode === 'pve') {
          setSelectedOpponent({ name: 'SYSTEM_GUARDIAN' });
          setPhase('deck_select');
      } else {
          setPhase('opponent_select');
      }
  };

  // --- RENDER PHASES ---

  if (phase === 'mode_select') {
      return (
        <div className="max-w-5xl mx-auto py-10 animate-fade-in">
             <div className="text-center mb-16">
                <Sword className="mx-auto text-indigo-500 mb-6" size={60} />
                <h1 className="text-5xl font-heading font-black text-white mb-4 tracking-tighter">BATTLE <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">ARENA</span></h1>
                <p className="text-slate-500 font-mono text-sm uppercase tracking-widest">Select Simulation Parameters</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                 <button onClick={() => handleModeSelect('pve')} className="group relative bg-slate-900 border-2 border-slate-700 hover:border-cyan-500 rounded-2xl p-8 transition-all hover:bg-slate-800 text-left overflow-hidden">
                     <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Cpu size={150} />
                     </div>
                     <div className="relative z-10">
                         <div className="w-16 h-16 bg-cyan-900/30 rounded-full flex items-center justify-center mb-6 border border-cyan-500/30">
                             <Cpu size={32} className="text-cyan-400" />
                         </div>
                         <h3 className="text-2xl font-heading font-black text-white mb-2">TRAINING SIM</h3>
                         <p className="text-slate-400 text-sm font-mono mb-6">Battle against the System Guardian AI to test your deck composition and earn basic XP.</p>
                         <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-widest group-hover:gap-3 transition-all">
                             Select Mode <ChevronRight size={14} />
                         </div>
                     </div>
                 </button>

                 <button onClick={() => handleModeSelect('pvp')} className="group relative bg-slate-900 border-2 border-slate-700 hover:border-indigo-500 rounded-2xl p-8 transition-all hover:bg-slate-800 text-left overflow-hidden">
                     <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Users size={150} />
                     </div>
                     <div className="relative z-10">
                         <div className="w-16 h-16 bg-indigo-900/30 rounded-full flex items-center justify-center mb-6 border border-indigo-500/30">
                             <Users size={32} className="text-indigo-400" />
                         </div>
                         <h3 className="text-2xl font-heading font-black text-white mb-2">FRIENDLY DUEL</h3>
                         <p className="text-slate-400 text-sm font-mono mb-6">Challenge an operative from your friends list. Test your meta against human intelligence.</p>
                         <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest group-hover:gap-3 transition-all">
                             Select Mode <ChevronRight size={14} />
                         </div>
                     </div>
                 </button>
             </div>
        </div>
      )
  }

  if (phase === 'opponent_select') {
      return (
        <div className="max-w-3xl mx-auto py-10 animate-fade-in">
            <button onClick={() => setPhase('mode_select')} className="mb-8 text-slate-500 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors">
                <ChevronRight className="rotate-180" size={14} /> Back to Mode Select
            </button>
            <h2 className="text-3xl font-heading font-black text-white mb-8 text-center">SELECT <span className="text-indigo-500">OPPONENT</span></h2>
            
            <div className="grid grid-cols-1 gap-4">
                {friends.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800">
                        <ShieldAlert className="mx-auto text-slate-600 mb-4" size={48} />
                        <p className="text-slate-500 font-bold uppercase">No operatives found in network.</p>
                        <a href="#/friends" className="text-indigo-400 hover:text-indigo-300 text-sm underline mt-2 inline-block">Add friends to duel</a>
                    </div>
                ) : (
                    friends.map(friend => (
                        <div key={friend.id} className="flex items-center justify-between p-4 bg-slate-900 border border-slate-700 rounded-xl hover:border-indigo-500 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden border border-slate-600">
                                    {friend.avatar_url ? <img src={friend.avatar_url} className="w-full h-full object-cover" /> : <Users className="m-auto mt-3 text-slate-600" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-lg">{friend.username}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                        <span className="text-xs text-slate-500 uppercase tracking-wider font-mono">ONLINE</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setSelectedOpponent({ name: friend.username, avatar: friend.avatar_url, id: friend.friend_id });
                                    setPhase('deck_select');
                                }}
                                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-indigo-500 transition-colors shadow-lg"
                            >
                                Challenge
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
      )
  }

  if (phase === 'deck_select') {
    return (
      <div className="max-w-4xl mx-auto py-10 animate-fade-in">
        <button onClick={() => setPhase('mode_select')} className="mb-8 text-slate-500 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors">
            <ChevronRight className="rotate-180" size={14} /> Abort Mission
        </button>

        <div className="text-center mb-10">
          <Crosshair className="mx-auto text-red-500 mb-4" size={40} />
          <h2 className="text-3xl font-heading font-black text-white mb-2 uppercase">DEPLOY <span className="text-indigo-500">SQUAD</span></h2>
          <p className="text-slate-500 text-sm font-mono">Target: <span className="text-white font-bold">{selectedOpponent?.name}</span></p>
        </div>

        {userDecks.length === 0 ? (
          <div className="glass p-12 text-center rounded-sm border-2 border-slate-800">
             <Layout className="mx-auto text-slate-700 mb-4" size={40} />
             <p className="text-slate-500 font-bold mb-6 uppercase tracking-widest font-mono text-xs">NO COMBAT SQUADS DETECTED</p>
             <a href="#/decks" className="inline-block bg-indigo-600 text-white px-8 py-4 rounded-sm font-heading text-xs shadow-xl hover:bg-indigo-500 transition-colors">GO TO CONSTRUCTOR</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userDecks.map(deck => {
                const deckPower = calculatePower(deck.cards || []);
                return (
                  <button 
                    key={deck.id}
                    onClick={() => initiateBattleSequence(deck)}
                    className="group relative glass p-8 rounded-sm border-2 border-slate-800 hover:border-indigo-500 transition-all text-left overflow-hidden"
                  >
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Sword size={120} />
                    </div>
                    <div className="relative z-10">
                       <h3 className="text-xl font-heading font-black text-white mb-2">{deck.name}</h3>
                       <div className="flex gap-2 mb-6">
                          <div className="px-3 py-1 bg-slate-950 border border-slate-800 text-[10px] font-black text-indigo-400">{(deck.card_ids || []).length} CARDS</div>
                          <div className="px-3 py-1 bg-slate-950 border border-slate-800 text-[10px] font-black text-yellow-500 flex items-center gap-1">
                             <Zap size={10} /> PWR {deckPower}
                          </div>
                       </div>
                       <div className="flex items-center gap-2 text-indigo-500 font-heading text-[10px] group-hover:translate-x-2 transition-transform">
                         DEPLOY SQUAD <ChevronRight size={14} />
                       </div>
                    </div>
                  </button>
                )
            })}
          </div>
        )}
      </div>
    );
  }

  // --- BATTLE PHASE ---

  return (
    <div className="min-h-[80vh] flex flex-col gap-8 pb-20 animate-fade-in relative">
       {/* Floating Damage Numbers */}
       <AnimatePresence>
          {damageNumbers.map(dn => (
            <motion.div
              key={dn.id}
              initial={{ opacity: 1, y: 0, scale: 0.5 }}
              animate={{ opacity: 0, y: -50, scale: dn.isCrit ? 1.5 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className={`absolute z-50 font-black pointer-events-none drop-shadow-lg text-4xl font-heading
                ${dn.target === 'player' ? 'text-red-500 left-1/4' : 'text-yellow-400 right-1/4'}
              `}
              style={{ top: '30%', left: dn.target === 'player' ? '25%' : '75%', transform: `translate(${dn.x}px, ${dn.y}px)` }}
            >
               {dn.value}
               {dn.isCrit && <span className="text-sm block text-center text-white">CRIT!</span>}
            </motion.div>
          ))}
       </AnimatePresence>

       {/* Arena Layout */}
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch flex-1">
          
          {/* Left: Player Field */}
          <div className={`lg:col-span-4 flex flex-col justify-between transition-transform ${shakePlayer ? 'translate-x-[-10px]' : ''}`}>
             <div className="space-y-4">
                <div className="flex justify-between items-end">
                   <h2 className="font-heading text-xs text-white uppercase tracking-widest">OPERATOR: {user?.user_metadata?.full_name || 'YOU'}</h2>
                   <span className="font-mono text-xl font-black text-indigo-400">{battle.playerHP}%</span>
                </div>
                <div className="h-6 w-full bg-slate-950 border-2 border-slate-800 p-1 rounded-sm overflow-hidden">
                   <motion.div 
                     animate={{ width: `${battle.playerHP}%` }}
                     className={`h-full rounded-sm shadow-lg ${battle.playerHP < 30 ? 'bg-red-500 shadow-red-500/50' : 'bg-indigo-500 shadow-indigo-500/50'}`} 
                   />
                </div>
                <div className="flex justify-between items-center bg-slate-950/50 px-3 py-1 rounded border border-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-black uppercase">SQUAD POWER</span>
                    <span className="text-yellow-400 font-bold font-mono flex items-center gap-1"><Zap size={10}/> {playerPower}</span>
                </div>
             </div>

             <div className="flex flex-wrap gap-2 justify-center py-8">
                {selectedDeck?.cards ? selectedDeck.cards.map((card, i) => (
                  <motion.div 
                    key={i} 
                    animate={attackingCardIndex === i ? { y: -30, scale: 1.1, zIndex: 10 } : { y: 0, scale: 0.75, zIndex: 1 }}
                    className={`origin-bottom transition-all cursor-pointer ${attackingCardIndex === i ? 'opacity-100 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'opacity-80 hover:opacity-100 hover:scale-90'}`}
                  >
                     <CardDisplay card={card} size="sm" />
                  </motion.div>
                )) : (
                  <div className="text-[10px] font-mono text-slate-700">BIOMETRIC ASSETS LOADED</div>
                )}
             </div>

             <div className="space-y-3">
                 <button 
                   disabled={battle.turn !== 'player' || battle.isFinished}
                   onClick={() => executeTurn(true)}
                   className={`w-full py-6 rounded-sm font-heading font-black text-sm tracking-widest shadow-2xl transition-all
                     ${battle.turn === 'player' 
                       ? 'bg-indigo-600 text-white border-b-4 border-indigo-800 hover:brightness-110 active:translate-y-1 active:border-b-0' 
                       : 'bg-slate-800 text-slate-500 cursor-wait'}
                   `}
                 >
                   {battle.turn === 'player' ? 'EXECUTE ATTACK' : 'WAITING FOR OPPONENT...'}
                 </button>
                 {!battle.isFinished && (
                     <button onClick={surrender} className="w-full py-2 text-slate-600 text-[10px] font-bold uppercase hover:text-red-500 flex items-center justify-center gap-2">
                         <Skull size={12} /> Surrender
                     </button>
                 )}
             </div>
          </div>

          {/* Center: Battle Feed */}
          <div className="lg:col-span-4 flex flex-col bg-slate-950/80 border-2 border-slate-800 rounded-sm overflow-hidden h-[400px] lg:h-auto">
             <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                   <Activity size={14} className="text-indigo-500 animate-pulse" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Combat Log</span>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-2 custom-scrollbar">
                {battle.log.map((entry, i) => (
                  <div key={i} className={`p-2 rounded-sm border-l-2 ${entry.includes('WINNER') ? 'border-green-500 text-green-400 bg-green-500/5' : entry.includes('TERMINATED') ? 'border-red-500 text-red-400 bg-red-500/5' : 'border-indigo-500/30 text-slate-400'}`}>
                    <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                    {entry}
                  </div>
                ))}
                <div ref={battleLogEndRef} />
             </div>
          </div>

          {/* Right: Opponent Field */}
          <div className={`lg:col-span-4 flex flex-col justify-between transition-transform ${shakeOpponent ? 'translate-x-[10px]' : ''}`}>
             <div className="space-y-4">
                <div className="flex justify-between items-end">
                   <span className="font-mono text-xl font-black text-red-400">{battle.opponentHP}%</span>
                   <h2 className="font-heading text-xs text-white uppercase tracking-widest">{selectedOpponent?.name}</h2>
                </div>
                <div className="h-6 w-full bg-slate-950 border-2 border-slate-800 p-1 rounded-sm overflow-hidden">
                   <motion.div 
                      animate={{ width: `${battle.opponentHP}%` }}
                      className={`h-full rounded-sm shadow-lg ml-auto ${battle.opponentHP < 30 ? 'bg-red-500 shadow-red-500/50' : 'bg-red-600 shadow-red-600/50'}`} 
                   />
                </div>
                <div className="flex justify-between items-center bg-slate-950/50 px-3 py-1 rounded border border-slate-800/50">
                    <span className="text-yellow-400 font-bold font-mono flex items-center gap-1"><Zap size={10}/> {gameMode === 'pve' ? Math.floor(playerPower * 0.9) : '???' }</span>
                    <span className="text-[10px] text-slate-500 font-black uppercase">THREAT LEVEL</span>
                </div>
             </div>

             <div className="flex flex-wrap gap-2 justify-center py-8 opacity-40 grayscale group-hover:grayscale-0">
                {selectedOpponent?.avatar ? (
                     <img src={selectedOpponent.avatar} className="w-32 h-32 rounded-full border-4 border-red-500/50 grayscale opacity-50" />
                ) : (
                    [1,2,3,4,5].map(i => (
                        <div key={i} className="scale-75 origin-top border-2 border-red-500/30 rounded-xl w-[135px] h-[180px] bg-slate-900 flex items-center justify-center">
                            <Zap size={32} className="text-red-500 opacity-20" />
                        </div>
                    ))
                )}
             </div>

             <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-sm text-center font-mono text-[10px] text-slate-600 uppercase tracking-[0.3em]">
                {battle.isFinished ? 'SYSTEMS OFFLINE' : 'HOSTILE PROTOCOLS ACTIVE'}
             </div>
          </div>
       </div>

       {/* Result Overlay */}
       <AnimatePresence>
         {battle.isFinished && (
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4"
           >
              <div className={`max-w-md w-full p-12 rounded-sm border-2 text-center shadow-2xl relative overflow-hidden ${battle.winner === 'player' ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20'}`}>
                 <div className="absolute inset-0 bg-space opacity-50 -z-10"></div>
                 
                 <div className="mb-6">
                   {battle.winner === 'player' ? <Trophy size={80} className="mx-auto text-yellow-400 drop-shadow-lg" /> : <RotateCcw size={80} className="mx-auto text-red-500 drop-shadow-lg" />}
                 </div>
                 <h2 className="text-4xl font-heading font-black text-white mb-2 tracking-tighter">
                   {battle.winner === 'player' ? 'VICTORY' : 'DEFEAT'}
                 </h2>
                 <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mb-10">Combat session terminated.</p>
                 
                 <div className="bg-slate-950/80 p-6 border border-slate-800 mb-8 backdrop-blur-sm">
                    {submitting ? (
                        <div className="flex flex-col items-center">
                            <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full mb-2"></div>
                            <div className="text-[10px] text-slate-500 font-mono uppercase">Submitting Battle Results...</div>
                        </div>
                    ) : (
                        <div className="flex justify-around">
                            <div>
                                <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">XP EARNED</div>
                                <div className="text-3xl font-heading text-indigo-400">{rewards ? `+${rewards.xp}` : '---'}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">GOLD EARNED</div>
                                <div className="text-3xl font-heading text-yellow-400">{rewards ? `+${rewards.gold}` : '---'}</div>
                            </div>
                        </div>
                    )}
                 </div>

                 <div className="flex flex-col gap-4">
                    <button 
                      onClick={() => initiateBattleSequence(selectedDeck!)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-sm font-heading text-[10px] tracking-widest transition-all shadow-xl"
                    >
                      RESTART COMBAT
                    </button>
                    <button 
                      onClick={() => setPhase('mode_select')}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-sm font-heading text-[10px] tracking-widest transition-all"
                    >
                      RETURN TO LOBBY
                    </button>
                 </div>
              </div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
};

export default BattleArena;
