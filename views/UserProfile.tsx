
import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { supabase } from '../supabaseClient';
import { PublicProfile } from '../types';
import { User, MapPin, Calendar, Activity, Layers, Edit, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const UserProfile: React.FC = () => {
  const { user, showToast } = useGame();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', bio: '', avatar_url: '', banner_url: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  useEffect(() => {
      if (profile) {
          setEditForm({
              username: profile.username || '',
              bio: profile.bio || '',
              avatar_url: profile.avatar_url || '',
              banner_url: profile.banner_url || ''
          });
      }
  }, [profile]);

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
        
        // Fetch collection count via RPC
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
                total_trades: 0,
                stats: {
                    total_cards: cardCount || 0,
                    unique_cards: 0 
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

  const handleUpdateProfile = async () => {
      if (!user) return;
      setSaving(true);
      try {
          const { error } = await supabase.rpc('update_user_profile', {
              p_username: editForm.username,
              p_bio: editForm.bio,
              p_avatar_url: editForm.avatar_url,
              p_banner_url: editForm.banner_url
          });

          if (error) throw error;
          
          showToast("Profile updated successfully", "success");
          setIsEditing(false);
          fetchProfile();

      } catch (e: any) {
          showToast(e.message, 'error');
      } finally {
          setSaving(false);
      }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">LOADING PROFILE DATA...</div>;
  if (!profile) return <div className="text-center py-20 text-slate-500">PROFILE NOT FOUND</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20 relative">
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
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                    >
                        <Edit size={14}/> Edit Profile
                    </button>
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

       {/* Edit Modal */}
       <AnimatePresence>
           {isEditing && (
               <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
               >
                   <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                   >
                       <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                           <h3 className="font-heading font-bold text-white">EDIT IDENTITY</h3>
                           <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
                       </div>
                       
                       <div className="p-8 space-y-4">
                           <div>
                               <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Username</label>
                               <input 
                                   type="text" 
                                   value={editForm.username}
                                   onChange={e => setEditForm({...editForm, username: e.target.value})}
                                   className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-indigo-500 outline-none font-mono"
                               />
                           </div>
                           <div>
                               <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Bio</label>
                               <textarea 
                                   value={editForm.bio}
                                   onChange={e => setEditForm({...editForm, bio: e.target.value})}
                                   rows={3}
                                   className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-indigo-500 outline-none font-mono text-sm"
                               />
                           </div>
                           <div>
                               <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Avatar URL</label>
                               <input 
                                   type="text" 
                                   value={editForm.avatar_url}
                                   onChange={e => setEditForm({...editForm, avatar_url: e.target.value})}
                                   className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-indigo-500 outline-none font-mono text-sm"
                               />
                           </div>
                           <div>
                               <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Banner URL</label>
                               <input 
                                   type="text" 
                                   value={editForm.banner_url}
                                   onChange={e => setEditForm({...editForm, banner_url: e.target.value})}
                                   className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-indigo-500 outline-none font-mono text-sm"
                               />
                           </div>

                           <button 
                                onClick={handleUpdateProfile}
                                disabled={saving}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-lg font-heading font-black tracking-widest mt-4 shadow-lg disabled:opacity-50"
                           >
                               {saving ? 'SAVING...' : 'SAVE CHANGES'}
                           </button>
                       </div>
                   </motion.div>
               </motion.div>
           )}
       </AnimatePresence>
    </div>
  );
};

export default UserProfile;
