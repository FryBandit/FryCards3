import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { supabase } from '../supabaseClient';
import { Trophy, Gift, Zap, Target, Activity, RefreshCw } from 'lucide-react';
import DailyRewardModal from '../components/DailyRewardModal';

const Dashboard: React.FC = () => {
  const { dashboard, refreshDashboard, user, error } = useGame();
  const [showRewardModal, setShowRewardModal] = useState(false);

  const handleCompleteMission = async (missionId: string) => {
    if (!user) return;
    const { error } = await supabase.rpc('complete_mission', { p_user_id: user.id, p_mission_id: missionId });
    if (error) alert(error.message);
    else await refreshDashboard();
  };

  if (error) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
       <RefreshCw className="text-red-500 mb-6" size={48} />
       <h2 className="text-2xl font-heading font-black mb-2">SYNC ERROR</h2>
       <p className="text-slate-400 mb-8">{error}</p>
       <button onClick={() => refreshDashboard()} className="bg-indigo-600 px-8 py-3 rounded-xl font-black tracking-widest">RETRY LINK</button>
    </div>
  );

  if (!dashboard) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
       <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
       <p className="font-heading font-bold animate-pulse">ESTABLISHING CONNECTION...</p>
    </div>
  );

  const { profile, stats, missions } = dashboard;
  const xpNeeded = profile.level * 100;
  const progress = (profile.xp % 100);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <DailyRewardModal isOpen={showRewardModal} onClose={() => setShowRewardModal(false)} streak={profile.daily_streak} />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-8">
        <div>
          <h1 className="text-4xl font-heading font-black text-white tracking-tighter uppercase">OPERATOR: <span className="text-indigo-400">{profile.username}</span></h1>
          <p className="text-slate-500 mt-1 font-mono text-xs">STATUS: ONLINE // ENCRYPTION: ACTIVE</p>
        </div>
        <div className="text-right">
           <div className="text-[10px] font-bold text-slate-500 uppercase">Collection Progress</div>
           <div className="text-2xl font-heading font-bold text-indigo-400">{stats.completion_percentage}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass p-8 rounded-3xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Zap className="text-white" size={32} />
               </div>
               <div>
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Rank Status</div>
                  <h3 className="text-4xl font-heading font-black text-white">LEVEL {profile.level}</h3>
               </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                <span>Experience</span>
                <span className="text-indigo-400">{profile.xp} XP</span>
              </div>
              <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden border border-slate-800 p-1">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-10">
               <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                  <div className="text-[10px] text-slate-500 uppercase mb-1">Assets</div>
                  <div className="text-xl font-heading font-bold text-white">{stats.unique_cards}</div>
               </div>
               <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                  <div className="text-[10px] text-slate-500 uppercase mb-1">Packs</div>
                  <div className="text-xl font-heading font-bold text-white">{profile.packs_opened}</div>
               </div>
               <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                  <div className="text-[10px] text-slate-500 uppercase mb-1">Pity</div>
                  <div className="text-xl font-heading font-bold text-indigo-400">{profile.pity_counter}/10</div>
               </div>
            </div>
          </div>
        </div>

        <div className="glass p-8 rounded-3xl flex flex-col justify-between border border-slate-700/50">
           <div>
              <div className="flex items-center gap-3 mb-6">
                <Gift className="text-green-500" size={24} />
                <h3 className="font-heading font-bold uppercase">Daily Access</h3>
              </div>
              <div className="text-center py-6">
                 <div className="text-5xl font-heading font-black text-white mb-2">{profile.daily_streak}</div>
                 <div className="text-xs text-slate-500 uppercase">Day Streak</div>
              </div>
           </div>
           {dashboard.can_claim_daily ? (
             <button onClick={() => setShowRewardModal(true)} className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold transition-all shadow-lg animate-pulse">CLAIM REWARD</button>
           ) : (
             <div className="w-full bg-slate-900 text-slate-600 py-4 rounded-2xl font-bold text-center border border-slate-800 text-sm">CLAIMED</div>
           )}
        </div>
      </div>

      <div className="glass rounded-3xl p-8 border border-slate-700/50">
        <h2 className="text-2xl font-heading font-black mb-8 flex items-center gap-3"><Target className="text-red-500" size={28} /> ACTIVE MISSIONS</h2>
        <div className="grid grid-cols-1 gap-4">
          {missions.map(m => (
            <div key={m.id} className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex-1 w-full">
                 <h4 className="font-bold text-lg text-white mb-2">{m.description}</h4>
                 <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${m.completion_percentage}%` }}></div>
                 </div>
               </div>
               {m.progress >= m.target && !m.is_completed ? (
                 <button onClick={() => handleCompleteMission(m.id)} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">CLAIM</button>
               ) : (
                 <div className="text-slate-600 font-bold uppercase text-xs">{m.is_completed ? 'COMPLETE' : `${m.progress}/${m.target}`}</div>
               )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;