
import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { supabase } from '../supabaseClient';
import { ShopItem } from '../types';
import { Shirt, Coins, Diamond, Check, X, ShoppingBag, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ItemShop: React.FC = () => {
  const { user, showToast, refreshDashboard, dashboard } = useGame();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [payWith, setPayWith] = useState<'gold' | 'gems'>('gold');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  const fetchItems = async () => {
    setLoading(true);
    try {
        // Fetch base items
        const { data: shopItems, error: itemsError } = await supabase.from('shop_items').select('*');
        if (itemsError) throw itemsError;

        // Fetch user ownership
        const { data: userItems, error: userItemsError } = await supabase.from('user_items').select('*').eq('user_id', user?.id);
        
        if (userItemsError) console.warn('Could not fetch user items', userItemsError);

        const safeShopItems = shopItems || [];
        const safeUserItems = userItems || [];

        // Merge data - CRITICAL: Map the owned user_item instance ID
        const mergedItems: ShopItem[] = safeShopItems.map((item: any) => {
            // Check for both common column naming conventions in database
            const ownedRecord = safeUserItems.find((ui: any) => 
                (ui.item_id && ui.item_id === item.id) || 
                (ui.shop_item_id && ui.shop_item_id === item.id)
            );

            return {
                ...item,
                type: item.type || 'misc', // Fallback for missing type
                name: item.name || 'Unknown Item', // Fallback for missing name
                is_owned: !!ownedRecord,
                is_equipped: ownedRecord?.is_equipped || false,
                user_item_id: ownedRecord?.id // Capture the specific instance ID
            };
        });

        setItems(mergedItems);
    } catch (e: any) {
        console.error('Failed to fetch items:', e);
        showToast('Unable to load armory data.', 'error');
        setItems([]);
    } finally {
        setLoading(false);
    }
  };

  const openPurchaseModal = (item: ShopItem) => {
    if (!dashboard || !dashboard.profile) {
        showToast("Profile not loaded. Please wait...", "error");
        refreshDashboard();
        return;
    }

    // Default payment method logic
    if (item.cost_gold !== null && item.cost_gems === null) setPayWith('gold');
    else if (item.cost_gold === null && item.cost_gems !== null) setPayWith('gems');
    else setPayWith('gold'); // Default if both available
    
    setSelectedItem(item);
  };

  const handlePurchase = async () => {
    if (!selectedItem || !user || !dashboard?.profile) {
         showToast("System syncing. Please wait...", "error");
         return;
    }

    setProcessing(true);

    try {
      // Call unified purchase RPC
      const { data, error } = await supabase.rpc('purchase_item', { 
          p_item_id: selectedItem.id,
          p_quantity: 1,
          p_currency: payWith
      });

      if (error) throw error;

      showToast(`${selectedItem.name} acquired successfully!`, 'success');
      
      await Promise.all([fetchItems(), refreshDashboard()]);
      setSelectedItem(null);

    } catch (e: any) {
      console.error('Purchase error:', e);
      showToast(e.message || 'Transaction failed.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleEquip = async (item: ShopItem) => {
    if (!user) return;
    if (!item.user_item_id) {
        showToast("Error: Item ownership verification failed.", "error");
        return;
    }

    setProcessing(true);
    try {
      // The backend expects the user_item.id (instance ID), not the shop_item.id
      const { error } = await supabase.rpc('equip_item', { 
          p_user_id: user.id, 
          p_user_item_id: item.user_item_id 
      });
      
      if (error) throw error;
      
      showToast('Item equipped!', 'success');
      await Promise.all([fetchItems(), refreshDashboard()]);
    } catch (e: any) {
      showToast(e.message || 'Failed to equip item.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container mx-auto pb-20 relative">
      <div className="text-center mb-16 animate-fade-in">
        <h1 className="text-5xl font-heading font-black text-white tracking-tighter mb-4 drop-shadow-[4px_4px_0_rgba(236,72,153,1)]">
          COSMETIC <span className="text-indigo-500">ARMORY</span>
        </h1>
        <p className="text-slate-400 font-medium max-w-md mx-auto">Customize your operative identity. Secure transactions only.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
           <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
           <p className="font-heading text-xs tracking-widest">DECRYPTING INVENTORY...</p>
        </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {items.length > 0 ? items.map(item => (
                  <div key={item.id} className="glass rounded-2xl overflow-hidden border border-slate-700/50 flex flex-col group hover:border-indigo-500/50 transition-all hover:shadow-[0_0_30px_rgba(79,70,229,0.15)]">
                      <div className="h-48 bg-slate-950 relative overflow-hidden flex items-center justify-center p-4">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950/50 to-slate-950"></div>
                          
                          {item.type === 'banner' && <img src={item.image_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={item.name} />}
                          {item.type === 'avatar' && <img src={item.image_url} className="w-24 h-24 rounded-full object-cover border-4 border-slate-800 shadow-xl group-hover:scale-110 transition-transform" alt={item.name} />}
                          {item.type === 'card_back' && <img src={item.image_url} className="h-full object-contain shadow-2xl transform group-hover:scale-105 transition-transform rotate-3" alt={item.name} />}
                          
                          {/* Fallback for unknown types */}
                          {!['banner', 'avatar', 'card_back'].includes(item.type) && (
                              <div className="flex flex-col items-center justify-center text-slate-500">
                                  <AlertTriangle size={32} className="mb-2"/>
                                  <span className="text-[10px] font-mono">IMAGE N/A</span>
                              </div>
                          )}

                          {item.is_equipped && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-black px-2 py-1 rounded shadow-lg uppercase flex items-center gap-1">
                              <ShieldCheck size={10} /> Equipped
                            </div>
                          )}
                      </div>
                      
                      <div className="p-6 flex-1 flex flex-col relative">
                          <div className="mb-4">
                              <div className="flex justify-between items-start mb-2">
                                  <h3 className="font-bold text-white text-lg leading-tight group-hover:text-indigo-400 transition-colors">{item.name}</h3>
                                  <span className="text-[9px] font-mono uppercase bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-400">{(item.type || 'item').replace('_', ' ')}</span>
                              </div>
                              <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{item.description}</p>
                          </div>

                          <div className="mt-auto pt-4 border-t border-slate-800">
                              {item.is_owned ? (
                                  item.is_equipped ? (
                                      <button disabled className="w-full bg-slate-800/50 border border-slate-700 text-slate-500 py-3 rounded-sm font-bold text-xs cursor-default flex items-center justify-center gap-2">
                                        <Check size={14} /> ACTIVE
                                      </button>
                                  ) : (
                                      <button 
                                        onClick={() => handleEquip(item)} 
                                        disabled={processing}
                                        className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-sm font-bold text-xs tracking-wider transition-colors"
                                      >
                                        EQUIP
                                      </button>
                                  )
                              ) : (
                                  <button 
                                    onClick={() => openPurchaseModal(item)} 
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-sm font-bold text-xs flex items-center justify-center gap-3 shadow-lg transition-all active:translate-y-1"
                                  >
                                      {item.cost_gold !== null && <span className="flex items-center gap-1"><Coins size={14} className="text-yellow-300"/> {item.cost_gold.toLocaleString()}</span>}
                                      {item.cost_gems !== null && item.cost_gold !== null && <span className="text-indigo-300">/</span>}
                                      {item.cost_gems !== null && <span className="flex items-center gap-1"><Diamond size={14} className="text-cyan-300"/> {item.cost_gems.toLocaleString()}</span>}
                                  </button>
                              )}
                          </div>
                      </div>
                  </div>
              )) : (
                <div className="col-span-full text-center py-20 text-slate-500 font-mono border-2 border-dashed border-slate-800 rounded-2xl">
                    <AlertTriangle className="mx-auto mb-4 opacity-50" size={32} />
                    <p>ARMORY OFFLINE / NO ITEMS AVAILABLE</p>
                </div>
              )}
          </div>
      )}

      {/* Transaction Modal */}
      <AnimatePresence>
        {selectedItem && dashboard?.profile && (
          <motion.div
            key="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4"
            onClick={() => !processing && setSelectedItem(null)}
          >
            <motion.div
              key="modal-content"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative"
            >
               {/* Header */}
               <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={18} className="text-indigo-500" />
                    <span className="font-heading text-sm text-white tracking-widest">CONFIRM ACQUISITION</span>
                  </div>
                  <button onClick={() => !processing && setSelectedItem(null)} className="text-slate-500 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
               </div>

               <div className="p-8">
                  <div className="flex gap-6 mb-8">
                     <div className="w-24 h-24 bg-slate-800 rounded-xl border border-slate-700 shrink-0 overflow-hidden flex items-center justify-center">
                        <img src={selectedItem.image_url} className="w-full h-full object-cover" alt="" />
                     </div>
                     <div>
                        <h2 className="text-2xl font-bold text-white mb-1">{selectedItem.name}</h2>
                        <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-1 rounded uppercase font-bold">{(selectedItem.type || 'Item').replace('_', ' ')}</span>
                        <p className="text-slate-500 text-sm mt-3">{selectedItem.description}</p>
                     </div>
                  </div>

                  <div className="mb-8">
                     <label className="text-xs font-bold text-slate-500 uppercase font-mono mb-3 block">Select Payment Method</label>
                     <div className="grid grid-cols-2 gap-4">
                        {/* Gold Option */}
                        <div 
                          onClick={() => selectedItem.cost_gold !== null && setPayWith('gold')}
                          className={`
                            relative p-4 rounded-xl border-2 cursor-pointer transition-all
                            ${selectedItem.cost_gold === null ? 'opacity-40 cursor-not-allowed border-slate-800 bg-slate-900' : 
                              payWith === 'gold' ? 'border-yellow-500 bg-yellow-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800'}
                          `}
                        >
                           <div className="flex items-center gap-2 mb-1">
                              <Coins size={18} className="text-yellow-400" />
                              <span className="font-heading font-bold text-white">GOLD</span>
                           </div>
                           <div className="text-xl font-mono text-slate-300">
                             {selectedItem.cost_gold !== null ? selectedItem.cost_gold.toLocaleString() : 'N/A'}
                           </div>
                           {payWith === 'gold' && <div className="absolute top-2 right-2 text-yellow-500"><Check size={16} /></div>}
                        </div>

                        {/* Gems Option */}
                        <div 
                          onClick={() => selectedItem.cost_gems !== null && setPayWith('gems')}
                          className={`
                            relative p-4 rounded-xl border-2 cursor-pointer transition-all
                            ${selectedItem.cost_gems === null ? 'opacity-40 cursor-not-allowed border-slate-800 bg-slate-900' : 
                              payWith === 'gems' ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800'}
                          `}
                        >
                           <div className="flex items-center gap-2 mb-1">
                              <Diamond size={18} className="text-cyan-400" />
                              <span className="font-heading font-bold text-white">GEMS</span>
                           </div>
                           <div className="text-xl font-mono text-slate-300">
                             {selectedItem.cost_gems !== null ? selectedItem.cost_gems.toLocaleString() : 'N/A'}
                           </div>
                           {payWith === 'gems' && <div className="absolute top-2 right-2 text-cyan-500"><Check size={16} /></div>}
                        </div>
                     </div>
                  </div>

                  {/* Balance Check Display */}
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 mb-6 flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-bold uppercase">Current Balance</span>
                      <div className="flex items-center gap-2">
                         {payWith === 'gold' ? <Coins size={14} className="text-yellow-500"/> : <Diamond size={14} className="text-cyan-500"/>}
                         <span className="font-mono font-bold text-white">
                           {(payWith === 'gold' ? dashboard?.profile?.gold_balance : dashboard?.profile?.gem_balance)?.toLocaleString()}
                         </span>
                      </div>
                  </div>

                  <button 
                    onClick={handlePurchase}
                    disabled={processing}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-lg font-heading font-black tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    {processing ? (
                      <span className="animate-pulse">PROCESSING TRANSACTION...</span>
                    ) : (
                      <>CONFIRM PURCHASE <Check size={16} /></>
                    )}
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ItemShop;
