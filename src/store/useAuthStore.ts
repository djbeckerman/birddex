import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { ProfileRow } from '../types/database';
import { supabase } from '../lib/supabase';

interface AuthStore {
  session:     Session | null;
  profile:     ProfileRow | null;
  authLoading: boolean;

  setSession(session: Session | null): void;
  setProfile(profile: ProfileRow | null): void;
  setAuthLoading(loading: boolean): void;

  /** Fetch profile from Supabase and populate store */
  fetchProfile(userId: string): Promise<ProfileRow | null>;

  /** Sign out and clear local auth state */
  signOut(): Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session:     null,
  profile:     null,
  authLoading: true,

  setSession:     (session)     => set({ session }),
  setProfile:     (profile)     => set({ profile }),
  setAuthLoading: (authLoading) => set({ authLoading }),

  fetchProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    const profile = data as ProfileRow;
    set({ profile });
    return profile;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));
