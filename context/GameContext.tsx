
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import { DashboardData } from '../types';

interface GameContextType {
  user: User | null;
  dashboard: DashboardData | null;
  loading: boolean;
  error: string | null;
  refreshDashboard: () => Promise<void>;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const refreshInProgress = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!user || refreshInProgress.current) return;
    
    refreshInProgress.current = true;
    if (mountedRef.current) setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_user_dashboard', {
        p_user_id: user.id,
      });
      
      if (!rpcError && data && data.stats) {
        if (mountedRef.current) setDashboard(data);
        return;
      }

      // Recovery flow
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) {
         const newProfile = {
           id: user.id,
           username: user.user_metadata?.full_name || user.email?.split('@')[0] || `User_${user.id.slice(0,4)}`,
           gold_balance: 500,
           gem_balance: 50,
           xp: 0,
           level: 1,
           packs_opened: 0,
           pity_counter: 0,
           daily_streak: 1,
           last_daily_claim: new Date().toISOString()
         };

         const { data: insertedProfile, error: insertError } = await supabase
           .from('profiles')
           .insert([newProfile])
           .select()
           .single();

         if (insertError) throw insertError;
         profile = insertedProfile;
      }

      const { data: retryData } = await supabase.rpc('get_user_dashboard', {
        p_user_id: user.id,
      });

      if (retryData && retryData.stats && mountedRef.current) {
        setDashboard(retryData);
      } else {
        const fallback: DashboardData = {
          profile: profile as any,
          stats: { total_cards: 0, unique_cards: 0, total_possible: 100, completion_percentage: 0, rarity_breakdown: [], set_completion: [] },
          missions: [],
          can_claim_daily: false
        };
        if (mountedRef.current) setDashboard(fallback);
      }

    } catch (err: any) {
      console.error('Dashboard Error:', err);
      if (mountedRef.current) setError(err.message);
    } finally {
      refreshInProgress.current = false;
    }
  }, [user]);

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mountedRef.current) {
        setUser(session?.user ?? null);
        if (!session) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mountedRef.current) {
        setUser(session?.user ?? null);
        if (!session) setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      refreshDashboard().finally(() => {
        if (mountedRef.current) setLoading(false);
      });
    }
  }, [user, refreshDashboard]);

  const signInWithDiscord = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin }
    });
    if (error && mountedRef.current) {
      setLoading(false);
      alert(error.message);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    if (mountedRef.current) {
      setUser(null);
      setDashboard(null);
      setLoading(false);
    }
  };

  return (
    <GameContext.Provider value={{ user, dashboard, loading, error, refreshDashboard, signInWithDiscord, signOut }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
