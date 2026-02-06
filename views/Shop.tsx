
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { PackType, PackResult, AffordabilityCheck, Card } from '../types';
import { useGame } from '../context/GameContext';
import { Coins, Diamond, ShieldCheck, Sparkle, AlertTriangle, Eye, Sparkles, X, Check } from 'lucide-react';
import PackOpener from '../components/PackOpener';
import CardDisplay from '../components/CardDisplay';
import { AnimatePresence, motion } from 'framer-motion';

const Shop: React.FC = () => {
  const { user, refreshDashboard, dashboard } = useGame();
  const [packs, setPacks] = useState<PackType[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [packResult, setPackResult] = useState<PackResult | null>(null);
  const [openedPackImage, setOpenedPackImage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Payment Selection Modal
  const [selectedPackForPayment, setSelectedPackForPayment] = useState<PackType | null>(null);
  const [payWith, setPayWith] = useState<'gold' | 'gems'>('gold');

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const loadPacks = async () => {
      const { data, error } = await supabase.rpc('get_available_packs');
      if (error) {
        console.error('Pack fetch failed:', error);
        if (mountedRef.current) setErrorMsg('Unable to retrieve shop data from the server.');
      } else {
        if (mountedRef.current) setPacks(data || []);
      }
    };
    loadPacks();
  }, []);

  const initiatePurchase = (pack: PackType) => {
      // Determine if choice is needed
      const hasGoldPrice = pack.cost_gold !== null;
      const hasGemPrice = (pack.cost_gems || 0) > 0;

      if (hasGoldPrice && hasGemPrice) {
          setPayWith('gold');
          setSelectedPackForPayment(pack);
      } else {
          // Auto-select currency logic based on availability
          const useGems = !hasGoldPrice && hasGemPrice;
          executePurchase(pack, useGems);
      }
  };

  const executePurchase = async (pack: PackType, useGems: boolean) => {
    if (!user || loadingId || !dashboard?.profile) return;
    setLoadingId(pack.id);
    setOpenedPackImage(pack.image_url);
    setErrorMsg(null);
    setSelectedPackForPayment(null); // Close modal if open

    try {
      // 1. Check Affordability via RPC (optional but good practice before commit)
      const { data: affordability, error: affError } = await supabase.rpc('can_afford_pack', {
          p_user_id: user.id,
          p_pack_type_id: pack.id
      });
      
      // Note: can_afford_pack RPC might not take currency preference, checking against user balance
      // We can do a client check first to be faster
      const cost = useGems ? pack.cost_gems : pack.cost_gold;
      const balance = useGems ? dashboard.profile.gem_balance : dashboard.profile.gold_balance;
      
      if (balance < (cost || 0)) {
          alert(`Insufficient ${useGems ? 'Gems' : 'Gold'}`);
          if (mountedRef.current) setLoadingId(null);
          return;
      }

      // 2. Open Pack
      const { data, error } = await supabase.rpc('open_pack', {
        p_user_id: user.id,
        p_pack_type_id: pack.id,
        p_use_gems: useGems
      });

      if (error) {
        throw error;
      } else {
        if (mountedRef.current) setPackResult(data);
      }

      await refreshDashboard();
      
    } catch (err: any) {
      console.error(err);
      if (mountedRef.current) setErrorMsg(err.message || "Transaction failed. No funds were deducted.");
    } finally {
      if (mountedRef.current) setLoadingId(null);
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
          ACQUISITION <span className="text-indigo-500">HUB</span>
        </h1>
        <div className="h-1 w-24 bg-indigo-500 mx-auto rounded-full mb-6"></div>
        <p className="text-slate-400 font-medium max-w-md mx-auto">Convert your credits into high-value digital cards. All transactions are cryptographically secured.</p>
      </div>

      {errorMsg && (
        <div className="max-w-md mx-auto mb-8 p-4 bg-red-900/50 border border-red-500 rounded-xl text-white flex items-center gap-3">
          <AlertTriangle className="text-red-500" />
          {errorMsg}
        </div>
      )}

      {packs.length === 0 && !errorMsg ? (
        <div className="text-center py-20 text-slate-500">
           <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
           <p className="font-heading text-sm tracking-widest">LOADING SUPPLY LINES...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 px-4">
          {packs.map((pack) => (
            <div key={pack.id} className="group glass rounded-[2.5rem] p-8 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(236,72,153,0.3)] flex flex-col relative overflow-hidden">
               
               {/* Hover Glow */}
               <div className="absolute -inset-24 bg-indigo-600/20 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
               
               <div className="relative z-10 flex flex-col items-center flex-1">
                 
                    <div className="relative mb-8 transform group-hover:scale-110 transition-transform duration-500">
                        <img 
                        src={pack.image_url} 
                        alt={pack.name} 
                        className="w-48 h-64 object-cover rounded-xl shadow-2xl drop-shadow-[4px_4px_0_rgba(6,182,212,0.8)] border-2 border-slate-900" 
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
                                  <div className="text-xs text-slate-500">Balance: {dashboard?.profile.gold_balance}</div>
                              </div>
                          </div>
                          <div className="font-mono font-bold text-white">{selectedPackForPayment.cost_gold}</div>
                      </button>

                      <button 
                          onClick={() => setPayWith('gems')}
                          className={`w-full p-4 rounded-xl border-2 flex items-center justify-between ${payWith === 'gems' ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 bg-slate-950'}`}
                      >
                          <div className="flex items-center gap-3">
                              <Diamond className="text-cyan-400" />
                              <div className="text-left">
                                  <div className="font-bold text-white">GEMS</div>
                                  <div className="text-xs text-slate-500">Balance: {dashboard?.profile.gem_balance}</div>
                              </div>
                          </div>
                          <div className="font-mono font-bold text-white">{selectedPackForPayment.cost_gems}</div>
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
