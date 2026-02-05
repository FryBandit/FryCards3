import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { supabase } from '../supabaseClient';
import { Trophy, Gift, Zap, Target, ChevronRight, Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import DailyRewardModal from '../components/DailyRewardModal';

const Dashboard: React.FC = () => {
  const { dashboard, refreshDashboard, user, error } = useGame();
  const [showRewardModal, setShowRewardModal] = useState(false);

  // Auto show modal if available on load, but only once per session
  React.useEffect(() => {
    if (dashboard?.can_claim_daily) {
      const todayKey = new Date().toDateString();
      const storageKey = `frycards_daily_modal_shown_${user?.id}`;
      const lastShown = sessionStorage.getItem(storageKey);

      if (lastShown !== todayKey) {
        setShowRewardModal(true);
        sessionStorage.setItem(storageKey, todayKey);
      }
    }
  }, [dashboard?.can_claim_daily, user?.id]);

  const handleCompleteMission = async (missionId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('complete_mission', { 
        p_user_id: user.id, 
        p_mission_id: missionId 
      });
      if (error) throw error;
      await refreshDashboard();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
         <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
            <AlertTriangle className="text-red-500" size={40} />
         </div>
         <h2 className="text-2xl font-heading font-black text-white mb-2 tracking-wide">CONNECTION ERROR</h2>
         <p className="text-slate-400 mb-8 max-w-md leading-relaxed">
           Unable to synchronize operative data. The neural link may be unstable.
           <br/>
           <span className="text-xs font-mono text-red-400 mt-2 block">{error}</span>
         </p>
         <button 
           onClick={() => refreshDashboard()}
           className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-900/40 transition-all active:scale-95"
         >
           <RefreshCw size={18} />
           RETRY CONNECTION
         </button>
      </div>
    );
  }

  if (!dashboard) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
       <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
       <p className="font-heading font-bold tracking-widest animate-pulse">SYNCING DATA...</p>
    </div>
  );

  const { profile, stats, missions } = dashboard;
  const xpNeeded = profile.level * 100;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <DailyRewardModal 
        isOpen={showRewardModal} 
        onClose={() => setShowRewardModal(false)}
        streak={profile.daily_streak}
      />

      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-8">
        <div>
          <h1 className="text-4xl font-heading font-black text-white tracking-tighter">
            OPERATOR: <span className="text-indigo-400">{profile.username.toUpperCase()}</span>
          </h1>
          <p className="text-slate-500 mt-1 font-mono text-sm">System status: <span className="text-green-500 uppercase">Operational</span> // Region: NA-East</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right hidden sm:block">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lifetime Packs</div>
              <div className="text-2xl font-heading font-bold text-white">{profile.packs_opened.toLocaleString()}</div>
           </div>
           <div className="w-px h-10 bg-slate-800 hidden sm:block"></div>
           <div className="text-right">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Collection Completion</div>
              <div className="text-2xl font-heading font-bold text-indigo-400">{stats.completion_percentage}%</div>
           </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile/Level Card */}
        <div className="md:col-span-2 glass p-8 rounded-3xl relative overflow-hidden group border border-slate-700/50">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Activity size={180} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-900/20">
                  <Zap className="text-white" size={32} />
               </div>
               <div>
                  <div className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Current Level</div>
                  <h3 className="text-4xl font-heading font-black text-white leading-none">RANK {profile.level}</h3>
               </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Experience Progress</span>
                <span className="text-xs font-mono text-indigo-400 font-bold">{profile.xp.toLocaleString()} XP (Next Level: {xpNeeded - (profile.xp % xpNeeded)})</span>
              </div>
              <div className="w-full bg-slate-900 h-6 rounded-xl overflow-hidden p-1 border border-slate-800">
                <div 
                  className="bg-gradient-to-r from-indigo-600 via-indigo-400 to-cyan-400 h-full rounded-lg transition-all duration-1000 shadow-[0_0_15px_rgba(79,70,229,0.5)]" 
                  style={{ width: `${(profile.xp % 100) / 100 * 100}%` }} 
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-10">
               <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Unique Assets</div>
                  <div className="text-xl font-heading font-bold text-white">{stats.unique_cards}</div>
               </div>
               <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Power</div>
                  <div className="text-xl font-heading font-bold text-white">{profile.xp.toLocaleString()}</div>
               </div>
               <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Pity Timer</div>
                  <div className="text-xl font-heading font-bold text-indigo-400">{profile.pity_counter}/10</div>
               </div>
            </div>
          </div>
        </div>

        {/* Daily Reward Card */}
        <div className="glass p-8 rounded-3xl flex flex-col justify-between border border-slate-700/50 shadow-xl shadow-indigo-950/20 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none"></div>
           <div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                  <Gift className="text-green-500" size={24} />
                </div>
                <h3 className="font-heading font-bold text-lg uppercase tracking-tight">Daily Access</h3>
              </div>
              
              <div className="text-center py-6 relative z-10">
                 <div className="text-5xl font-heading font-black text-white mb-2">{profile.daily_streak}</div>
                 <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Day Streak</div>
              </div>
           </div>

           <div className="mt-8 relative z-10">
              {dashboard.can_claim_daily ? (
                <button 
                  onClick={() => setShowRewardModal(true)}
                  className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-green-900/40 active:scale-95 flex items-center justify-center gap-2 animate-pulse"
                >
                  CLAIM DAILY REWARD
                  <ChevronRight size={18} />
                </button>
              ) : (
                <div className="w-full bg-slate-900/50 text-slate-500 py-4 rounded-2xl font-bold text-center border border-slate-800 text-sm flex flex-col items-center">
                   <span>REWARD CLAIMED</span>
                   <span className="text-[10px] opacity-60">RETURN TOMORROW</span>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Missions Section */}
      <div className="glass rounded-3xl p-8 relative overflow-hidden border border-slate-700/50">
        <h2 className="text-2xl font-heading font-black mb-8 flex items-center gap-3">
          <Target className="text-red-500" size={28} />
          ACTIVE MISSIONS
        </h2>
        
        <div className="grid grid-cols-1 gap-4">
          {missions.map((mission) => (
            <div key={mission.id} className="group bg-slate-900/40 hover:bg-slate-900/80 p-6 rounded-2xl border border-slate-800/50 hover:border-indigo-500/30 transition-all flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex-1 w-full">
                 <div className="flex items-center gap-3 mb-3">
                   <div className={`w-2 h-2 rounded-full ${mission.is_completed ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-indigo-500 shadow-[0_0_8px_#6366f1]'}`}></div>
                   <h4 className="font-bold text-lg text-white">{mission.description}</h4>
                 </div>
                 <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex-1 max-w-md bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className={`h-full transition-all duration-1000 ${mission.is_completed ? 'bg-green-500' : 'bg-indigo-500'}`} 
                        style={{ width: `${Math.min(mission.completion_percentage, 100)}%` }}
                      ></div>
                    </div>
                    <span className="font-mono text-xs font-bold">{mission.progress} / {mission.target}</span>
                 </div>
               </div>
               
               <div className="flex flex-row items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                 <div className="flex gap-4 text-xs font-black uppercase tracking-widest bg-slate-950/50 px-4 py-2 rounded-lg border border-slate-800">
                   <div className="flex flex-col items-center">
                      <span className="text-yellow-500 font-mono text-base">{mission.reward_gold}</span>
                      <span className="text-[8px] text-slate-500">GOLD</span>
                   </div>
                   {mission.reward_gems > 0 && (
                     <div className="flex flex-col items-center border-l border-slate-800 pl-4">
                        <span className="text-cyan-400 font-mono text-base">{mission.reward_gems}</span>
                        <span className="text-[8px] text-slate-500">GEMS</span>
                     </div>
                   )}
                   <div className="flex flex-col items-center border-l border-slate-800 pl-4">
                      <span className="text-purple-400 font-mono text-base">{mission.reward_xp}</span>
                      <span className="text-[8px] text-slate-500">XP</span>
                   </div>
                 </div>
                 
                 {mission.is_completed ? (
                   <button 
                     disabled={true}
                     className="bg-green-900/20 text-green-500 border border-green-500/30 px-8 py-3 rounded-xl font-black text-sm cursor-default"
                   >
                     COMPLETED
                   </button>
                 ) : mission.progress >= mission.target ? (
                   <button 
                      onClick={() => handleCompleteMission(mission.id)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black text-sm shadow-xl shadow-indigo-900/40 transition-all active:scale-95 animate-pulse"
                    >
                      CLAIM
                    </button>
                 ) : (
                   <div className="bg-slate-950 text-slate-600 border border-slate-800 px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest min-w-[100px] text-center">
                     IN PROGRESS
                   </div>
                 )}
               </div>
            </div>
          ))}
          
          {missions.length === 0 && (
            <div className="text-center py-16 bg-slate-950/30 rounded-3xl border-2 border-dashed border-slate-800">
              <Trophy className="mx-auto text-slate-700 mb-4" size={48} />
              <p className="text-slate-500 font-heading text-sm tracking-widest uppercase">ALL SECTOR OBJECTIVES COMPLETE</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;