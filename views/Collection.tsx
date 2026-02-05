
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useGame } from '../context/GameContext';
import { Card } from '../types';
import CardDisplay from '../components/CardDisplay';
import { Filter, Trash2, ChevronLeft, ChevronRight, Search, SortAsc, Info } from 'lucide-react';
import { RARITY_COLORS } from '../constants';

const Collection: React.FC = () => {
  const { user, refreshDashboard } = useGame();
  const [cards, setCards] = useState<Card[]>([]);
  const [page, setPage] = useState(0);
  const [filterRarity, setFilterRarity] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('rarity'); // rarity, name, quantity, newest
  const [loading, setLoading] = useState(false);
  const LIMIT = 20;
  
  // Modals State
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const loadCards = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('get_user_collection', {
        p_user_id: user.id,
        p_rarity: filterRarity || null,
        p_sort_by: sortBy,
        p_limit: LIMIT,
        p_offset: page * LIMIT
      });
      if (!error) setCards(data || []);
      else console.error(error);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  }, [user, filterRarity, sortBy, page]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleMill = async (quantity: number) => {
    if (!user || !selectedCard) return;
    
    if ((selectedCard.quantity || 0) <= 1) {
      alert("Cannot mill all copies. Must keep at least 1.");
      return;
    }

    try {
      const { data, error } = await supabase.rpc('mill_duplicates', {
        p_user_id: user.id,
        p_card_id: selectedCard.id,
        p_quantity: quantity
      });

      if (error) throw error;

      setSelectedCard(null);
      await Promise.all([loadCards(), refreshDashboard()]);
      
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Detail & Mill Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setSelectedCard(null)}>
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-700 max-w-lg w-full shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-8" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            <div className="shrink-0 flex justify-center">
              <CardDisplay card={selectedCard} size="md" />
            </div>

            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-heading font-black mb-1 text-white uppercase tracking-tight">{selectedCard.name}</h3>
                <p className="text-slate-500 mb-6 text-sm font-medium">Asset ID: {selectedCard.id.slice(0, 12)}...</p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                    <div className="text-[10px] font-black text-slate-600 uppercase mb-1">Quantity</div>
                    <div className="text-xl font-heading font-bold text-white">{selectedCard.quantity || 1}</div>
                  </div>
                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                    <div className="text-[10px] font-black text-slate-600 uppercase mb-1">Rarity</div>
                    <div className={`text-xl font-heading font-bold ${RARITY_COLORS[selectedCard.rarity]}`}>{selectedCard.rarity}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {(selectedCard.quantity || 0) > 1 ? (
                  <button 
                    onClick={() => handleMill((selectedCard.quantity || 0) - 1)}
                    className="w-full bg-slate-800 hover:bg-red-600/20 hover:text-red-400 py-4 rounded-xl text-slate-400 flex items-center justify-center gap-3 font-heading font-black text-xs transition-all border border-slate-700 hover:border-red-500/30"
                  >
                    <Trash2 size={18} />
                    RECLAIM DUPLICATES
                  </button>
                ) : (
                  <div className="w-full bg-slate-950/50 text-slate-600 py-4 rounded-xl text-center font-bold text-[10px] uppercase tracking-widest border border-slate-800">
                    NO DUPLICATES DETECTED
                  </div>
                )}
                
                <button 
                  onClick={() => setSelectedCard(null)}
                  className="w-full py-2 text-slate-500 hover:text-slate-300 font-bold transition-colors text-[10px] uppercase tracking-[0.2em]"
                >
                  CLOSE TERMINAL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-800 pb-8">
         <div>
            <h1 className="text-5xl font-heading font-black text-white tracking-tighter">
              ASSET <span className="text-indigo-500">DATABASE</span>
            </h1>
            <p className="text-slate-500 text-sm font-mono mt-1 uppercase tracking-widest">Global inventory index // Auth: LEVEL_{user?.id.slice(0,4)}</p>
         </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-slate-900/50 p-6 rounded-[2rem] border border-slate-800 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
             <Filter size={18} className="text-indigo-400" />
             <select 
               className="bg-transparent text-sm focus:outline-none text-slate-200 font-bold uppercase tracking-tight"
               value={filterRarity}
               onChange={(e) => { setFilterRarity(e.target.value); setPage(0); }}
             >
               <option value="">All Rarities</option>
               {Object.keys(RARITY_COLORS).map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
             </select>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
             <SortAsc size={18} className="text-indigo-400" />
             <select 
                className="bg-transparent text-sm focus:outline-none text-slate-200 font-bold uppercase tracking-tight"
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
             >
               <option value="rarity">Sort by Rarity</option>
               <option value="name">Sort by Name</option>
               <option value="quantity">Sort by Quantity</option>
               <option value="newest">Sort by Acquired</option>
             </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 disabled:opacity-30 transition-all active:scale-90"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="bg-slate-950 px-6 py-3 rounded-xl border border-slate-800 flex flex-col items-center min-w-[120px]">
             <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Sector</span>
             <span className="font-heading text-lg font-black text-indigo-400 leading-none">{page + 1}</span>
          </div>
          <button 
            disabled={cards.length < LIMIT}
            onClick={() => setPage(p => p + 1)}
            className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 disabled:opacity-30 transition-all active:scale-90"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="h-[50vh] flex flex-col items-center justify-center gap-6">
          <div className="relative">
             <div className="w-16 h-16 border-4 border-indigo-500/20 rounded-full"></div>
             <div className="absolute inset-0 w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="font-heading text-sm tracking-[0.3em] text-slate-500 animate-pulse">STREAMING DATA ASSETS...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-12 gap-x-8 justify-items-center pt-8">
          {cards.length > 0 ? cards.map(card => (
            <div key={card.id} className="relative group flex flex-col items-center">
               <CardDisplay 
                 card={card} 
                 showQuantity={true}
                 size="md"
                 onClick={() => setSelectedCard(card)}
               />
               <div className="mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 flex gap-2">
                  <button 
                    onClick={() => setSelectedCard(card)}
                    className="bg-slate-900/80 backdrop-blur-md text-slate-300 hover:text-white hover:bg-indigo-600 text-[10px] px-5 py-2.5 rounded-full shadow-2xl border border-slate-700 hover:border-indigo-500 flex items-center gap-2 transition-all font-black uppercase tracking-widest"
                  >
                    <Info size={12} /> DETAILS
                  </button>
               </div>
            </div>
          )) : (
            <div className="col-span-full py-32 text-slate-500 flex flex-col items-center">
              <Search size={80} className="mb-8 opacity-10" />
              <h3 className="font-heading text-2xl text-slate-700 mb-2 font-black">NO RESULTS DETECTED</h3>
              <p className="text-sm font-medium text-slate-600">Adjust filters or expand search range.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Collection;
