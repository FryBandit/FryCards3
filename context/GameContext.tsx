import React, { createContext, useContext, useEffect, useState } from 'react';
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

  const refreshDashboard = async () => {
    if (!user) return;
    setError(null);
    try {
      // 1. Try Primary RPC Method
      const { data, error: rpcError } = await supabase.rpc('get_user_dashboard', {
        p_user_id: user.id,
      });
      
      if (!rpcError && data) {
        setDashboard(data);
        return;
      }

      console.warn('Dashboard RPC failed, attempting manual recovery...', rpcError);

      // 2. Recovery: Ensure Profile Exists & Construct Dashboard Manually if RPC fails
      
      // A. Check/Create Profile
      let { data: profile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // If profile missing, create it
      if (!profile) {
         console.log('Initializing new operative profile...');
         const newProfile = {
           id: user.id,
           username: user.user_metadata?.full_name || user.email?.split('@')[0] || `Operative_${user.id.slice(0,4)}`,
           gold_balance: 100,
           gem_balance: 0,
           xp: 0,
           level: 1,
           packs_opened: 0,
           pity_counter: 0,
           daily_streak: 0,
           last_daily_claim: null
         };

         const { data: insertedProfile, error: insertError } = await supabase
           .from('profiles')
           .insert([newProfile])
           .select()
           .single();

         if (insertError) throw insertError;
         profile = insertedProfile;
      }

      // B. Retry RPC now that profile definitely exists
      const { data: retryData, error: retryError } = await supabase.rpc('get_user_dashboard', {
        p_user_id: user.id,
      });

      if (!retryError && retryData) {
        setDashboard(retryData);
        return;
      }

      // C. Fallback Construction
      console.warn('RPC Retry failed. Using fallback local construction.', retryError);

      const fallbackDashboard: DashboardData = {
        profile: profile,
        stats: {
          total_cards: 0,
          unique_cards: 0,
          total_possible: 0,
          completion_percentage: 0,
          rarity_breakdown: [],
          set_completion: []
        },
        missions: [],
        can_claim_daily: !isToday(profile.last_daily_claim)
      };

      try {
        const { count } = await supabase.from('user_cards').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
        if (count !== null) {
            fallbackDashboard.stats.total_cards = count;
            fallbackDashboard.stats.unique_cards = count;
        }
      } catch (e) { /* ignore */ }

      setDashboard(fallbackDashboard);

    } catch (err: any) {
      console.error('Critical error fetching dashboard:', err);
      setError(err.message || 'Failed to synchronize account data.');
    }
  };

  useEffect(() => {
    let mounted = true;

    const isAuthRedirect = 
      window.location.search.includes('code=') || 
      window.location.hash.includes('access_token') || 
      window.location.hash.includes('error_description');

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (session) {
            setUser(session.user);
            // Loading state will be handled by the user effect
          } 
          
          if (!session && !isAuthRedirect) {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted && !isAuthRedirect) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setUser(session?.user ?? null);
          if (!session && !isAuthRedirect) {
             setLoading(false);
          }
        }
      }
    );

    if (isAuthRedirect) {
      setTimeout(() => {
        if (mounted && loading) setLoading(false);
      }, 8000);
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Effect to load dashboard once user is set
  useEffect(() => {
    if (user) {
      // We do NOT set loading(true) here to avoid unmounting the app on token refresh/focus.
      // refreshDashboard handles the data update. loading(false) ensures initial load completes.
      refreshDashboard().finally(() => {
        setLoading(false);
      });
      
      const dbChannel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Profile update received:', payload);
            refreshDashboard();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(dbChannel);
      };
    } else {
      setDashboard(null);
      // Ensure loading is false if we have no user (e.g. after logout)
      // but only if we aren't in the initial loading phase handled by auth check.
      // However, for signOut case:
      if (!loading) setLoading(false); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const signInWithDiscord = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Login failed:", err);
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDashboard(null);
    setLoading(false);
  };

  return (
    <GameContext.Provider
      value={{
        user,
        dashboard,
        loading,
        error,
        refreshDashboard,
        signInWithDiscord,
        signOut,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

function isToday(dateString: string | null): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};