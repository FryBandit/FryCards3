
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import { DashboardData } from '../types';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface GameContextType {
  user: User | null;
  dashboard: DashboardData | null;
  loading: boolean;
  error: string | null;
  toasts: ToastMessage[];
  refreshDashboard: () => Promise<void>;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const refreshInProgress = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Toast System
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!user || refreshInProgress.current) return;
    
    refreshInProgress.current = true;
    if (mountedRef.current) setError(null);

    try {
      // Fetch Profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Fetch Collection Stats via RPC
      const { data: stats, error: statsError } = await supabase.rpc('get_collection_stats', {
        p_user_id: user.id
      });

      if (statsError) console.warn("Failed to fetch stats", statsError);

      // Fetch Missions (Raw Select)
      // Check if we need to generate them first
      await supabase.rpc('check_and_create_daily_missions'); // Trigger logic if needed, though usually handled by DB triggers

      const { data: missions, error: missionsError } = await supabase
        .from('daily_missions')
        .select('*')
        .eq('user_id', user.id)
        .eq('created_at', new Date().toISOString().split('T')[0]);

      const dashboardData: DashboardData = {
        profile: profile as any,
        stats: stats || {
          total_cards: 0,
          unique_cards: 0,
          total_possible: 0,
          completion_percentage: 0,
          rarity_breakdown: [],
          set_completion: []
        },
        missions: missions || [],
        can_claim_daily: profile.last_daily_claim !== new Date().toISOString().split('T')[0]
      };

      if (mountedRef.current) setDashboard(dashboardData);

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
      showToast(error.message, 'error');
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
    <GameContext.Provider value={{ user, dashboard, loading, error, toasts, refreshDashboard, signInWithDiscord, signOut, showToast, removeToast }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
