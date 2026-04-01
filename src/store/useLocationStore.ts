import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getPositionOnce, reverseGeocode } from '../utils/gps';

export const DEFAULT_LOCATION = {
  lat: 34.0195,
  lng: -118.4912,
  label: 'Santa Monica · CA',
};

export type LocationPermission = 'unknown' | 'granted' | 'denied';

interface LocationState {
  coords: { lat: number; lng: number } | null;
  locationLabel: string;
  permissionState: LocationPermission;

  // Runtime-only (not persisted)
  isLocating: boolean;

  // Actions
  /** Check browser permission state, then request location if appropriate. */
  checkAndRequest: () => Promise<void>;
  /** Explicitly request GPS — triggers the browser permission dialog if needed. */
  requestLocation: () => Promise<void>;
  /** Use Santa Monica fallback, e.g. after denial. */
  useFallback: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      coords: null,
      locationLabel: DEFAULT_LOCATION.label,
      permissionState: 'unknown',
      isLocating: false,

      checkAndRequest: async () => {
        const { coords, permissionState, requestLocation, useFallback } = get();

        // Already have a fresh location from this session — nothing to do
        if (coords && permissionState === 'granted') return;

        // Check what the browser already knows without triggering a dialog
        if (navigator.permissions) {
          try {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            if (result.state === 'denied') {
              useFallback();
              return;
            }
            if (result.state === 'granted') {
              // Already granted — fetch silently, no banner needed
              await requestLocation();
              return;
            }
            // 'prompt' — leave permissionState as 'unknown' so Navbar shows the banner
            return;
          } catch {
            // Permissions API not supported — fall through to direct request
          }
        }

        // No Permissions API available — attempt directly
        await requestLocation();
      },

      requestLocation: async () => {
        if (get().isLocating) return;
        set({ isLocating: true });

        const pos = await getPositionOnce(10000);

        if (!pos) {
          // Failed or denied — fall back if no coords at all
          const existing = get().coords;
          if (!existing) {
            set({
              coords: { lat: DEFAULT_LOCATION.lat, lng: DEFAULT_LOCATION.lng },
              locationLabel: DEFAULT_LOCATION.label,
              permissionState: 'denied',
              isLocating: false,
            });
          } else {
            set({ permissionState: 'denied', isLocating: false });
          }
          return;
        }

        const { latitude: lat, longitude: lng } = pos.coords;
        const label = await reverseGeocode(lat, lng);
        set({
          coords: { lat, lng },
          locationLabel: label,
          permissionState: 'granted',
          isLocating: false,
        });
      },

      useFallback: () => set({
        coords: { lat: DEFAULT_LOCATION.lat, lng: DEFAULT_LOCATION.lng },
        locationLabel: DEFAULT_LOCATION.label,
        permissionState: 'denied',
        isLocating: false,
      }),
    }),
    {
      name: 'birddex-location-v1',
      partialize: (state) => ({
        coords: state.coords,
        locationLabel: state.locationLabel,
        permissionState: state.permissionState,
      }),
    },
  ),
);
