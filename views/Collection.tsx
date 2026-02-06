
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useGame } from '../context/GameContext';
import { Card } from '../types';
import CardDisplay from '../components/CardDisplay';
import { Filter, Trash2, ChevronLeft, ChevronRight, Search, SortAsc, Info, AlertCircle, RefreshCw, Sparkles, Coins } from 'lucide-react';
import { RARITY_COLORS } from '../constants';

const Collection: React.FC = () => {
  const { user, refreshDashboard, showToast } = useGame();
  const [cards, setCards] = useState<Card[]>([]);
  const [page, setPage] = useState(0);
  const [filterRarity, setFilterRarity] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('rarity');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [millingAll, setMillingAll] = useState(false);
  
  // Modals State
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [processingAction, setProcessingAction] = useState(false);

  const LIMIT = 20;
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadCards = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('get_user_collection', {
        p_user_id: user.id,
        p_rarity: filterRarity || null,
        p_sort_by: sortBy,
        p_limit: LIMIT,
        p_offset: page * LIMIT
      });
      
      if (error) {
          throw error;
      }
      
      if (mountedRef.current) {
        setCards(data || []);
        
        // Mark "New" cards as seen
        const newCardIds = (data as Card[])?.filter(c => c.is_new).map(c => c.id);
        if (newCardIds && newCardIds.length > 0) {
          try {
            // Attempt standard update if RPC fails or is missing
             await supabase.from('user_cards')
               .update({ is_new: false })
               .in('card_id', newCardIds)
               .eq('user_id', user.id);
          } catch (e) {
            console.warn('Failed to mark cards as seen', e);
          }
        }
      }
    } catch(e: any) {
      console.error("Collection Load Error:", e);
      if (mountedRef.current) {
        setError(e.message || "Failed to load collection.");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user, filterRarity, sortBy, page]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleQuicksell = async (card: Card, isFoil: boolean) => {
    if (!user) return;
    
    const qty = isFoil ? card.foil_quantity : card.quantity;
    if (!qty || qty <= 0) return;

    if (!confirm(`Sell 1 ${isFoil ? 'FOIL' : ''} copy of ${card.name} for Gold?`)) return;

    setProcessingAction(true);
    try {
        const { data, error } = await supabase.rpc('quicksell_card', {
            p_user_id: user.id,
            p_card_id: card.id,
            p_is_foil: isFoil
        });

        if (error) throw error;
        
        showToast(`Sold for ${data} Gold`, 'success');
        
        // Update local state temporarily
        if (selectedCard && selectedCard.id === card.id) {
             const updated = { ...selectedCard };
             if (isFoil) updated.foil_quantity = (updated.foil_quantity || 1) - 1;
             else updated.quantity = (updated.quantity || 1) - 1;
             setSelectedCard(updated);
        }
        await Promise.all([loadCards(), refreshDashboard()]);

    } catch (e: any) {
        showToast(e.message, 'error');
    } finally {
        setProcessingAction(false);
    }
  };

  const handleMillAllDuplicates = async () => {
    if (!user || cards.length === 0) return;
    
    const duplicates = cards.filter(c => (c.quantity || 0) > 1);
    if (duplicates.length === 0) {
      showToast("No duplicates detected in current sector.", 'info');
      return;
    }

    if (!window.confirm(`Found assets with duplicates. Proceed to mass recycle into gold?`)) return;

    setMillingAll(true);

    try {
      const items = duplicates.map(c => ({
        card_id: c.id,
        quantity: (c.quantity || 1) - 1
      }));

      const { error } = await supabase.rpc('mill_bulk_duplicates', {
        p_user_id: user.id,
        p_items: items
      });

      if (error) {
        // Fallback
        for (const card of duplicates) {
          await supabase.rpc('mill_duplicates', {
            p_user_id: user.id,
            p_card_id: card.id,
            p_quantity: (card.quantity || 1) - 1
          });
        }
      }
      
      showToast(`Mass recycling complete.`, 'success');
      await Promise.all([loadCards(), refreshDashboard()]);
    } catch (e: any) {
      showToast("Batch operation interrupted.", 'error');
    } finally {
      setMillingAll(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Detail & Mill Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setSelectedCard(null)}>
          <div className="bg-slate-900 p-8 rounded-[2rem] border-2 border-slate-700 max-w-lg w-full shadow-[8px_8px_0_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col md:flex-row gap-8" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500"></div>
            
            <div className="shrink-0 flex justify-center">
              <CardDisplay card={selectedCard} size="md" />
            </div>

            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-heading font-black mb-2 text-white uppercase tracking-tight leading-snug">{selectedCard.name}</h3>
                <p className="text-slate-500 mb-6 text-xs font-mono">Card ID: {selectedCard.id.slice(0, 8)}...{selectedCard.id.slice(-4)}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-950/50 rounded-sm p-3 border border-slate-800">
                    <div className="text-[10px] font-black text-slate-600 uppercase mb-1">Standard Qty</div>
                    <div className="text-xl font-heading font-bold text-white">{selectedCard.quantity || 0}</div>
                  </div>
                  <div className="bg-slate-950/50 rounded-sm p-3 border border-amber-900/30">
                    <div className="text-[10px] font-black text-amber-600 uppercase mb-1 flex items-center gap-1"><Sparkles size={10} /> Foil Qty</div>
                    <div className="text-xl font-heading font-bold text-amber-400">{selectedCard.foil_quantity || 0}</div>
                  </div>
                  <div className="bg-slate-950/50 rounded-sm p-3 border border-slate-800 col-span-2">
                    <div className="text-[10px] font-black text-slate-600 uppercase mb-1">Rarity</div>
                    <div className={`text-xl font-heading font-bold ${RARITY_COLORS[selectedCard.rarity]}`}>{selectedCard.rarity}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => handleQuicksell(selectedCard, false)}
                        disabled={processingAction || (selectedCard.quantity || 0) <= 0}
                        className="bg-slate-800 hover:bg-green-600 hover:text-white py-3 rounded-sm text-slate-400 flex flex-col items-center justify-center gap-1 font-heading font-black text-[10px] transition-all border border-slate-700 disabled:opacity-50"
                    >
                        <span className="flex items-center gap-1"><Coins size={12} /> SELL STD</span>
                    </button>
                    <button 
                        onClick={() => handleQuicksell(selectedCard, true)}
                        disabled={processingAction || (selectedCard.foil_quantity || 0) <= 0}
                        className="bg-slate-800 hover:bg-amber-600 hover:text-white py-3 rounded-sm text-amber-500/80 flex flex-col items-center justify-center gap-1 font-heading font-black text-[10px] transition-all border border-slate-700 disabled:opacity-50"
                    >
                        <span className="flex items-center gap-1"><Sparkles size={12} /> SELL FOIL</span>
                    </button>
                </div>
                
                <button 
                  onClick={() => setSelectedCard(null)}
                  className="w-full py-2 text-slate-500 hover:text-white font-bold transition-colors text-[10px] uppercase tracking-[0.2em] font-mono"
                >
                  CLOSE TERMINAL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-800 pb-8 animate-fade-in">
         <div>
            <h1 className="text-4xl md:text-5xl font-heading font-black text-white tracking-tighter drop-shadow-[4px_4px_0_rgba(6,182,212,0.8)]">
              CARD <span className="text-indigo-500">DATABASE</span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
                <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">Global inventory index // Auth: LEVEL_{user?.id.slice(0,4)}</p>
            </div>
         </div>
         <button 
           onClick={handleMillAllDuplicates}
           disabled={millingAll || loading}
           className="bg-red-900/20 text-red-400 border-2 border-red-500/30 hover:bg-red-500 hover:text-white px-6 py-3 rounded-sm font-bold flex items-center gap-2 transition-all active:translate-y-1 active:shadow-none shadow-[4px_4px_0_rgba(127,29,29,0.4)] disabled:opacity-50 font-heading text-xs"
         >
           {millingAll ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
           MILL DUPLICATES
         </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800 backdrop-blur-xl animate-fade-in">
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-sm px-4 py-3">
             <Filter size={18} className="text-indigo-400" />
             <select 
               className="bg-transparent text-sm focus:outline-none text-slate-200 font-bold uppercase tracking-tight font-mono"
               value={filterRarity}
               onChange={(e) => { setFilterRarity(e.target.value); setPage(0); }}
             >
               <option value="">All Rarities</option>
               {Object.keys(RARITY_COLORS).map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
             </select>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-sm px-4 py-3">
             <SortAsc size={18} className="text-indigo-400" />
             <select 
                className="bg-transparent text-sm focus:outline-none text-slate-200 font-bold uppercase tracking-tight font-mono"
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
            className="p-3 bg-slate-800 rounded-sm hover:bg-slate-700 disabled:opacity-30 transition-all border border-slate-700 hover:border-indigo-400"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="bg-slate-950 px-6 py-3 rounded-sm border border-slate-800 flex flex-col items-center min-w-[120px]">
             <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Sector</span>
             <span className="font-heading text-lg font-black text-indigo-400 leading-none">{page + 1}</span>
          </div>
          <button 
            disabled={cards.length < LIMIT}
            onClick={() => setPage(p => p + 1)}
            className="p-3 bg-slate-800 rounded-sm hover:bg-slate-700 disabled:opacity-30 transition-all border border-slate-700 hover:border-indigo-400"
          >
            <ChevronRight size={20} />
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
          <p className="font-heading text-sm tracking-[0.3em] text-slate-500 animate-pulse">STREAMING CARD DATA...</p>
        </div>
      ) : error ? (
        <div className="h-[40vh] flex flex-col items-center justify-center gap-4 text-red-400">
           <AlertCircle size={48} />
           <p className="font-bold font-mono">{error}</p>
           <button onClick={() => loadCards()} className="px-6 py-2 bg-slate-800 rounded-sm hover:bg-slate-700 text-white font-mono">Retry Connection</button>
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
                    className="bg-slate-900/80 backdrop-blur-md text-slate-300 hover:text-white hover:bg-indigo-600 text-[10px] px-5 py-2.5 rounded-full shadow-2xl border border-slate-700 hover:border-indigo-500 flex items-center gap-2 transition-all font-black uppercase tracking-widest font-mono"
                  >
                    <Info size={12} /> DETAILS
                  </button>
               </div>
            </div>
          )) : (
            <div className="col-span-full py-32 text-slate-500 flex flex-col items-center">
              <Search size={80} className="mb-8 opacity-10" />
              <h3 className="font-heading text-2xl text-slate-700 mb-2 font-black">NO ASSETS FOUND</h3>
              <p className="text-sm font-medium text-slate-600 font-mono">Sync complete. Sector is empty.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Collection;