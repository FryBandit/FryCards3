import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { PackType, PackResult, AffordabilityCheck, Card, CardBack } from '../types';
import { useGame } from '../context/GameContext';
import { Coins, Diamond, ShieldCheck, Sparkle, AlertTriangle, Eye, Sparkles, X, Check, Image as ImageIcon } from 'lucide-react';
import PackOpener from '../components/PackOpener';
import CardDisplay from '../components/CardDisplay';
import { AnimatePresence, motion } from 'framer-motion';
import { callEdge } from '../utils/edgeFunctions';

const Shop: React.FC = () => {
  const { user, refreshDashboard, dashboard, showToast } = useGame();
  
  // Pack State
  const [packs, setPacks] = useState<PackType[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [packResult, setPackResult] = useState<PackResult | null>(null);
  const [openedPackImage, setOpenedPackImage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedPackForPayment, setSelectedPackForPayment] = useState<PackType | null>(null);
  const [payWith, setPayWith] = useState<'gold' | 'gems'>('gold');

  // Card Back State
  const [cardBacks, setCardBacks] = useState<CardBack[]>([]);
  const [loadingCardBacks, setLoadingCardBacks] = useState(true);
  const [purchasingBackId, setPurchasingBackId] = useState<string | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoadingPacks(true);
      setLoadingCardBacks(true);
      
      try {
          // Fetch Packs
          const { data: packsData, error: packsError } = await supabase.rpc('get_available_packs');
          if (packsError) throw packsError;
          if (mountedRef.current) setPacks(packsData || []);
      } catch (err) {
          console.error("Error loading packs:", err);
          if (mountedRef.current) setErrorMsg('Failed to load packs.');
      } finally {
          if (mountedRef.current) setLoadingPacks(false);
      }

      try {
          // Fetch Card Backs
          const { data: backData, error: backError } = await supabase
            .from('card_backs')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: true });
            
          if (backError) throw backError;
          if (mountedRef.current) setCardBacks(backData || []);
      } catch (err) {
          console.error("Error loading card backs:", err);
      } finally {
          if (mountedRef.current) setLoadingCardBacks(false);
      }
    };
    
    loadData();
  }, []);

  const initiatePurchase = (pack: PackType) => {
      if (!dashboard || !dashboard.profile) {
          showToast("Establishing secure connection to profile...", "info");
          refreshDashboard();
          return;
      }

      const hasGoldPrice = pack.cost_gold !== null;
      const hasGemPrice = (pack.cost_gems || 0) > 0;

      if (hasGoldPrice && hasGemPrice) {
          setPayWith('gold');
          setSelectedPackForPayment(pack);
      } else {
          const useGems = !hasGoldPrice && hasGemPrice;
          executePurchase(pack, useGems);
      }
  };

  const executePurchase = async (pack: PackType, useGems: boolean) => {
    if (!user) return;
    if (!dashboard?.profile) {
        showToast("Profile data syncing. Please retry in a moment.", "error");
        return;
    }
    
    setLoadingId(pack.id);
    setOpenedPackImage(pack.image_url);
    setErrorMsg(null);
    setSelectedPackForPayment(null);

    try {
      const cost = useGems ? pack.cost_gems : pack.cost_gold;
      const balance = useGems ? dashboard.profile.gem_balance : dashboard.profile.gold_balance;
      
      if ((balance || 0) < (cost || 0)) {
          showToast(`Insufficient ${useGems ? 'Gems' : 'Gold'}`, 'error');
          if (mountedRef.current) setLoadingId(null);
          return;
      }

      const { data, error } = await supabase.rpc('open_pack', {
        p_user_id: user.id,
        p_pack_type_id: pack.id,
        p_use_gems: useGems
      });

      if (error) throw error;
      
      if (!data) {
         throw new Error("Transaction completed but asset delivery failed.");
      }

      if (mountedRef.current) setPackResult(data);
      await refreshDashboard();
      
    } catch (err: any) {
      console.error(err);
      if (mountedRef.current) setErrorMsg(err.message || "Transaction failed. No funds were deducted.");
      showToast(err.message || "Transaction failed", 'error');
    } finally {
      if (mountedRef.current) setLoadingId(null);
    }
  };

  const handleBuyCardBack = async (cardBack: CardBack) => {
    if (!user) {
        showToast("Authentication required.", "error");
        return;
    }
    
    setPurchasingBackId(cardBack.id);

    try {
        await callEdge('purchase-card-back', { card_back_id: cardBack.id });
        showToast(`${cardBack.name} purchased successfully!`, 'success');
        await refreshDashboard();
    } catch (e: any) {
        console.error(e);
        showToast(e.message || 'Purchase request failed', 'error');
    } finally {
        if (mountedRef.current) setPurchasingBackId(null);
    }
  };

  const closeOpener = () => {
    setPackResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="container mx-auto pb-20">
      <PackOpener 
        packResult={packResult} 
        onClose={closeOpener} 
        packImage={openedPackImage}
      />

      <div className="text-center mb-16 animate-fade-in">
        <h1 className="text-5xl font-heading font-black text-white tracking-tighter mb-4 drop-shadow-[4px_4px_0_rgba(236,72,153,1)]">
          SUPPLY <span className="text-indigo-500">DEPOT</span>
        </h1>
        <div className="h-1 w-24 bg-indigo-500 mx-auto rounded-full mb-6"></div>
        <p className="text-slate-400 font-medium max-w-md mx-auto">Acquire high-value assets and cosmetic upgrades. All transactions are secured via neural link.</p>
      </div>

      {errorMsg && (
        <div className="max-w-md mx-auto mb-8 p-4 bg-red-900/50 border border-red-500 rounded-xl text-white flex items-center gap-3">
          <AlertTriangle className="text-red-500" />
          {errorMsg}
        </div>
      )}

      {/* Packs Section */}
      <div className="mb-20">
          <div className="flex items-center gap-4 mb-8">
             <div className="h-px bg-slate-800 flex-1"></div>
             <h2 className="text-2xl font-heading font-black text-white flex items-center gap-2"><ShieldCheck className="text-indigo-500" /> BOOSTER PACKS</h2>
             <div className="h-px bg-slate-800 flex-1"></div>
          </div>

          {loadingPacks ? (
            <div className="text-center py-20 text-slate-500">
               <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
               <p className="font-heading text-sm tracking-widest">LOADING PACK SUPPLY...</p>
            </div>
          ) : packs.length === 0 ? (
             <div className="text-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
               <AlertTriangle className="mx-auto mb-4 opacity-50" size={32} />
               <p className="font-heading text-sm tracking-widest">NO PACKS AVAILABLE</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 px-4">
              {packs.map((pack) => (
                <div key={pack.id} className="group glass rounded-[2.5rem] p-8 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(236,72,153,0.3)] flex flex-col relative overflow-hidden">
                   <div className="absolute -inset-24 bg-indigo-600/20 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                   
                   <div className="relative z-10 flex flex-col items-center flex-1">
                        <div className="relative mb-8 transform group-hover:scale-110 transition-transform duration-500">
                            <img 
                            src={pack.image_url} 
                            alt={pack.name} 
                            className="w-48 h-64 object-cover rounded-xl shadow-2xl drop-shadow-[4px_4px_0_rgba(6,182,212,0.8)] border-2 border-slate-900 bg-slate-800" 
                            />
                            {pack.has_foil_slot && (
                                <div className="absolute -left-4 top-4 bg-gradient-to-r from-amber-300 to-yellow-500 text-black px-3 py-1 text-[10px] font-black uppercase transform -rotate-12 shadow-lg border border-white/20">
                                    FOIL INSIDE
                                </div>
                            )}
                            {pack.guaranteed_rarity && (
                            <div className="absolute bottom-2 right-2 z-20 bg-yellow-400 text-black px-2 py-1 rounded-sm shadow-lg border-2 border-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                                <Sparkle size={12} className="fill-black" />
                                {pack.guaranteed_rarity}+
                            </div>
                            )}
                        </div>
                     
                     <h3 className="text-xl font-heading font-black mb-2 text-white uppercase tracking-tight text-center leading-relaxed">{pack.name}</h3>
                     <p className="text-slate-300 text-xs text-center mb-6 font-medium px-4 min-h-[3rem] flex items-center justify-center font-mono">
                       {pack.description}
                     </p>

                     <div className="flex gap-2 mb-8 justify-center flex-wrap">
                        <div className="bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-sm text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck size={12} className="text-indigo-400" />
                          {pack.card_count} CARDS
                        </div>
                        {pack.foil_chance && pack.foil_chance > 0 && (
                            <div className="bg-slate-900 border border-amber-500/30 px-4 py-1.5 rounded-sm text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles size={12} /> {(pack.foil_chance * 100).toFixed(1)}% FOIL
                            </div>
                        )}
                     </div>

                     <div className="mt-auto w-full">
                       <button 
                         onClick={() => initiatePurchase(pack)}
                         disabled={loadingId === pack.id}
                         className={`group relative w-full py-5 rounded-sm font-heading font-black text-sm flex items-center justify-center gap-3 transition-all overflow-hidden
                           ${pack.cost_gold 
                             ? 'bg-yellow-400 text-black border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1' 
                             : 'bg-cyan-400 text-black border-b-4 border-cyan-600 active:border-b-0 active:translate-y-1'
                           }
                           ${loadingId === pack.id ? 'opacity-70 cursor-wait' : 'hover:brightness-110 shadow-xl'}
                         `}
                       >
                         {loadingId === pack.id ? (
                           <div className="h-4 w-4 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                         ) : (
                           <>
                             {pack.cost_gold ? <Coins size={18} className="text-black" /> : <Diamond size={18} className="text-black" />}
                             {pack.cost_gold ? pack.cost_gold.toLocaleString() : pack.cost_gems?.toLocaleString()}
                           </>
                         )}
                       </button>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Card Backs Section */}
      <div>
          <div className="flex items-center gap-4 mb-8">
             <div className="h-px bg-slate-800 flex-1"></div>
             <h2 className="text-2xl font-heading font-black text-white flex items-center gap-2"><ImageIcon className="text-cyan-500" /> CARD SKINS</h2>
             <div className="h-px bg-slate-800 flex-1"></div>
          </div>

          {loadingCardBacks ? (
            <div className="text-center py-20 text-slate-500">
               <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
               <p className="font-heading text-sm tracking-widest">DECRYPTING COSMETICS...</p>
            </div>
          ) : cardBacks.length === 0 ? (
             <div className="text-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
               <AlertTriangle className="mx-auto mb-4 opacity-50" size={32} />
               <p className="font-heading text-sm tracking-widest">NO SKINS AVAILABLE</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 px-4">
                {cardBacks.map(cardBack => (
                    <div key={cardBack.id} className="glass p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col group hover:-translate-y-1 hover:shadow-xl">
                        <div className="relative mb-6 rounded-xl overflow-hidden bg-slate-950 aspect-[3/4] shadow-inner border border-slate-900">
                             <img src={cardBack.image_url} alt={cardBack.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        
                        <h3 className="text-lg font-heading font-bold text-white mb-2">{cardBack.name}</h3>
                        <p className="text-slate-500 text-xs font-mono mb-6 line-clamp-2 h-8">{cardBack.description}</p>
                        
                        <div className="mt-auto flex items-center justify-between gap-4">
                            <div className="text-yellow-400 font-heading font-bold flex items-center gap-1.5">
                                <Coins size={16} />
                                {cardBack.price === 0 ? 'FREE' : cardBack.price.toLocaleString()}
                            </div>
                            
                            <button 
                                onClick={() => handleBuyCardBack(cardBack)}
                                disabled={purchasingBackId === cardBack.id}
                                className={`px-6 py-2 rounded-sm font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:translate-y-1
                                   ${purchasingBackId === cardBack.id ? 'bg-slate-700 text-slate-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}
                                `}
                            >
                                {purchasingBackId === cardBack.id ? 'PROCESSING' : 'BUY'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
          )}
      </div>

      {/* Payment Selection Modal */}
      {selectedPackForPayment && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-slate-900 rounded-2xl p-8 max-w-sm w-full border border-slate-700 relative shadow-2xl">
                  <button onClick={() => setSelectedPackForPayment(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
                  <h3 className="font-heading font-black text-white mb-6 text-center">SELECT PAYMENT</h3>
                  
                  <div className="space-y-3">
                      <button 
                          onClick={() => setPayWith('gold')}
                          className={`w-full p-4 rounded-xl border-2 flex items-center justify-between ${payWith === 'gold' ? 'border-yellow-500 bg-yellow-500/10' : 'border-slate-800 bg-slate-950'}`}
                      >
                          <div className="flex items-center gap-3">
                              <Coins className="text-yellow-400" />
                              <div className="text-left">
                                  <div className="font-bold text-white">GOLD</div>
                                  <div className="text-xs text-slate-500">Balance: {dashboard?.profile.gold_balance.toLocaleString()}</div>
                              </div>
                          </div>
                          <div className="font-mono font-bold text-white">{selectedPackForPayment.cost_gold?.toLocaleString()}</div>
                      </button>

                      <button 
                          onClick={() => setPayWith('gems')}
                          className={`w-full p-4 rounded-xl border-2 flex items-center justify-between ${payWith === 'gems' ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 bg-slate-950'}`}
                      >
                          <div className="flex items-center gap-3">
                              <Diamond className="text-cyan-400" />
                              <div className="text-left">
                                  <div className="font-bold text-white">GEMS</div>
                                  <div className="text-xs text-slate-500">Balance: {dashboard?.profile.gem_balance.toLocaleString()}</div>
                              </div>
                          </div>
                          <div className="font-mono font-bold text-white">{selectedPackForPayment.cost_gems?.toLocaleString()}</div>
                      </button>
                  </div>

                  <button 
                    onClick={() => executePurchase(selectedPackForPayment, payWith === 'gems')}
                    className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-lg font-heading font-black tracking-widest shadow-lg"
                  >
                      CONFIRM
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default Shop;