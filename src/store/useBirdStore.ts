import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Bird, SpottedEntry } from '../types/bird';
import { supabase } from '../lib/supabase';
import * as sightingsService from '../services/sightingsService';

const PHOTO_CACHE_MAX = 5000;

export type SortBy = 'likelihood' | 'comName' | 'spottedAt' | 'rarest';

interface BirdState {
  // Local bird list (regional species ranked by frequency)
  allBirds: Bird[];
  localBirdsStatus: 'idle' | 'loading' | 'success' | 'error';

  // Photo cache (persisted)
  photoCache: Record<string, string | null>;
  photoCacheOrder: string[];

  // Collection (persisted)
  spottedBirds: Record<string, SpottedEntry>;

  // Onboarding (persisted)
  hasOnboarded: boolean;

  // Spirit Bird (persisted)
  spiritBirdCode: string | null;
  spiritBirdPhotoUrl: string | null;
  hasSeenSpiritBird: boolean;

  // UI state
  searchQuery: string;
  sortBy: SortBy;

  // Actions
  setLocalBirds: (birds: Bird[]) => void;
  setLocalBirdsStatus: (status: BirdState['localBirdsStatus']) => void;
  spotBird: (speciesCode: string, meta?: Partial<SpottedEntry>) => void;
  unspotBird: (speciesCode: string) => void;
  toggleSpotted: (speciesCode: string) => void;
  updateSpottedEntry: (speciesCode: string, patch: Partial<SpottedEntry>) => void;
  cachePhoto: (speciesCode: string, url: string | null) => void;
  setSearchQuery: (q: string) => void;
  setSortBy: (sort: SortBy) => void;
  setHasOnboarded: (v: boolean) => void;
  setSpiritBird: (code: string, photoUrl: string | null) => void;
  setHasSeenSpiritBird: (v: boolean) => void;
  clearCollection: () => void;
  /** Overwrite spottedBirds with data from Supabase (called after login) */
  syncFromSupabase: (sightings: Record<string, SpottedEntry>) => void;
}

export const useBirdStore = create<BirdState>()(
  persist(
    (set, get) => ({
      allBirds: [],
      localBirdsStatus: 'idle',
      photoCache: {},
      photoCacheOrder: [],
      spottedBirds: {},
      hasOnboarded: false,
      spiritBirdCode: null,
      spiritBirdPhotoUrl: null,
      hasSeenSpiritBird: false,
      searchQuery: '',
      sortBy: 'likelihood',

      setLocalBirds: (birds) =>
        set({ allBirds: birds, localBirdsStatus: 'success' }),

      setLocalBirdsStatus: (status) => set({ localBirdsStatus: status }),

      spotBird: (speciesCode, meta = {}) => {
        const entry: SpottedEntry = { spottedAt: new Date().toISOString(), ...meta };
        set((s) => ({ spottedBirds: { ...s.spottedBirds, [speciesCode]: entry } }));
        // Non-blocking Supabase sync
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) return;
          const bird = get().allBirds.find((b) => b.speciesCode === speciesCode);
          sightingsService
            .upsertSighting(session.user.id, speciesCode, bird?.comName ?? '', bird?.sciName ?? '', entry)
            .catch(console.error);
        });
      },

      unspotBird: (speciesCode) => {
        set((s) => {
          const next = { ...s.spottedBirds };
          delete next[speciesCode];
          return { spottedBirds: next };
        });
        // Non-blocking Supabase sync
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) return;
          sightingsService.deleteSighting(session.user.id, speciesCode).catch(console.error);
        });
      },

      toggleSpotted: (speciesCode) => {
        const { spottedBirds, spotBird, unspotBird } = get();
        if (spottedBirds[speciesCode]) {
          unspotBird(speciesCode);
        } else {
          spotBird(speciesCode);
        }
      },

      updateSpottedEntry: (speciesCode, patch) =>
        set((s) => {
          const existing = s.spottedBirds[speciesCode];
          if (!existing) return {};
          return {
            spottedBirds: {
              ...s.spottedBirds,
              [speciesCode]: { ...existing, ...patch },
            },
          };
        }),

      cachePhoto: (speciesCode, url) =>
        set((s) => {
          const cache = { ...s.photoCache };
          const order = [...s.photoCacheOrder];

          if (order.length >= PHOTO_CACHE_MAX) {
            const evict = order.shift()!;
            delete cache[evict];
          }

          if (!(speciesCode in cache)) {
            order.push(speciesCode);
          }

          cache[speciesCode] = url;
          return { photoCache: cache, photoCacheOrder: order };
        }),

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSortBy: (sortBy) => set({ sortBy }),
      setHasOnboarded: (hasOnboarded) => set({ hasOnboarded }),
      setSpiritBird: (code, photoUrl) => set({ spiritBirdCode: code, spiritBirdPhotoUrl: photoUrl }),
      setHasSeenSpiritBird: (hasSeenSpiritBird) => set({ hasSeenSpiritBird }),
      clearCollection: () => set({ spottedBirds: {} }),

      syncFromSupabase: (sightings) => set({ spottedBirds: sightings }),
    }),
    {
      name: 'birddex-store-v2',
      partialize: (state) => ({
        spottedBirds: state.spottedBirds,
        photoCache: state.photoCache,
        photoCacheOrder: state.photoCacheOrder,
        hasOnboarded: state.hasOnboarded,
        spiritBirdCode: state.spiritBirdCode,
        spiritBirdPhotoUrl: state.spiritBirdPhotoUrl,
        hasSeenSpiritBird: state.hasSeenSpiritBird,
      }),
    }
  )
);
