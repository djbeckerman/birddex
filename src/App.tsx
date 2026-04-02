import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { NotebookLayout } from './components/layout/NotebookLayout';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/BottomNav/BottomNav';
import { OnboardingWelcome } from './components/OnboardingWelcome/OnboardingWelcome';
import { NewSightingModal } from './components/NewSightingModal/NewSightingModal';
import { SpiritBirdPage } from './pages/SpiritBird/SpiritBirdPage';
import { AuthPage } from './pages/Auth/AuthPage';
import { ProfileSetupPage } from './pages/Auth/ProfileSetupPage';
import { CollectionPage } from './pages/Collection/CollectionPage';
import { DiscoverPage } from './pages/Discover/DiscoverPage';
import { IdentifyPage } from './pages/Identify/IdentifyPage';
import { FriendsPage } from './pages/Friends/FriendsPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { InvitePage } from './pages/Invite/InvitePage';
import { useBirdStore } from './store/useBirdStore';
import { useAuthStore } from './store/useAuthStore';
import { useLocationStore } from './store/useLocationStore';
import { supabase } from './lib/supabase';
import * as sightingsService from './services/sightingsService';
import { track, identifyUser } from './lib/posthog';
import type { Bird } from './types/bird';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 60, retry: 2 } },
});

const pageVariants = {
  enter:  { opacity: 0, x: -16, scale: 0.99 },
  center: { opacity: 1, x: 0,   scale: 1    },
  exit:   { opacity: 0, x: 16,  scale: 0.99 },
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ flex: 1, minWidth: 0 }}
      >
        <Routes location={location}>
          <Route path="/"                    element={<CollectionPage />} />
          <Route path="/discover"            element={<DiscoverPage />} />
          <Route path="/identify"            element={<IdentifyPage />} />
          <Route path="/friends"             element={<FriendsPage />} />
          <Route path="/profile/:username"   element={<ProfilePage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

// ── App phase state machine ───────────────────────────────────
// loading       → checking Supabase session on startup
// spirit-bird   → unauthenticated first-run quiz
// auth          → unauthenticated, spirit bird done (sign in / sign up)
// profile-setup → just signed up, no username yet
// onboarding    → authenticated, profile complete, first-time app tour
// app           → main app

type AppPhase = 'loading' | 'spirit-bird' | 'auth' | 'profile-setup' | 'onboarding' | 'app';

function AppShell() {
  const {
    hasOnboarded, setHasOnboarded,
    hasSeenSpiritBird, setHasSeenSpiritBird,
    setSpiritBird,
    spiritBirdCode,
    spottedBirds,
    allBirds,
    syncFromSupabase,
  } = useBirdStore();

  const {
    session, profile,
    authLoading,
    setSession, setAuthLoading,
    fetchProfile,
  } = useAuthStore();

  const checkAndRequest = useLocationStore((s) => s.checkAndRequest);

  const [phase, setPhase] = useState<AppPhase>('loading');
  const [onboardingLogBird, setOnboardingLogBird] = useState<Bird | null>(null);

  // ── Location init — runs once on mount ──────────────────────
  useEffect(() => {
    track('app_opened');
    checkAndRequest();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Dev reset helper ────────────────────────────────────────
  useEffect(() => {
    if (!window.location.search.includes('reset-spirit-bird')) return;
    setHasSeenSpiritBird(false);
    setHasOnboarded(false);
    window.history.replaceState({}, '', window.location.pathname);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Supabase auth listener ──────────────────────────────────
  useEffect(() => {
    // Bootstrap session from storage
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });

    // Subscribe to future changes (sign in / sign out / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch profile + sync sightings when session changes ─────
  useEffect(() => {
    if (authLoading || !session) return;

    const userId = session.user.id;

    fetchProfile(userId).then((p) => {
      // Sync spirit bird from Supabase — prevents quiz re-appearing on new devices
      if (p?.spirit_bird_code) {
        if (!hasSeenSpiritBird) setHasSeenSpiritBird(true);
        if (!spiritBirdCode) setSpiritBird(p.spirit_bird_code, p.spirit_bird_photo_url ?? null);
      }

      // If no username yet: profile setup (new sign-up)
      if (!p?.username) return; // phase will be set to 'profile-setup' by the phase effect

      // Identify user in PostHog
      identifyUser(userId, {
        display_name: p.display_name ?? null,
        username: p.username,
        spirit_bird: p.spirit_bird_code ?? null,
      });

      // Migrate any local sightings that haven't been synced yet
      const localCount = Object.keys(spottedBirds).length;
      if (localCount > 0) {
        sightingsService
          .migrateSightings(userId, spottedBirds, allBirds)
          .catch(console.error);
      }

      // Pull all sightings from Supabase → populate store
      sightingsService
        .fetchSightings(userId)
        .then((remote) => {
          // Merge: local wins if spotted_date is newer; remote fills missing entries
          const merged = { ...remote };
          for (const [code, local] of Object.entries(spottedBirds)) {
            const rem = remote[code];
            if (!rem || new Date(local.spottedAt) > new Date(rem.spottedAt)) {
              merged[code] = local;
            }
          }
          syncFromSupabase(merged);
        })
        .catch(console.error);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, authLoading]);

  // ── Derive app phase ─────────────────────────────────────────
  useEffect(() => {
    if (authLoading) { setPhase('loading'); return; }

    if (!session) {
      setPhase(!hasSeenSpiritBird ? 'spirit-bird' : 'auth');
      return;
    }

    // Authenticated — wait for profile fetch to land
    if (!profile) { setPhase('loading'); return; }

    if (!profile.username) { setPhase('profile-setup'); return; }

    if (!hasOnboarded && allBirds.length > 0) { setPhase('onboarding'); return; }

    setPhase('app');
  }, [authLoading, session, profile, hasSeenSpiritBird, hasOnboarded, allBirds.length]);

  // ── Handlers ─────────────────────────────────────────────────

  const handleSpiritBirdComplete = (code: string, photoUrl: string | null) => {
    setSpiritBird(code, photoUrl);
    setHasSeenSpiritBird(true);
    // Phase effect will now route to 'auth'
  };

  const handleSignIn = () => {
    // Auth state listener fires → session set → phase effect re-runs
  };

  const handleSignUp = () => {
    // Auth state listener fires → session + profile-fetch → phase goes to 'profile-setup'
  };

  const handleProfileComplete = () => {
    // Profile now has username — phase effect re-runs and routes to onboarding/app
  };

  // ── Loading splash ────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'var(--parchment, #F5F0E6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
             style={{ color: 'var(--ink-muted, #8a7155)', opacity: 0.5 }}>
          <path d="M20.5 3C20.5 3 14 4 10 8C6 12 5 19 5 19L8 16C9 17 10.5 18 12 18C16 18 20.5 10 20.5 3Z"
                stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M5 19C5 19 8 13 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }

  // ── Pre-auth overlays (no nav/app visible) ─────────────────────
  if (phase === 'spirit-bird') {
    return <SpiritBirdPage onComplete={handleSpiritBirdComplete} />;
  }

  if (phase === 'auth') {
    return <AuthPage onSignIn={handleSignIn} onSignUp={handleSignUp} />;
  }

  if (phase === 'profile-setup' && session) {
    return <ProfileSetupPage userId={session.user.id} onComplete={handleProfileComplete} />;
  }

  // ── Main app ───────────────────────────────────────────────────
  return (
    <NotebookLayout>
      <Navbar />
      <AnimatedRoutes />
      <BottomNav />

      {/* Onboarding — once, after profile is set up */}
      <AnimatePresence>
        {phase === 'onboarding' && (
          <OnboardingWelcome
            birds={allBirds}
            onDone={() => setHasOnboarded(true)}
            onLogSighting={(bird) => {
              setHasOnboarded(true);
              setOnboardingLogBird(bird);
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal triggered from onboarding bird tap */}
      <AnimatePresence>
        {onboardingLogBird && (
          <NewSightingModal
            preselectedBird={onboardingLogBird}
            onClose={() => setOnboardingLogBird(null)}
          />
        )}
      </AnimatePresence>
    </NotebookLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Invite page is public — accessible without auth or app shell */}
          <Route path="/invite/:username" element={<InvitePage />} />
          {/* Everything else goes through the phase machine */}
          <Route path="/*" element={<AppShell />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
