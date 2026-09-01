import { create } from 'zustand';

interface IdentifyState {
  /** Whether the Identify overlay is currently open. */
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

/**
 * Identify used to be its own routed page + bottom-nav tab. It's now a
 * full-screen overlay that can be launched from anywhere (the Discover
 * page's identify button, or New Sighting's "Help me identify it" path)
 * without needing to know about routing. This store just tracks whether
 * it's open; `IdentifyPage` is mounted once at the app shell level and
 * reads it.
 */
export const useIdentifyStore = create<IdentifyState>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
