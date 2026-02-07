

import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { supabase } from '../supabaseClient';
import { TradeOffer, Friend, Card } from '../types';
import { Repeat, Plus, X, ArrowRight, Check, AlertCircle, Search, ChevronRight, ChevronLeft } from 'lucide-react';
import CardDisplay from '../components/CardDisplay';
import { motion, AnimatePresence } from 'framer-motion';

const Trading: React.FC = () => {
  const { user, showToast } = useGame();
  const [activeTab, setActiveTab] = useState<'active' | 'create'>('active');
  const [trades, setTrades] = useState<TradeOffer[]>([]);
  
  // Creation Flow State
  const [step, setStep] = useState(1); // 1: Partner, 2: Give, 3: Get, 4: Confirm
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  
  // Inventory Data
  const [myInventory, setMyInventory] = useState<Card[]>([]);
  const [partnerInventory, setPartnerInventory] = useState<Card[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  
  // Selection
  const [offeredCards, setOfferedCards] = useState<Card[]>([]);
  const [requestedCards, setRequestedCards] = useState<Card[]>([]);
  const [goldOffer, setGoldOffer] = useState(0);
  const [requestedGold, setRequestedGold] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchTrades();
    if (activeTab === 'create') {
        fetchFriends();
        fetchInventory(user.id, true);
    }
  }, [user, activeTab]);

  useEffect(() => {
      if (selectedFriend && step === 3) {
          fetchInventory(selectedFriend, false);
      }
  }, [step, selectedFriend]);

  const fetchTrades = async () => {
    const { data } = await supabase.from('trade_offers').select('*').or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`).order('created_at', { ascending: false });
    if (data) setTrades(data as any);
  };

  const fetchFriends = async () => {
    const { data } = await supabase.rpc('get_friends', { p_user_id: user?.id });
    if (data) setFriends(data);
  };

  const fetchInventory = async (targetId: string, isSelf: boolean) => {
    setIsLoadingInventory(true);
    try {
        const { data } = await supabase.rpc('get_user_collection', { p_user_id: targetId, p_limit: 1000 });
        if (data) {
            if (isSelf) setMyInventory(data);
            else setPartnerInventory(data);
        }
    } catch(e) {
        console.error(e);
        showToast("Could not access inventory manifest.", 'error');
    } finally {
        setIsLoadingInventory(false);
    }
  };

  const createTrade = async () => {
    if (!selectedFriend) return showToast('Select a friend', 'error');
    if (offeredCards.length === 0 && goldOffer === 0 && requestedCards.length === 0 && requestedGold === 0) return showToast('Trade cannot be completely empty', 'error');

    const senderIds = offeredCards.map(c => c.id);
    const receiverIds = requestedCards.map(c => c.id);

    const { error } = await supabase.rpc('create_trade_offer', {
        p_receiver_id: selectedFriend,
        p_sender_card_ids: senderIds,
        p_receiver_card_ids: receiverIds,
        p_sender_gold: goldOffer,
        p_receiver_gold: requestedGold,
        p_message: "Trade Offer"
    });

    if (error) showToast(error.message, 'error');
    else {
        showToast('Trade offer sent!', 'success');
        resetCreateForm();
        fetchTrades();
        setActiveTab('active');
    }
  };

  const resetCreateForm = () => {
      setStep(1);
      setSelectedFriend('');
      setOfferedCards([]);
      setRequestedCards([]);
      setGoldOffer(0);
      setRequestedGold(0);
  };

  const cancelTrade = async (tradeId: string) => {
      if(!confirm("Cancel this trade offer?")) return;
      const { error } = await supabase.rpc('cancel_trade', { p_trade_id: tradeId });
      if (error) showToast(error.message, 'error');
      else {
          showToast('Trade cancelled', 'success');
          fetchTrades();
      }
  };

  const respondTrade = async (tradeId: string, accept: boolean) => {
      // Backend expects p_action: 'accept' | 'decline'
      const { error } = await supabase.rpc('respond_to_trade_offer', { 
          p_trade_id: tradeId,
          p_action: accept ? 'accept' : 'decline' 
      });

      if (error) showToast(error.message, 'error');
      else {
          showToast(accept ? 'Trade Accepted!' : 'Trade Declined', 'success');
          fetchTrades();
      }
  };

  const toggleCardSelection = (card: Card, isRequest: boolean) => {
      const targetList = isRequest ? requestedCards : offeredCards;
      const setTarget = isRequest ? setRequestedCards : setOfferedCards;
      
      if (targetList.find(c => c.id === card.id)) {
          setTarget(prev => prev.filter(c => c.id !== card.id));
      } else {
          if (targetList.length >= 5) return showToast('Max 5 cards per side', 'info');
          setTarget(prev => [...prev, card]);
      }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
       <div className="text-center mb-10">
        <h1 className="text-4xl font-heading font-black mb-2">SECURE <span className="text-indigo-500">TRADING</span></h1>
        <p className="text-slate-400">Exchange assets with trusted operatives.</p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="bg-slate-900/50 p-2 rounded-2xl border border-slate-800 inline-flex gap-2">
            <button onClick={() => setActiveTab('active')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>Active Offers</button>
            <button onClick={() => setActiveTab('create')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'create' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>Create Offer</button>
        </div>
      </div>

      {activeTab === 'active' && (
          <div className="space-y-6">
              {trades.length === 0 ? <p className="text-center text-slate-500 italic py-10">No active trades.</p> : trades.map(trade => {
                  const isIncoming = trade.receiver_id === user?.id;
                  const isPending = trade.status === 'pending';
                  
                  return (
                      <div key={trade.id} className="glass p-6 rounded-2xl border border-slate-700">
                          <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                              <div className="font-bold text-slate-400 text-sm uppercase tracking-widest flex items-center gap-2">
                                  {isIncoming ? (
                                     <>From: <span className="text-white">{trade.sender_username}</span></>
                                  ) : (
                                     <>To: <span className="text-white">{trade.receiver_username}</span></>
                                  )}
                              </div>
                              <div className={`text-xs font-black uppercase px-2 py-1 rounded ${trade.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : trade.status === 'accepted' ? 'bg-green-500/20 text-green-500' : 'bg-slate-700 text-slate-300'}`}>
                                  {trade.status}
                              </div>
                          </div>
                          
                          <div className="flex flex-col md:flex-row items-center gap-8">
                              <div className="flex-1 text-center w-full">
                                  <div className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-widest">OFFERING</div>
                                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 min-h-[100px] flex items-center justify-center">
                                      {(!trade.sender_cards || trade.sender_cards.length === 0) && trade.sender_gold === 0 ? (
                                          <span className="text-slate-600 text-xs">Empty Offer</span>
                                      ) : (
                                          <div className="flex flex-wrap justify-center gap-2">
                                              {trade.sender_cards?.map((c: any, i: number) => (
                                                  <div key={i} className="w-16 h-24 bg-slate-800 rounded border border-slate-600 flex items-center justify-center text-[8px] overflow-hidden relative group">
                                                      <span className="text-slate-500 font-mono">ASSET</span>
                                                  </div>
                                              ))}
                                              {trade.sender_gold > 0 && (
                                                  <div className="w-16 h-24 bg-yellow-900/20 border border-yellow-500/50 rounded flex flex-col items-center justify-center text-yellow-500 font-bold text-xs p-1">
                                                      <div>{trade.sender_gold}</div>
                                                      <div className="text-[8px]">GOLD</div>
                                                  </div>
                                              )}
                                          </div>
                                      )}
                                  </div>
                              </div>
                              
                              <ArrowRight className="text-slate-600" />

                              <div className="flex-1 text-center w-full">
                                  <div className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-widest">REQUESTING</div>
                                   <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 min-h-[100px] flex items-center justify-center">
                                      {(!trade.receiver_cards || trade.receiver_cards.length === 0) && (!trade.receiver_gold || trade.receiver_gold === 0) ? (
                                          <span className="text-slate-500 text-sm italic">(No assets requested)</span>
                                      ) : (
                                        <div className="flex flex-wrap justify-center gap-2">
                                          {trade.receiver_cards?.map((c: any, i: number) => (
                                              <div key={i} className="w-16 h-24 bg-slate-800 rounded border border-slate-600 flex items-center justify-center text-[8px] overflow-hidden relative group">
                                                  <span className="text-slate-500 font-mono">ASSET</span>
                                              </div>
                                          ))}
                                          {trade.receiver_gold > 0 && (
                                              <div className="w-16 h-24 bg-yellow-900/20 border border-yellow-500/50 rounded flex flex-col items-center justify-center text-yellow-500 font-bold text-xs p-1">
                                                  <div>{trade.receiver_gold}</div>
                                                  <div className="text-[8px]">GOLD</div>
                                              </div>
                                          )}
                                        </div>
                                      )}
                                  </div>
                              </div>
                          </div>

                          {isPending && (
                              <div className="flex justify-end gap-3 mt-6 border-t border-slate-800 pt-4">
                                  {isIncoming ? (
                                      <>
                                          <button 
                                              onClick={() => respondTrade(trade.id, false)}
                                              className="bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 hover:border-transparent px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
                                          >
                                              Decline
                                          </button>
                                          <button 
                                              onClick={() => respondTrade(trade.id, true)}
                                              className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider shadow-lg transition-all"
                                          >
                                              Accept Transfer
                                          </button>
                                      </>
                                  ) : (
                                      <button 
                                          onClick={() => cancelTrade(trade.id)}
                                          className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
                                      >
                                          Cancel Offer
                                      </button>
                                  )}
                              </div>
                          )}
                      </div>
                  )
              })}
          </div>
      )}

      {activeTab === 'create' && (
          <div className="glass p-8 rounded-2xl border border-slate-700">
             {/* Stepper */}
             <div className="flex items-center justify-between mb-8 max-w-xl mx-auto">
                {[1, 2, 3, 4].map(s => (
                    <div key={s} className="flex flex-col items-center relative z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                            {s}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-slate-500 mt-2">
                            {s === 1 ? 'Partner' : s === 2 ? 'Give' : s === 3 ? 'Receive' : 'Confirm'}
                        </div>
                    </div>
                ))}
                <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-800 -z-0 max-w-xl mx-auto translate-y-[2px]"></div>
             </div>

             <AnimatePresence mode="wait">
                 {step === 1 && (
                     <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} key="step1" className="max-w-md mx-auto">
                         <h3 className="text-xl font-heading font-black text-white mb-6 text-center">SELECT TRADING PARTNER</h3>
                         <div className="space-y-2 max-h-[400px] overflow-y-auto">
                             {friends.map(f => (
                                 <button 
                                    key={f.friend_id}
                                    onClick={() => { setSelectedFriend(f.friend_id); setStep(2); }}
                                    className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center gap-4 transition-all group"
                                 >
                                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-slate-600 group-hover:border-indigo-500">
                                        {f.avatar_url && <img src={f.avatar_url} className="w-full h-full object-cover" />}
                                    </div>
                                    <span className="font-bold text-white text-lg">{f.username}</span>
                                    <ChevronRight className="ml-auto text-slate-600 group-hover:text-indigo-500" />
                                 </button>
                             ))}
                             {friends.length === 0 && <p className="text-slate-500 text-center">No friends available to trade.</p>}
                         </div>
                     </motion.div>
                 )}

                 {step === 2 && (
                     <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} key="step2">
                         <div className="flex justify-between items-end mb-6">
                             <div>
                                <h3 className="text-xl font-heading font-black text-white">YOUR OFFER</h3>
                                <p className="text-slate-500 text-xs">Select up to 5 assets to send.</p>
                             </div>
                             <div className="text-right">
                                 <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Add Gold</label>
                                 <input 
                                    type="number" 
                                    value={goldOffer} 
                                    onChange={e => setGoldOffer(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white w-24 text-right" 
                                 />
                             </div>
                         </div>
                         
                         <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto p-2 custom-scrollbar bg-slate-900/50 rounded-xl border border-slate-800 mb-6">
                            {myInventory.map(card => {
                                const isSelected = offeredCards.find(c => c.id === card.id);
                                return (
                                    <div 
                                      key={card.id} 
                                      onClick={() => toggleCardSelection(card, false)}
                                      className={`cursor-pointer relative transform transition-all ${isSelected ? 'scale-95 ring-2 ring-indigo-500 rounded-lg' : 'hover:scale-105'}`}
                                    >
                                        <CardDisplay card={card} size="sm" showQuantity={false} />
                                        {isSelected && <div className="absolute inset-0 bg-indigo-500/30 rounded-lg flex items-center justify-center"><Check className="text-white bg-indigo-600 rounded-full p-1" size={24} /></div>}
                                    </div>
                                )
                            })}
                         </div>
                         
                         <div className="flex justify-between">
                             <button onClick={() => setStep(1)} className="px-6 py-3 rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-white">Back</button>
                             <button onClick={() => setStep(3)} className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500">Next Step</button>
                         </div>
                     </motion.div>
                 )}

                 {step === 3 && (
                     <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} key="step3">
                         <div className="flex justify-between items-end mb-6">
                             <div>
                                <h3 className="text-xl font-heading font-black text-white mb-2">REQUEST ASSETS</h3>
                                <p className="text-slate-500 text-xs">Select up to 5 assets from {friends.find(f => f.friend_id === selectedFriend)?.username}'s inventory.</p>
                             </div>
                             <div className="text-right">
                                 <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Request Gold</label>
                                 <input 
                                    type="number" 
                                    value={requestedGold} 
                                    onChange={e => setRequestedGold(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white w-24 text-right" 
                                 />
                             </div>
                         </div>

                         {isLoadingInventory ? (
                             <div className="h-[300px] flex items-center justify-center text-indigo-400 font-mono animate-pulse">
                                 ACCESSING REMOTE DATABASE...
                             </div>
                         ) : (
                             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto p-2 custom-scrollbar bg-slate-900/50 rounded-xl border border-slate-800 mb-6">
                                {partnerInventory.length === 0 ? (
                                    <div className="col-span-full py-10 text-center text-slate-500">Friend's inventory is empty or private.</div>
                                ) : partnerInventory.map(card => {
                                    const isSelected = requestedCards.find(c => c.id === card.id);
                                    return (
                                        <div 
                                          key={card.id} 
                                          onClick={() => toggleCardSelection(card, true)}
                                          className={`cursor-pointer relative transform transition-all ${isSelected ? 'scale-95 ring-2 ring-emerald-500 rounded-lg' : 'hover:scale-105'}`}
                                        >
                                            <CardDisplay card={card} size="sm" showQuantity={false} />
                                            {isSelected && <div className="absolute inset-0 bg-emerald-500/30 rounded-lg flex items-center justify-center"><Check className="text-white bg-emerald-600 rounded-full p-1" size={24} /></div>}
                                        </div>
                                    )
                                })}
                             </div>
                         )}
                         
                         <div className="flex justify-between">
                             <button onClick={() => setStep(2)} className="px-6 py-3 rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-white">Back</button>
                             <button onClick={() => setStep(4)} className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500">Review Trade</button>
                         </div>
                     </motion.div>
                 )}

                 {step === 4 && (
                     <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} key="step4" className="max-w-2xl mx-auto">
                         <h3 className="text-xl font-heading font-black text-white mb-6 text-center">CONFIRM TRANSMISSION</h3>
                         
                         <div className="flex flex-col md:flex-row gap-8 mb-8">
                             <div className="flex-1 bg-slate-900 p-4 rounded-xl border border-slate-800">
                                 <div className="text-xs text-slate-500 font-bold uppercase mb-4 text-center">YOU GIVE</div>
                                 <div className="flex flex-wrap gap-2 justify-center mb-4">
                                     {offeredCards.map(c => (
                                         <div key={c.id} className="w-12 h-16 bg-slate-800 rounded border border-slate-700 overflow-hidden"><img src={c.image_url} className="w-full h-full object-cover"/></div>
                                     ))}
                                     {offeredCards.length === 0 && <span className="text-slate-600 text-xs italic">No cards</span>}
                                 </div>
                                 {goldOffer > 0 && <div className="text-center text-yellow-500 font-bold font-mono border-t border-slate-800 pt-2">{goldOffer} GOLD</div>}
                             </div>

                             <div className="flex items-center justify-center">
                                 <ArrowRight className="text-slate-600" />
                             </div>

                             <div className="flex-1 bg-slate-900 p-4 rounded-xl border border-slate-800">
                                 <div className="text-xs text-slate-500 font-bold uppercase mb-4 text-center">YOU GET</div>
                                 <div className="flex flex-wrap gap-2 justify-center">
                                     {requestedCards.map(c => (
                                         <div key={c.id} className="w-12 h-16 bg-slate-800 rounded border border-slate-700 overflow-hidden"><img src={c.image_url} className="w-full h-full object-cover"/></div>
                                     ))}
                                     {requestedCards.length === 0 && <span className="text-slate-600 text-xs italic">No cards</span>}
                                 </div>
                                 {requestedGold > 0 && <div className="text-center text-yellow-500 font-bold font-mono border-t border-slate-800 pt-2">{requestedGold} GOLD</div>}
                             </div>
                         </div>
                         
                         <div className="flex justify-between gap-4">
                             <button onClick={() => setStep(3)} className="flex-1 px-6 py-4 rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-white font-bold">Adjust</button>
                             <button onClick={createTrade} className="flex-[2] px-6 py-4 rounded-lg bg-green-600 text-white font-heading font-black tracking-widest hover:bg-green-500 shadow-xl">INITIATE TRADE</button>
                         </div>
                     </motion.div>
                 )}
             </AnimatePresence>
          </div>
      )}
    </div>
  );
};

export default Trading;