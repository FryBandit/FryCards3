
import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { supabase } from '../supabaseClient';
import { ShopItem } from '../types';
import { Shirt, Coins, Diamond, Check, Lock } from 'lucide-react';

const ItemShop: React.FC = () => {
  const { user, showToast, refreshDashboard } = useGame();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_shop_items', { p_user_id: user?.id });
    if (data) setItems(data);
    setLoading(false);
  };

  const handleBuy = async (item: ShopItem) => {
      if(!confirm(`Purchase ${item.name}?`)) return;
      
      const { error } = await supabase.rpc('buy_shop_item', { p_user_id: user?.id, p_item_id: item.id });
      if (error) showToast(error.message, 'error');
      else {
          showToast('Item purchased!', 'success');
          fetchItems();
          refreshDashboard();
      }
  };

  const handleEquip = async (item: ShopItem) => {
      const { error } = await supabase.rpc('equip_item', { p_user_id: user?.id, p_item_id: item.id });
      if (error) showToast(error.message, 'error');
      else {
          showToast('Item equipped!', 'success');
          fetchItems();
          refreshDashboard();
      }
  };

  return (
    <div className="container mx-auto pb-20">
       <div className="text-center mb-16">
        <h1 className="text-5xl font-heading font-black text-white tracking-tighter mb-4 drop-shadow-[4px_4px_0_rgba(236,72,153,1)]">
          COSMETIC <span className="text-indigo-500">ARMORY</span>
        </h1>
        <p className="text-slate-400 font-medium max-w-md mx-auto">Customize your operative identity.</p>
      </div>

      {loading ? <div className="text-center py-20 text-slate-500">LOADING INVENTORY...</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {items.map(item => (
                  <div key={item.id} className="glass rounded-2xl overflow-hidden border border-slate-700/50 flex flex-col group hover:border-indigo-500/50 transition-all">
                      <div className="h-40 bg-slate-900 relative overflow-hidden flex items-center justify-center p-4">
                          {item.type === 'banner' && <img src={item.image_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
                          {item.type === 'avatar' && <img src={item.image_url} className="w-24 h-24 rounded-full object-cover border-4 border-slate-800 shadow-xl" />}
                          {item.type === 'card_back' && <img src={item.image_url} className="h-full object-contain shadow-lg transform group-hover:scale-105 transition-transform" />}
                          
                          {item.is_equipped && <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded shadow uppercase">Equipped</div>}
                      </div>
                      
                      <div className="p-6 flex-1 flex flex-col">
                          <div className="mb-4">
                              <div className="flex justify-between items-start">
                                  <h3 className="font-bold text-white text-lg leading-tight">{item.name}</h3>
                                  <span className="text-[10px] font-mono uppercase bg-slate-800 px-2 py-0.5 rounded text-slate-400">{item.type}</span>
                              </div>
                              <p className="text-slate-500 text-xs mt-2">{item.description}</p>
                          </div>

                          <div className="mt-auto">
                              {item.is_owned ? (
                                  item.is_equipped ? (
                                      <button disabled className="w-full bg-slate-800 text-slate-500 py-3 rounded-lg font-bold text-sm cursor-default">EQUIPPED</button>
                                  ) : (
                                      <button onClick={() => handleEquip(item)} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold text-sm">EQUIP</button>
                                  )
                              ) : (
                                  <button onClick={() => handleBuy(item)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2">
                                      {item.cost_gold ? <><Coins size={16} /> {item.cost_gold}</> : <><Diamond size={16} /> {item.cost_gems}</>}
                                  </button>
                              )}
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default ItemShop;
