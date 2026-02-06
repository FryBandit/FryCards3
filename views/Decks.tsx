
import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { supabase } from '../supabaseClient';
import { Card, Deck } from '../types';
import CardDisplay from '../components/CardDisplay';
import { Plus, Save, Trash2, Layout, AlertCircle, Search } from 'lucide-react';

const Decks: React.FC = () => {
  const { user, showToast } = useGame();
  const [collection, setCollection] = useState<Card[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [activeDeck, setActiveDeck] = useState<Card[]>([]);
  const [deckName, setDeckName] = useState('UNNAMED SQUAD');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const DECK_SIZE = 5;

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [collRes, deckRes] = await Promise.all([
          supabase.rpc('get_user_collection', { p_user_id: user.id, p_limit: 100, p_offset: 0 }),
          supabase.from('decks').select('*').eq('user_id', user.id)
        ]);
        
        if (collRes.data) setCollection(collRes.data);
        if (deckRes.data) setDecks(deckRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const addToDeck = (card: Card) => {
    if (activeDeck.length >= DECK_SIZE) {
      showToast('Deck reached capacity (5 cards)', 'info');
      return;
    }
    setActiveDeck([...activeDeck, card]);
  };

  const removeFromDeck = (index: number) => {
    const newDeck = [...activeDeck];
    newDeck.splice(index, 1);
    setActiveDeck(newDeck);
  };

  const handleSaveDeck = async () => {
    if (activeDeck.length < DECK_SIZE) {
      showToast('Deck must have exactly 5 cards.', 'error');
      return;
    }
    
    try {
      const { error } = await supabase.from('decks').insert([{
        user_id: user?.id,
        name: deckName,
        card_ids: activeDeck.map(c => c.id)
      }]);
      
      if (error) throw error;
      showToast('Deck saved successfully!', 'success');
      setActiveDeck([]);
      setDeckName('UNNAMED SQUAD');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const filteredCollection = collection.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !activeDeck.some(dc => dc.id === c.id)
  );

  return (
    <div className="space-y-10 pb-20 animate-fade-in">
      <div className="flex justify-between items-end border-b border-slate-800 pb-8">
        <div>
          <h1 className="text-4xl font-heading font-black text-white tracking-tighter drop-shadow-[4px_4px_0_rgba(6,182,212,0.8)]">
            DECK <span className="text-indigo-500">CONSTRUCTOR</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-mono mt-2 uppercase tracking-[0.2em]">Assembling combat squads for tactical operations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Deck Assembly */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass p-8 rounded-sm border-2 border-slate-800 bg-slate-900/80 sticky top-24">
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-4 tracking-widest font-mono">Squad Name</label>
            <input 
              type="text" 
              value={deckName}
              onChange={e => setDeckName(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border-2 border-slate-800 p-4 font-heading text-xs text-indigo-400 focus:border-indigo-500 outline-none mb-8"
            />

            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase font-mono">
                <span>Composition</span>
                <span>{activeDeck.length} / {DECK_SIZE}</span>
              </div>
              
              <div className="min-h-[300px] border-2 border-dashed border-slate-800 rounded-sm p-4 space-y-2">
                {activeDeck.length === 0 ? (
                  <div className="h-[250px] flex flex-col items-center justify-center text-slate-700 text-center px-6">
                    <Layout size={40} className="mb-4 opacity-20" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Select cards from library to build squad</p>
                  </div>
                ) : (
                  activeDeck.map((card, idx) => (
                    <div key={`${card.id}-${idx}`} className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-sm group">
                       <img src={card.image_url} className="w-10 h-10 object-cover rounded-sm border border-slate-700" alt="" />
                       <div className="flex-1">
                          <div className="text-[10px] font-black text-white uppercase truncate">{card.name}</div>
                          <div className="text-[8px] font-mono text-slate-500">{card.rarity}</div>
                       </div>
                       <button onClick={() => removeFromDeck(idx)} className="text-slate-600 hover:text-red-500 p-2">
                         <Trash2 size={14} />
                       </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button 
              disabled={activeDeck.length < DECK_SIZE}
              onClick={handleSaveDeck}
              className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white py-5 rounded-sm font-heading font-black text-xs shadow-[4px_4px_0_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3"
            >
              <Save size={16} /> SAVE SQUAD
            </button>
          </div>
        </div>

        {/* Right: Library Selection */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-sm border border-slate-800">
             <Search size={18} className="text-slate-500" />
             <input 
               type="text" 
               placeholder="SEARCH LIBRARY..."
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="bg-transparent text-xs font-mono font-bold text-white flex-1 focus:outline-none"
             />
          </div>

          {loading ? (
             <div className="py-20 text-center animate-pulse font-heading text-xs text-slate-700">SCANNING ASSET LIBRARY...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCollection.length > 0 ? filteredCollection.map(card => (
                <div key={card.id} className="relative group flex flex-col items-center">
                   <div className="transform transition-all group-hover:-translate-y-2">
                     <CardDisplay card={card} size="sm" onClick={() => addToDeck(card)} />
                   </div>
                   <button 
                     onClick={() => addToDeck(card)}
                     className="absolute -bottom-2 opacity-0 group-hover:opacity-100 transition-all bg-indigo-500 text-white p-2 rounded-full shadow-xl border-2 border-slate-900"
                   >
                     <Plus size={16} />
                   </button>
                </div>
              )) : (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-sm">
                   <AlertCircle className="mx-auto text-slate-800 mb-4" size={40} />
                   <p className="text-xs font-heading text-slate-700">NO COMPATIBLE ASSETS FOUND</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Decks;
