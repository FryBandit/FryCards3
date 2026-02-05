import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useGame } from '../context/GameContext';
import { MarketListing, Card } from '../types';
import CardDisplay from '../components/CardDisplay';
import { Search, Filter, DollarSign, Gavel, Plus, X, Tag } from 'lucide-react';
import { RARITY_COLORS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

const Marketplace: React.FC = () => {
  const { user, refreshDashboard } = useGame();
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'fixed' | 'auction'>('all');
  const [filterRarity, setFilterRarity] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const mountedRef = useRef(true);

  // Create Listing State
  const [userCards, setUserCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [listingType, setListingType] = useState<'fixed' | 'auction'>('fixed');
  const [price, setPrice] = useState<number>(100);
  const [currency, setCurrency] = useState<'gold' | 'gems'>('gold');
  const [duration, setDuration] = useState<number>(24);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_market_listings', {
        p_filter_type: filterType === 'all' ? null : filterType,
        p_rarity: filterRarity || null
      });
      
      if (error) throw error;
      if (mountedRef.current) setListings(data || []);
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [filterType, filterRarity]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const loadUserCards = async () => {
    if (!user) return;
    // Fix: Added missing parameters expected by RPC
    const { data } = await supabase.rpc('get_user_collection', {
       p_user_id: user.id,
       p_rarity: null,
       p_sort_by: 'name',
       p_limit: 100,
       p_offset: 0
    });
    if (data && mountedRef.current) setUserCards(data);
  };

  useEffect(() => {
    if (showCreateModal) loadUserCards();
  }, [showCreateModal]);

  const handleCreateListing = async () => {
    if (!user || !selectedCardId) return;
    try {
      const { error } = await supabase.rpc(
        listingType === 'fixed' ? 'create_market_listing' : 'create_auction_listing', 
        {
          p_user_id: user.id,
          p_card_id: selectedCardId,
          p_price: price,
          p_currency: currency,
          p_duration_hours: duration
        }
      );

      if (error) throw error;
      
      if (mountedRef.current) setShowCreateModal(false);
      fetchListings();
      refreshDashboard();
      alert('Listing created successfully!');
    } catch (err: any) {
      alert('Failed to create listing: ' + err.message);
    }
  };

  const handleBuy = async (listing: MarketListing) => {
    if (!user) return;
    if (listing.seller_id === user.id) {
      alert("You cannot purchase your own listing.");
      return;
    }
    
    if (!window.confirm(`Purchase this item for ${listing.price} ${listing.currency}?`)) return;

    try {
      const { error } = await supabase.rpc('buy_market_listing', {
        p_user_id: user.id,
        p_listing_id: listing.id
      });

      if (error) throw error;
      
      alert('Purchase successful!');
      fetchListings();
      refreshDashboard();
    } catch (err: any) {
      alert('Transaction failed: ' + err.message);
    }
  };

  const handleBid = async (listing: MarketListing) => {
    if (!user) return;
    if (listing.seller_id === user.id) {
        alert("You cannot bid on your own auction.");
        return;
    }

    const minBid = (listing.current_bid || 0) + (listing.min_bid_increment || 10);
    const bidAmount = prompt(`Enter bid amount (Minimum: ${minBid} ${listing.currency})`, minBid.toString());
    
    if (!bidAmount) return;
    const amount = parseInt(bidAmount);

    if (isNaN(amount) || amount < minBid) {
      alert(`Bid must be at least ${minBid}`);
      return;
    }

    try {
      const { error } = await supabase.rpc('place_bid', {
        p_user_id: user.id,
        p_listing_id: listing.id,
        p_amount: amount
      });

      if (error) throw error;
      
      alert('Bid placed successfully!');
      fetchListings();
      refreshDashboard();
    } catch (err: any) {
      alert('Bid failed: ' + err.message);
    }
  };

  return (
    <div className="pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8 border-b border-slate-800 pb-8">
        <div>
          <h1 className="text-5xl font-heading font-black text-white tracking-tighter">
            GLOBAL <span className="text-indigo-500">MARKET</span>
          </h1>
          <p className="text-slate-500 font-medium mt-2">Trade assets securely on the decentralized exchange.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-95 transition-all"
        >
          <Plus size={20} />
          CREATE LISTING
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
          <button 
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            ALL
          </button>
          <button 
            onClick={() => setFilterType('fixed')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'fixed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            BUY NOW
          </button>
          <button 
            onClick={() => setFilterType('auction')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'auction' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            AUCTIONS
          </button>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
           <Filter size={16} className="text-slate-500" />
           <select 
             value={filterRarity} 
             onChange={(e) => setFilterRarity(e.target.value)}
             className="bg-transparent text-slate-300 text-sm font-bold focus:outline-none"
           >
             <option value="">ALL RARITIES</option>
             {Object.keys(RARITY_COLORS).map(r => <option key={r} value={r}>{r}</option>)}
           </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
           <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {listings.map((listing) => (
              <motion.div 
                key={listing.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 hover:border-indigo-500/50 transition-all group"
              >
                <div className="relative mb-4 flex justify-center">
                   <div className="transform group-hover:scale-105 transition-transform duration-300">
                     <CardDisplay card={listing.card} size="sm" />
                   </div>
                   <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-sm px-2 py-1 rounded-md border border-slate-700">
                     <span className={`text-[10px] font-black uppercase ${RARITY_COLORS[listing.card.rarity]}`}>
                       {listing.card.rarity}
                     </span>
                   </div>
                   {listing.listing_type === 'auction' && (
                     <div className="absolute top-2 left-2 bg-amber-600 text-white px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
                       <Gavel size={10} />
                       <span className="text-[10px] font-black uppercase">AUCTION</span>
                     </div>
                   )}
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between items-center text-xs font-mono text-slate-500">
                      <span>Seller: {listing.seller_username}</span>
                      <span>Expires: {new Date(listing.expires_at).toLocaleDateString()}</span>
                   </div>

                   <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">
                          {listing.listing_type === 'fixed' ? 'Price' : 'Current Bid'}
                        </div>
                        <div className={`text-xl font-heading font-black ${listing.currency === 'gold' ? 'text-yellow-400' : 'text-cyan-400'}`}>
                           {listing.listing_type === 'fixed' ? listing.price : listing.current_bid}
                           <span className="text-xs ml-1 text-slate-500">{listing.currency === 'gold' ? 'GOLD' : 'GEMS'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => listing.listing_type === 'fixed' ? handleBuy(listing) : handleBid(listing)}
                        disabled={listing.seller_id === user?.id}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                          ${listing.listing_type === 'fixed' 
                            ? 'bg-green-600 hover:bg-green-500 text-white' 
                            : 'bg-amber-600 hover:bg-amber-500 text-white'}
                        `}
                      >
                        {listing.listing_type === 'fixed' ? 'BUY' : 'BID'}
                      </button>
                   </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      
      {!loading && listings.length === 0 && (
         <div className="text-center py-20 text-slate-500">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-heading font-bold">NO LISTINGS FOUND</p>
         </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="bg-slate-900 rounded-[2rem] p-8 max-w-2xl w-full border border-slate-700 relative flex flex-col md:flex-row gap-8 max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-white transition-colors"><X size={20} /></button>
              
              <div className="flex-1">
                 <h2 className="text-2xl font-heading font-black text-white mb-6">CREATE LISTING</h2>
                 
                 <div className="space-y-4">
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Select Asset</label>
                       <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                          {userCards.map(card => (
                            <div 
                              key={card.id} 
                              onClick={() => setSelectedCardId(card.id)}
                              className={`cursor-pointer p-1 rounded-lg border-2 transition-all ${selectedCardId === card.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-transparent hover:border-slate-700'}`}
                            >
                              <img src={card.image_url} className="w-full rounded" alt={card.name} />
                            </div>
                          ))}
                       </div>
                    </div>

                    <div className="flex gap-4">
                       <button onClick={() => setListingType('fixed')} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${listingType === 'fixed' ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-slate-800 text-slate-500'}`}>FIXED PRICE</button>
                       <button onClick={() => setListingType('auction')} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${listingType === 'auction' ? 'border-amber-500 bg-amber-500/20 text-white' : 'border-slate-800 text-slate-500'}`}>AUCTION</button>
                    </div>

                    <div className="flex gap-4">
                       <div className="flex-1">
                          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Amount</label>
                          <input 
                            type="number" 
                            value={price} 
                            onChange={e => setPrice(parseInt(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono focus:border-indigo-500 outline-none" 
                          />
                       </div>
                       <div className="w-1/3">
                          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Currency</label>
                          <select 
                            value={currency} 
                            onChange={e => setCurrency(e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold outline-none"
                          >
                            <option value="gold">GOLD</option>
                            <option value="gems">GEMS</option>
                          </select>
                       </div>
                    </div>

                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Duration (Hours)</label>
                       <select 
                         value={duration}
                         onChange={e => setDuration(parseInt(e.target.value))}
                         className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold outline-none"
                       >
                         <option value={12}>12 Hours</option>
                         <option value={24}>24 Hours</option>
                         <option value={48}>48 Hours</option>
                         <option value={72}>3 Days</option>
                       </select>
                    </div>

                    <button 
                      onClick={handleCreateListing}
                      disabled={!selectedCardId}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-heading font-black tracking-wider shadow-lg mt-4"
                    >
                      CONFIRM LISTING
                    </button>
                 </div>
              </div>

              {selectedCardId && (
                <div className="w-48 hidden md:block">
                   <CardDisplay card={userCards.find(c => c.id === selectedCardId)!} size="md" />
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;