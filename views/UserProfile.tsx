

import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { supabase } from '../supabaseClient';
import { PublicProfile } from '../types';
import { User, MapPin, Calendar, Activity, Layers, Edit } from 'lucide-react';

const UserProfile: React.FC = () => {
  const { user } = useGame();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
        // Fetch raw profile
        const { data: rawProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user?.id)
            .single();
        
        if (profileError) throw profileError;

        // Fetch social counts RPC
        const { data: socialCounts, error: socialError } = await supabase.rpc('get_social_counts', { p_user_id: user?.id });
        
        // Fetch collection count via RPC (reusing collection stats logic roughly or just simple query)
        const { count: cardCount } = await supabase.from('user_cards').select('id', { count: 'exact', head: true }).eq('user_id', user?.id);

        if (rawProfile) {
            setProfile({
                id: rawProfile.id,
                username: rawProfile.username,
                avatar_url: rawProfile.avatar_url,
                banner_url: rawProfile.banner_url,
                bio: rawProfile.bio,
                level: rawProfile.level,
                created_at: rawProfile.created_at,
                total_trades: 0, // Not easily available without RPC
                stats: {
                    total_cards: cardCount || 0,
                    unique_cards: 0 // Simplification
                },
                social: {
                    followers: socialCounts?.followers || 0,
                    following: socialCounts?.following || 0,
                    is_following: false,
                    is_friend: false,
                    friends: socialCounts?.friends || 0
                }
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">LOADING PROFILE DATA...</div>;
  if (!profile) return <div className="text-center py-20 text-slate-500">PROFILE NOT FOUND</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20">
       <div className="relative mb-20">
           {/* Banner */}
           <div className="h-64 w-full bg-slate-800 rounded-b-[3rem] overflow-hidden border-b border-slate-700 relative">
               {profile.banner_url ? (
                   <img src={profile.banner_url} className="w-full h-full object-cover" />
               ) : (
                   <div className="w-full h-full bg-gradient-to-r from-slate-900 to-indigo-900"></div>
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
           </div>

           {/* Avatar & Info */}
           <div className="absolute -bottom-16 left-0 right-0 px-8 flex items-end justify-between">
               <div className="flex items-end gap-6">
                   <div className="w-32 h-32 rounded-full border-4 border-slate-950 bg-slate-900 overflow-hidden shadow-2xl relative">
                       {profile.avatar_url ? (
                           <img src={profile.avatar_url} className="w-full h-full object-cover" />
                       ) : (
                           <User size={64} className="text-slate-600 m-auto mt-8" />
                       )}
                       <div className="absolute bottom-0 right-0 bg-indigo-600 text-white text-xs font-black px-2 py-1 rounded-tl-lg">LVL {profile.level}</div>
                   </div>
                   <div className="mb-4">
                       <h1 className="text-3xl font-heading font-black text-white">{profile.username}</h1>
                       <p className="text-slate-400 text-sm font-mono max-w-md">{profile.bio || "Operative has not set a bio."}</p>
                   </div>
               </div>
               <div className="mb-4 flex gap-3">
                    <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Edit size={14}/> Edit Profile</button>
               </div>
           </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Stats Column */}
           <div className="glass p-6 rounded-2xl border border-slate-700 h-fit">
               <h3 className="font-heading font-bold text-white mb-6 uppercase tracking-widest text-sm border-b border-slate-700 pb-2">Service Record</h3>
               <div className="space-y-4">
                   <div className="flex justify-between items-center">
                       <span className="text-slate-500 text-sm font-bold flex items-center gap-2"><Layers size={14} /> Total Collection</span>
                       <span className="text-white font-mono">{profile.stats.total_cards}</span>
                   </div>
                   <div className="flex justify-between items-center">
                       <span className="text-slate-500 text-sm font-bold flex items-center gap-2"><Activity size={14} /> Trades Completed</span>
                       <span className="text-white font-mono">{profile.total_trades}</span>
                   </div>
                   <div className="flex justify-between items-center">
                       <span className="text-slate-500 text-sm font-bold flex items-center gap-2"><Calendar size={14} /> Enlisted</span>
                       <span className="text-white font-mono">{new Date(profile.created_at).toLocaleDateString()}</span>
                   </div>
               </div>

               <div className="mt-8 pt-6 border-t border-slate-700 flex justify-between text-center">
                   <div>
                       <div className="text-lg font-black text-white">{profile.social.followers}</div>
                       <div className="text-[10px] uppercase text-slate-500 font-bold">Followers</div>
                   </div>
                   <div>
                       <div className="text-lg font-black text-white">{profile.social.following}</div>
                       <div className="text-[10px] uppercase text-slate-500 font-bold">Following</div>
                   </div>
                   <div>
                       <div className="text-lg font-black text-white">{profile.social.friends}</div>
                       <div className="text-[10px] uppercase text-slate-500 font-bold">Friends</div>
                   </div>
               </div>
           </div>
           
           {/* Featured / Activity (Placeholder for now) */}
           <div className="md:col-span-2 space-y-6">
                <div className="glass p-8 rounded-2xl border border-slate-700 text-center py-20">
                    <h3 className="font-heading font-bold text-slate-600 mb-2">ACTIVITY FEED</h3>
                    <p className="text-slate-500 text-sm">No recent activity logged.</p>
                </div>
           </div>
       </div>
    </div>
  );
};

export default UserProfile;