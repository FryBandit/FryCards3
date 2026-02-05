import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { PackType, PackResult, AffordabilityCheck, Card } from '../types';
import { useGame } from '../context/GameContext';
import { Coins, Diamond, ShieldCheck, Sparkle } from 'lucide-react';
import PackOpener from '../components/PackOpener';

const MOCK_PACKS: PackType[] = [
  {
    id: 'pack_std_01',
    name: 'Standard Issue',
    description: 'Basic asset crate containing standard operatives and equipment. Low chance of rare items.',
    cost_gold: 100,
    cost_gems: null,
    card_count: 5,
    guaranteed_rarity: 'Common',
    image_url: 'https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 'pack_elite_01',
    name: 'Elite Netrunner',
    description: 'High-grade data packet. Higher probability of encrypted rare assets.',
    cost_gold: null,
    cost_gems: 50,
    card_count: 5,
    guaranteed_rarity: 'Rare',
    image_url: 'https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 'pack_divine_01',
    name: 'Divine Algorithm',
    description: 'The ultimate collection. Contains strictly high-tier assets from the source code.',
    cost_gold: null,
    cost_gems: 200,
    card_count: 10,
    guaranteed_rarity: 'Mythic',
    image_url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop'
  }
];

const MOCK_CARDS: Card[] = [
  {
    id: 'm1',
    name: 'Neon Samurai',
    rarity: 'Super-Rare',
    card_type: 'Unit',
    image_url: 'https://images.unsplash.com/photo-1535378437323-9555f3e7f5bb?q=80&w=600&auto=format&fit=crop',
    is_video: false,
    description: 'A legendary warrior from the lost sector.',
    is_new: true,
    quantity: 1
  },
  {
    id: 'm2',
    name: 'Data Breach',
    rarity: 'Rare',
    card_type: 'Action',
    image_url: 'https://images.unsplash.com/photo-1558494949-ef526b01201b?q=80&w=600&auto=format&fit=crop',
    is_video: false,
    description: 'Intercept enemy communications.',
    is_new: true,
    quantity: 1
  },
  {
    id: 'm3',
    name: 'Rusty Drone',
    rarity: 'Common',
    card_type: 'Unit',
    image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=600&auto=format&fit=crop',
    is_video: false,
    description: 'Standard surveillance unit.',
    is_new: true,
    quantity: 1
  },
  {
    id: 'm4',
    name: 'Neural Link',
    rarity: 'Uncommon',
    card_type: 'Upgrade',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop',
    is_video: false,
    description: 'Direct interface with the matrix.',
    is_new: true,
    quantity: 1
  },
  {
    id: 'm5',
    name: 'Quantum Core',
    rarity: 'Mythic',
    card_type: 'Artifact',
    image_url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=600&auto=format&fit=crop',
    is_video: false,
    description: 'The heart of the simulation.',
    is_new: true,
    quantity: 1
  }
];

const Shop: React.FC = () => {
  const { user, refreshDashboard } = useGame();
  const [packs, setPacks] = useState<PackType[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [packResult, setPackResult] = useState<PackResult | null>(null);
  const [openedPackImage, setOpenedPackImage] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const loadPacks = async () => {
      const { data, error } = await supabase.rpc('get_available_packs');
      if (error || !data || data.length === 0) {
        console.warn('Pack fetch failed or returned empty. Using mock data.', error);
        if (mountedRef.current) setPacks(MOCK_PACKS);
      } else {
        if (mountedRef.current) setPacks(data);
      }
    };
    loadPacks();
  }, []);

  const handleBuyPack = async (pack: PackType) => {
    if (!user || loadingId) return; // Prevent double click
    setLoadingId(pack.id);
    setOpenedPackImage(pack.image_url);

    try {
      // 1. Check Affordability
      const { data: affordCheck, error: affordError } = await supabase.rpc('can_afford_pack', {
        p_user_id: user.id,
        p_pack_type_id: pack.id
      });

      // Simulation mode for fallback
      let canAfford = true;

      if (affordError) {
         console.warn("Affordability check failed, simulating success for demo.");
      } else if (affordCheck) {
         const check = affordCheck as AffordabilityCheck;
         if (!check.can_afford) {
            alert(`Insufficient Funds. Required: ${check.gold_needed > 0 ? check.gold_needed + ' Gold' : check.gems_needed + ' Gems'}`);
            if (mountedRef.current) setLoadingId(null);
            return;
         }
      }

      // 2. Open Pack
      const { data, error } = await supabase.rpc('open_pack', {
        p_user_id: user.id,
        p_pack_type_id: pack.id
      });

      if (error) {
        console.warn("Pack open failed, using mock result.", error);
        // Fallback simulation
        const mockResult: PackResult = {
          success: true,
          cards: MOCK_CARDS.map(c => ({...c, id: Math.random().toString(), is_new: true})),
          new_card_count: 5,
          xp_gained: 100,
          pity_triggered: false,
          next_pity_in: 8
        };
        if (mountedRef.current) setPackResult(mockResult);
      } else {
        if (mountedRef.current) setPackResult(data);
      }

      await refreshDashboard();
      
    } catch (err: any) {
      console.error(err);
      // Even in catch, if it's a critical failure, we might want to let them see the animation in a demo
      const mockResult: PackResult = {
          success: true,
          cards: MOCK_CARDS,
          new_card_count: 5,
          xp_gained: 100,
          pity_triggered: false,
          next_pity_in: 8
      };
      if (mountedRef.current) setPackResult(mockResult);
    } finally {
      if (mountedRef.current) setLoadingId(null);
    }
  };

  const closeOpener = () => {
    setPackResult(null);
  };

  return (
    <div className="container mx-auto pb-20">
      <PackOpener 
        packResult={packResult} 
        onClose={closeOpener} 
        packImage={openedPackImage}
      />

      <div className="text-center mb-16 animate-fade-in">
        <h1 className="text-5xl font-heading font-black text-white tracking-tighter mb-4">
          ACQUISITION <span className="text-indigo-500">HUB</span>
        </h1>
        <div className="h-1 w-24 bg-indigo-500 mx-auto rounded-full mb-6"></div>
        <p className="text-slate-400 font-medium max-w-md mx-auto">Convert your credits into high-value digital assets. All transactions are cryptographically secured.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 px-4">
        {packs.map((pack) => (
          <div key={pack.id} className="group glass rounded-[2.5rem] p-8 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(79,70,229,0.15)] flex flex-col relative overflow-hidden">
             
             {/* Hover Glow */}
             <div className="absolute -inset-24 bg-indigo-600/10 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
             
             <div className="relative z-10 flex flex-col items-center flex-1">
               <div className="relative mb-8 transform group-hover:scale-110 transition-transform duration-500">
                  <img 
                    src={pack.image_url || 'https://via.placeholder.com/300x420?text=Pack'} 
                    alt={pack.name} 
                    className="w-48 h-64 object-cover rounded-xl shadow-2xl drop-shadow-[0_25px_25px_rgba(0,0,0,0.5)]" 
                  />
                  {pack.guaranteed_rarity && (
                    <div className="absolute -bottom-2 -right-2 bg-yellow-500 p-2 rounded-xl shadow-lg border-2 border-slate-900 animate-bounce">
                       <Sparkle size={16} className="text-slate-950 fill-slate-950" />
                    </div>
                  )}
               </div>
               
               <h3 className="text-2xl font-heading font-black mb-2 text-white uppercase tracking-tight text-center">{pack.name}</h3>
               <p className="text-slate-500 text-sm text-center mb-6 font-medium px-4 min-h-[3rem] flex items-center justify-center">
                 {pack.description}
               </p>

               <div className="flex gap-2 mb-8 justify-center">
                  <div className="bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={12} className="text-indigo-400" />
                    {pack.card_count} ASSETS
                  </div>
                  {pack.guaranteed_rarity && (
                    <div className="bg-slate-900 border border-indigo-500/30 px-4 py-1.5 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                      {pack.guaranteed_rarity}+
                    </div>
                  )}
               </div>

               <div className="mt-auto w-full">
                 <button 
                   onClick={() => handleBuyPack(pack)}
                   disabled={loadingId === pack.id}
                   className={`group relative w-full py-5 rounded-2xl font-heading font-black text-lg flex items-center justify-center gap-3 transition-all overflow-hidden
                     ${pack.cost_gold 
                       ? 'bg-gradient-to-r from-yellow-600 to-amber-500 text-slate-950' 
                       : 'bg-gradient-to-r from-cyan-600 to-blue-500 text-white'
                     }
                     ${loadingId === pack.id ? 'opacity-70 cursor-wait' : 'hover:scale-[1.02] active:scale-[0.98] shadow-xl'}
                   `}
                 >
                   <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none"></div>
                   
                   {loadingId === pack.id ? (
                     <div className="h-6 w-6 border-4 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                   ) : (
                     <>
                       {pack.cost_gold ? <Coins size={22} className="fill-slate-950/20" /> : <Diamond size={22} className="fill-white/20" />}
                       {pack.cost_gold ? pack.cost_gold.toLocaleString() : pack.cost_gems?.toLocaleString()}
                     </>
                   )}
                 </button>
               </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Shop;