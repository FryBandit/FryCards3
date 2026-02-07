
import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { supabase } from '../supabaseClient';
import { PublicProfile } from '../types';
import { User, MapPin, Calendar, Activity, Layers, Edit, X, Save, UserPlus, UserMinus, UserCheck, Upload, Flag, ShieldAlert, Camera, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const UserProfile: React.FC = () => {
  const { user, showToast } = useGame();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', bio: '', avatar_url: '', banner_url: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  
  // Social Actions
  const [togglingFollow, setTogglingFollow] = useState(false);

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
        const { data: socialCounts } = await supabase.rpc('get_social_counts', { p_user_id: user?.id });
        
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

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    if (!event.target.files || event.target.files.length === 0 || !user) return;
    
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const bucket = type === 'avatar' ? 'avatars' : 'banners';
    
    type === 'avatar' ? setUploadingAvatar(true) : setUploadingBanner(true);

    try {
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
        
        setEditForm(prev => ({
            ...prev,
            [type === 'avatar' ? 'avatar_url' : 'banner_url']: data.publicUrl
        }));
        
        showToast(`${type === 'avatar' ? 'Avatar' : 'Banner'} uploaded successfully!`, 'success');
    } catch (error: any) {
        showToast(`Upload failed: ${error.message}`, 'error');
    } finally {
        type === 'avatar' ? setUploadingAvatar(false) : setUploadingBanner(false);
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

  const handleToggleFollow = async () => {
      if (!user || !profile || togglingFollow) return;
      setTogglingFollow(true);
      try {
          const { error } = await supabase.rpc('toggle_follow', { p_target_user_id: profile.id });
          if (error) throw error;
          
          setProfile(prev => prev ? ({
              ...prev,
              social: {
                  ...prev.social,
                  is_following: !prev.social.is_following,
                  followers: prev.social.is_following ? prev.social.followers - 1 : prev.social.followers + 1
              }
          }) : null);
          
      } catch (e: any) {
          showToast(e.message, 'error');
      } finally {
          setTogglingFollow(false);
      }
  };

  const handleReportUser = async () => {
      if (!confirm("Report this operative for violation of protocol?")) return;
      // In a real app, this would call a report_user RPC. 
      // For now, we simulate the action as requested.
      showToast("Report submitted to High Command.", "info");
  };

  if (loading) return <div className="text-center py-20 text-slate-500 font-mono animate-pulse">DECRYPTING DOSSIER...</div>;
  if (!profile) return <div className="text-center py-20 text-slate-500 font-mono">OPERATIVE NOT FOUND</div>;

  const isSelf = user?.id === profile.id;

  return (
    <div className="max-w-4xl mx-auto pb-20 relative animate-fade-in">
       <div className="relative mb-20">
           {/* Banner */}
           <div className="h-64 w-full bg-slate-800 rounded-b-[3rem] overflow-hidden border-b border-slate-700 relative shadow-2xl group">
               {profile.banner_url ? (
                   <img src={profile.banner_url} className="w-full h-full object-cover" />
               ) : (
                   <div className="w-full h-full bg-gradient-to-r from-slate-900 to-indigo-900 flex items-center justify-center">
                       <ImageIcon className="text-slate-700 opacity-20" size={64} />
                   </div>
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
           </div>

           {/* Avatar & Info */}
           <div className="absolute -bottom-16 left-0 right-0 px-8 flex flex-col md:flex-row items-end justify-between gap-4">
               <div className="flex items-end gap-6">
                   <div className="w-32 h-32 rounded-full border-4 border-slate-950 bg-slate-900 overflow-hidden shadow-2xl relative group">
                       {profile.avatar_url ? (
                           <img src={profile.avatar_url} className="w-full h-full object-cover" />
                       ) : (
                           <User size={64} className="text-slate-600 m-auto mt-8" />
                       )}
                       <div className="absolute bottom-0 right-0 bg-indigo-600 text-white text-xs font-black px-2 py-1 rounded-tl-lg shadow-lg">LVL {profile.level}</div>
                   </div>
                   <div className="mb-4">
                       <h1 className="text-3xl font-heading font-black text-white drop-shadow-md">{profile.username}</h1>
                       <p className="text-slate-400 text-sm font-mono max-w-md">{profile.bio || "Operative has not set a bio."}</p>
                   </div>
               </div>
               
               <div className="mb-4 flex gap-3">
                    {isSelf ? (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border border-slate-700 transition-colors"
                        >
                            <Edit size={14}/> Edit Profile
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button 
                                onClick={handleToggleFollow}
                                disabled={togglingFollow}
                                className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg
                                    ${profile.social.is_following 
                                        ? 'bg-slate-800 text-slate-300 hover:bg-red-900/50 hover:text-red-400' 
                                        : 'bg-indigo-600 text-white hover:bg-indigo-500'}
                                `}
                            >
                                {profile.social.is_following ? <UserCheck size={16} /> : <UserPlus size={16} />}
                                {profile.social.is_following ? 'Following' : 'Follow'}
                            </button>
                            <button 
                                onClick={handleReportUser}
                                className="bg-slate-900 hover:bg-red-900/50 text-slate-500 hover:text-red-400 p-2.5 rounded-lg border border-slate-700 transition-colors"
                                title="Report User"
                            >
                                <Flag size={16} />
                            </button>
                        </div>
                    )}
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
           
           {/* Featured / Activity */}
           <div className="md:col-span-2 space-y-6">
                <div className="glass p-8 rounded-2xl border border-slate-700 text-center py-20 flex flex-col items-center">
                    <ShieldAlert className="text-slate-700 mb-4" size={48} />
                    <h3 className="font-heading font-bold text-slate-500 mb-2">ACTIVITY FEED ENCRYPTED</h3>
                    <p className="text-slate-600 text-sm font-mono">Recent operational data is restricted to high-clearance operatives.</p>
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
                       
                       <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
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

                           <div className="grid grid-cols-2 gap-4">
                               <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Avatar</label>
                                   <div className="relative group">
                                       <div className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                                           {editForm.avatar_url ? <img src={editForm.avatar_url} className="w-full h-full object-cover" /> : <User className="text-slate-700" />}
                                           {uploadingAvatar && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div></div>}
                                       </div>
                                       <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 cursor-pointer transition-opacity rounded-lg">
                                           <div className="text-white flex flex-col items-center">
                                               <Camera size={20} />
                                               <span className="text-[10px] font-bold mt-1">UPLOAD</span>
                                           </div>
                                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'avatar')} />
                                       </label>
                                   </div>
                               </div>

                               <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Banner</label>
                                   <div className="relative group">
                                       <div className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                                           {editForm.banner_url ? <img src={editForm.banner_url} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-700" />}
                                           {uploadingBanner && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div></div>}
                                       </div>
                                       <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 cursor-pointer transition-opacity rounded-lg">
                                           <div className="text-white flex flex-col items-center">
                                               <Camera size={20} />
                                               <span className="text-[10px] font-bold mt-1">UPLOAD</span>
                                           </div>
                                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'banner')} />
                                       </label>
                                   </div>
                               </div>
                           </div>

                           <button 
                                onClick={handleUpdateProfile}
                                disabled={saving || uploadingAvatar || uploadingBanner}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-lg font-heading font-black tracking-widest mt-4 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                           >
                               {saving ? 'UPLOADING PROFILE...' : <><Save size={16}/> SAVE CHANGES</>}
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
