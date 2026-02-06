
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useGame } from '../context/GameContext';
import { MarketListing, Card } from '../types';
import CardDisplay from '../components/CardDisplay';
import { Search, Filter, DollarSign, Gavel, Plus, X, Tag, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { RARITY_COLORS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

const Marketplace: React.FC = () => {
  const { user, refreshDashboard, showToast } = useGame();
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'fixed' | 'auction'>('all');
  const [filterRarity, setFilterRarity] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(0);
  const LIMIT = 12;

  // Bid Modal
  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [processingBid, setProcessingBid] = useState(false);

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
        p_rarity: filterRarity || null,
        p_limit: LIMIT,
        p_offset: page * LIMIT
      });
      
      if (error) throw error;
      if (mountedRef.current) setListings(data || []);
    } catch (err: any) {
      console.error('Error fetching listings:', err);
      showToast('Failed to load market data', 'error');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [filterType, filterRarity, page, showToast]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const loadUserCards = async () => {
    if (!user) return;
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
    if (price < 1) {
        showToast("Price must be at least 1.", 'error');
        return;
    }

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
      showToast('Asset listed on marketplace', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleBuy = async (listing: MarketListing) => {
    if (!user) return;
    if (listing.seller_id === user.id) {
      showToast("Cannot purchase own listing.", 'error');
      return;
    }
    
    // We can use a custom Confirm Modal here too, but native confirm is acceptable for critical actions if stylized not available
    if (!window.confirm(`Purchase for ${listing.price} ${listing.currency}?`)) return;

    try {
      const { error } = await supabase.rpc('buy_market_listing', {
        p_user_id: user.id,
        p_listing_id: listing.id
      });

      if (error) throw error;
      
      showToast('Purchase successful!', 'success');
      fetchListings();
      refreshDashboard();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const openBidModal = (listing: MarketListing) => {
     if (listing.seller_id === user?.id) {
       showToast("Cannot bid on own auction", 'error');
       return;
     }
     const minBid = (listing.current_bid || 0) + (listing.min_bid_increment || 10);
     setBidAmount(minBid);
     setSelectedListing(listing);
  };

  const submitBid = async () => {
    if (!user || !selectedListing) return;
    setProcessingBid(true);

    try {
      const { error } = await supabase.rpc('place_bid', {
        p_user_id: user.id,
        p_listing_id: selectedListing.id,
        p_amount: bidAmount
      });

      if (error) throw error;
      
      showToast('Bid placed successfully!', 'success');
      setSelectedListing(null);
      fetchListings();
      refreshDashboard();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setProcessingBid(false);
    }
  };

  return (
    <div className="pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8 border-b border-slate-800 pb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-heading font-black text-white tracking-tighter drop-shadow-[4px_4px_0_rgba(236,72,153,1)]">
            GLOBAL <span className="text-indigo-500">MARKET</span>
          </h1>
          <p className="text-slate-500 font-medium mt-2 font-mono">Trade cards securely on the decentralized exchange.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-sm font-bold flex items-center gap-2 shadow-[4px_4px_0_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-none transition-all font-heading text-xs"
        >
          <Plus size={16} />
          CREATE LISTING
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div className="flex flex-wrap gap-4">
          <div className="flex bg-slate-900 rounded-sm p-1 border border-slate-800">
            <button 
              onClick={() => { setFilterType('all'); setPage(0); }}
              className={`px-4 py-2 rounded-sm text-xs font-heading font-bold transition-all ${filterType === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              ALL
            </button>
            <button 
              onClick={() => { setFilterType('fixed'); setPage(0); }}
              className={`px-4 py-2 rounded-sm text-xs font-heading font-bold transition-all ${filterType === 'fixed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              BUY NOW
            </button>
            <button 
              onClick={() => { setFilterType('auction'); setPage(0); }}
              className={`px-4 py-2 rounded-sm text-xs font-heading font-bold transition-all ${filterType === 'auction' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              AUCTIONS
            </button>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-sm px-4 py-2">
            <Filter size={16} className="text-slate-500" />
            <select 
              value={filterRarity} 
              onChange={(e) => { setFilterRarity(e.target.value); setPage(0); }}
              className="bg-transparent text-slate-300 text-xs font-mono font-bold focus:outline-none uppercase"
            >
              <option value="">ALL RARITIES</option>
              {Object.keys(RARITY_COLORS).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-2">
           <button 
             disabled={page === 0}
             onClick={() => setPage(p => Math.max(0, p - 1))}
             className="p-2 bg-slate-800 rounded-sm disabled:opacity-30 hover:bg-slate-700 transition-colors border border-slate-700"
           >
             <ChevronLeft size={20} />
           </button>
           <span className="text-sm font-mono font-bold text-slate-500">PAGE {page + 1}</span>
           <button 
             disabled={listings.length < LIMIT}
             onClick={() => setPage(p => p + 1)}
             className="p-2 bg-slate-800 rounded-sm disabled:opacity-30 hover:bg-slate-700 transition-colors border border-slate-700"
           >
             <ChevronRight size={20} />
           </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
           <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {listings.map((listing) => (
              <motion.div 
                key={listing.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                layout
                className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-indigo-500/50 transition-all group"
              >
                <div className="relative mb-4 flex justify-center">
                   <div className="transform group-hover:scale-105 transition-transform duration-300">
                     <CardDisplay card={listing.card} size="sm" />
                   </div>
                   <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-sm px-2 py-1 rounded-sm border border-slate-700">
                     <span className={`text-[10px] font-black uppercase ${RARITY_COLORS[listing.card.rarity]}`}>
                       {listing.card.rarity}
                     </span>
                   </div>
                   {listing.listing_type === 'auction' && (
                     <div className="absolute top-2 left-2 bg-amber-600 text-white px-2 py-1 rounded-sm shadow-lg flex items-center gap-1">
                       <Gavel size={10} />
                       <span className="text-[10px] font-black uppercase">AUCTION</span>
                     </div>
                   )}
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between items-center text-xs font-mono text-slate-500">
                      <span>{listing.seller_username}</span>
                      <span>Exp: {new Date(listing.expires_at).toLocaleDateString()}</span>
                   </div>

                   <div className="bg-slate-950 rounded-sm p-3 border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                          {listing.listing_type === 'fixed' ? 'Price' : 'Current Bid'}
                        </div>
                        <div className={`text-xl font-heading font-black ${listing.currency === 'gold' ? 'text-yellow-400' : 'text-cyan-400'}`}>
                           {listing.listing_type === 'fixed' ? listing.price : listing.current_bid}
                           <span className="text-[10px] ml-1 text-slate-500 align-middle">{listing.currency === 'gold' ? 'GOLD' : 'GEMS'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => listing.listing_type === 'fixed' ? handleBuy(listing) : openBidModal(listing)}
                        disabled={listing.seller_id === user?.id}
                        className={`px-4 py-2 rounded-sm font-bold text-xs font-heading transition-all shadow-[2px_2px_0_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed
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

      {/* Bid Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedListing(null)}>
          <div className="bg-slate-900 p-8 rounded-[2rem] border border-amber-500/30 max-w-md w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
             <h3 className="text-2xl font-heading font-black text-white mb-2">PLACE BID</h3>
             <p className="text-slate-400 text-sm mb-6 font-mono">Enter your offer for <span className="text-white font-bold">{selectedListing.card.name}</span></p>

             <div className="bg-slate-950 p-4 rounded-sm border border-slate-800 mb-6 flex justify-between items-center">
                <div className="text-xs font-bold text-slate-500 uppercase font-mono">Current Highest</div>
                <div className="text-xl font-heading font-bold text-amber-400">{selectedListing.current_bid || selectedListing.price} {selectedListing.currency}</div>
             </div>

             <label className="text-xs font-bold text-slate-500 uppercase mb-2 block font-mono">Your Bid Amount</label>
             <div className="flex gap-2 mb-6">
                <input 
                  type="number" 
                  value={bidAmount}
                  onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-sm px-4 py-3 text-white font-mono text-lg focus:border-amber-500 outline-none"
                />
                <button onClick={() => setBidAmount(b => b + 10)} className="px-3 bg-slate-800 hover:bg-slate-700 rounded-sm border border-slate-700 font-bold font-mono">+10</button>
                <button onClick={() => setBidAmount(b => b + 50)} className="px-3 bg-slate-800 hover:bg-slate-700 rounded-sm border border-slate-700 font-bold font-mono">+50</button>
             </div>

             <button 
               onClick={submitBid}
               disabled={processingBid || bidAmount < ((selectedListing.current_bid || 0) + (selectedListing.min_bid_increment || 1))}
               className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white py-4 rounded-sm font-heading font-black tracking-wider shadow-lg"
             >
               {processingBid ? 'PROCESSING...' : 'CONFIRM BID'}
             </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-slate-900 rounded-[2rem] p-8 max-w-4xl w-full border border-slate-700 relative flex flex-col md:flex-row gap-8 h-[90vh] md:h-auto md:max-h-[90vh]">
              <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-white transition-colors z-10"><X size={20} /></button>
              
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                 <h2 className="text-2xl font-heading font-black text-white mb-6 shrink-0">CREATE LISTING</h2>
                 
                 <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-2 block font-mono">Select Card</label>
                       <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800">
                          {userCards.map(card => (
                            <div 
                              key={card.id} 
                              onClick={() => setSelectedCardId(card.id)}
                              className={`cursor-pointer p-1 rounded border-2 transition-all ${selectedCardId === card.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-transparent hover:border-slate-700'}`}
                            >
                              <img src={card.image_url} className="w-full rounded-sm" alt={card.name} />
                            </div>
                          ))}
                       </div>
                    </div>

                    <div className="flex gap-4">
                       <button onClick={() => setListingType('fixed')} className={`flex-1 py-3 rounded-sm font-bold font-heading text-xs border-2 transition-all ${listingType === 'fixed' ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-slate-800 text-slate-500'}`}>FIXED PRICE</button>
                       <button onClick={() => setListingType('auction')} className={`flex-1 py-3 rounded-sm font-bold font-heading text-xs border-2 transition-all ${listingType === 'auction' ? 'border-amber-500 bg-amber-500/20 text-white' : 'border-slate-800 text-slate-500'}`}>AUCTION</button>
                    </div>

                    <div className="flex gap-4">
                       <div className="flex-1">
                          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block font-mono">Amount</label>
                          <input 
                            type="number" 
                            min="1"
                            max="1000000"
                            value={price} 
                            onChange={e => setPrice(Math.max(1, Math.min(1000000, parseInt(e.target.value) || 0)))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-white font-mono focus:border-indigo-500 outline-none" 
                          />
                       </div>
                       <div className="w-1/3">
                          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block font-mono">Currency</label>
                          <select 
                            value={currency} 
                            onChange={e => setCurrency(e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-white font-bold outline-none font-mono"
                          >
                            <option value="gold">GOLD</option>
                            <option value="gems">GEMS</option>
                          </select>
                       </div>
                    </div>

                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-2 block font-mono">Duration</label>
                       <select 
                         value={duration}
                         onChange={e => setDuration(parseInt(e.target.value))}
                         className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-white font-bold outline-none font-mono"
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
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-sm font-heading font-black tracking-wider shadow-[4px_4px_0_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-none mt-4 shrink-0 transition-all"
                    >
                      CONFIRM LISTING
                    </button>
                 </div>
              </div>

              {selectedCardId && (
                <div className="w-48 hidden md:block shrink-0">
                   <div className="sticky top-0">
                     <CardDisplay card={userCards.find(c => c.id === selectedCardId)!} size="md" />
                   </div>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
