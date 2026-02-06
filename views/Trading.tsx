
import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { supabase } from '../supabaseClient';
import { TradeOffer, Friend, Card } from '../types';
import { Repeat, Plus, X, ArrowRight, Check, AlertCircle } from 'lucide-react';
import CardDisplay from '../components/CardDisplay';

const Trading: React.FC = () => {
  const { user, showToast } = useGame();
  const [activeTab, setActiveTab] = useState<'active' | 'create'>('active');
  const [trades, setTrades] = useState<TradeOffer[]>([]);
  
  // Creation State
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const [myInventory, setMyInventory] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [goldOffer, setGoldOffer] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchTrades();
    if (activeTab === 'create') {
        fetchFriends();
        fetchInventory();
    }
  }, [user, activeTab]);

  const fetchTrades = async () => {
    // Attempt to fetch active trades involving the user
    const { data } = await supabase.from('trade_offers').select('*').or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`).order('created_at', { ascending: false });
    if (data) setTrades(data as any);
  };

  const fetchFriends = async () => {
    const { data } = await supabase.rpc('get_friends', { p_user_id: user?.id });
    if (data) setFriends(data);
  };

  const fetchInventory = async () => {
    const { data } = await supabase.rpc('get_user_collection', { p_user_id: user?.id, p_limit: 1000 });
    if (data) setMyInventory(data);
  };

  const createTrade = async () => {
    if (!selectedFriend) return showToast('Select a friend', 'error');
    if (selectedCards.length === 0 && goldOffer === 0) return showToast('Offer cannot be empty', 'error');

    const cardIds = selectedCards.map(c => c.id);
    const { error } = await supabase.rpc('create_trade_offer', {
        p_receiver_id: selectedFriend,
        p_sender_card_ids: cardIds,
        p_receiver_card_ids: [], // One-way trade for now
        p_sender_gold: goldOffer,
        p_receiver_gold: 0,
        p_message: "Trade Offer"
    });

    if (error) showToast(error.message, 'error');
    else {
        showToast('Trade offer sent!', 'success');
        setActiveTab('active');
        setSelectedCards([]);
        setGoldOffer(0);
        setSelectedFriend('');
        fetchTrades();
    }
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
      const { error } = await supabase.rpc('respond_to_trade_offer', { 
          p_trade_id: tradeId,
          p_accept: accept 
      });

      if (error) showToast(error.message, 'error');
      else {
          showToast(accept ? 'Trade Accepted!' : 'Trade Declined', 'success');
          fetchTrades();
      }
  };

  const toggleCardSelection = (card: Card) => {
      if (selectedCards.find(c => c.id === card.id)) {
          setSelectedCards(prev => prev.filter(c => c.id !== card.id));
      } else {
          if (selectedCards.length >= 5) return showToast('Max 5 cards per trade', 'info');
          setSelectedCards(prev => [...prev, card]);
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
                                              {/* Note: In a real app, we'd need to fetch card details for display if not fully populated in trade object. 
                                                  Assuming basic ID/Name is available or just ID for this demo */}
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
                                      <div className="text-slate-500 text-sm italic">
                                          (No assets requested)
                                      </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                  <div className="glass p-6 rounded-xl border border-slate-700">
                      <h3 className="font-bold text-white mb-4">1. Select Partner</h3>
                      <select 
                        value={selectedFriend} 
                        onChange={e => setSelectedFriend(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-white outline-none"
                      >
                          <option value="">Choose a friend...</option>
                          {friends.map(f => <option key={f.friend_id} value={f.friend_id}>{f.username}</option>)}
                      </select>
                  </div>

                  <div className="glass p-6 rounded-xl border border-slate-700">
                      <h3 className="font-bold text-white mb-4">3. Add Gold (Optional)</h3>
                      <input 
                        type="number" 
                        value={goldOffer} 
                        onChange={e => setGoldOffer(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-white outline-none"
                        placeholder="Amount..."
                      />
                  </div>

                  <div className="glass p-6 rounded-xl border border-slate-700">
                      <h3 className="font-bold text-white mb-4">Summary</h3>
                      <div className="space-y-2 mb-6">
                          <div className="flex justify-between text-sm text-slate-400"><span>Cards:</span> <span className="text-white">{selectedCards.length}</span></div>
                          <div className="flex justify-between text-sm text-slate-400"><span>Gold:</span> <span className="text-yellow-400">{goldOffer}</span></div>
                          <div className="flex justify-between text-sm text-slate-400"><span>Target:</span> <span className="text-white">{friends.find(f => f.friend_id === selectedFriend)?.username || '-'}</span></div>
                      </div>
                      <button 
                        onClick={createTrade}
                        disabled={!selectedFriend}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-lg font-bold shadow-lg transition-all active:translate-y-1"
                      >
                          Send Offer
                      </button>
                  </div>
              </div>

              <div className="lg:col-span-2 glass p-6 rounded-xl border border-slate-700">
                  <h3 className="font-bold text-white mb-4">2. Select Assets ({selectedCards.length}/5)</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[600px] overflow-y-auto p-2 custom-scrollbar">
                      {myInventory.map(card => {
                          const isSelected = selectedCards.find(c => c.id === card.id);
                          return (
                              <div 
                                key={card.id} 
                                onClick={() => toggleCardSelection(card)}
                                className={`cursor-pointer relative transform transition-all ${isSelected ? 'scale-95 ring-2 ring-indigo-500 rounded-lg' : 'hover:scale-105'}`}
                              >
                                  <CardDisplay card={card} size="sm" showQuantity={false} />
                                  {isSelected && <div className="absolute inset-0 bg-indigo-500/30 rounded-lg flex items-center justify-center"><Check className="text-white bg-indigo-600 rounded-full p-1" size={24} /></div>}
                              </div>
                          )
                      })}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Trading;
