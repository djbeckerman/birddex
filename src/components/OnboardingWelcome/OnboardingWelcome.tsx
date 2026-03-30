import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { fetchBirdPhoto } from '../../api/inaturalist';
import type { Bird } from '../../types/bird';
import './OnboardingWelcome.css';

interface OnboardingWelcomeProps {
  birds: Bird[];
  onDone: () => void;
  onLogSighting: (bird: Bird) => void;
}

interface BirdPreview {
  bird: Bird;
  photoUrl: string | null;
  loading: boolean;
}

export function OnboardingWelcome({ birds, onDone, onLogSighting }: OnboardingWelcomeProps) {
  const totalBirds = birds.length;
  // Top 6 most likely nearby
  const topBirds = birds.slice(0, 6);

  const [previews, setPreviews] = useState<BirdPreview[]>(
    topBirds.map((bird) => ({ bird, photoUrl: null, loading: true }))
  );

  useEffect(() => {
    topBirds.forEach((bird, idx) => {
      fetchBirdPhoto(bird.sciName).then((url) => {
        setPreviews((prev) => {
          const next = [...prev];
          next[idx] = { bird, photoUrl: url, loading: false };
          return next;
        });
      }).catch(() => {
        setPreviews((prev) => {
          const next = [...prev];
          next[idx] = { bird, photoUrl: null, loading: false };
          return next;
        });
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <motion.div
      className="onboarding-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="onboarding-sheet"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.1 }}
      >
        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-logo">
            <FeatherIcon />
          </div>
          <h1 className="onboarding-title">Welcome to BirdDex!</h1>
          <p className="onboarding-subtitle">
            You're in Santa Monica — there are{' '}
            <strong>{totalBirds}</strong> species in your area.
            <br />Let's find your first bird.
          </p>
        </div>

        {/* Bird grid */}
        <div className="onboarding-section">
          <p className="onboarding-prompt">Seen any of these? Tap to log your first sighting!</p>
          <div className="onboarding-grid">
            {previews.map(({ bird, photoUrl, loading }) => (
              <button
                key={bird.speciesCode}
                className="onboarding-bird-card"
                onClick={() => {
                  onDone();
                  onLogSighting(bird);
                }}
              >
                <div className="onboarding-bird-photo">
                  {loading ? (
                    <div className="onboarding-bird-shimmer" />
                  ) : photoUrl ? (
                    <img src={photoUrl} alt={bird.comName} draggable={false} />
                  ) : (
                    <div className="onboarding-bird-no-photo"><SmallFeatherIcon /></div>
                  )}
                </div>
                <span className="onboarding-bird-name">{bird.comName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="onboarding-footer">
          <button className="onboarding-start-btn" onClick={onDone}>
            Start Birding
            <ArrowIcon />
          </button>
          <p className="onboarding-footer-note">
            Swipe through 304 local species in Discover →
          </p>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function FeatherIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.5 3C20.5 3 14 4 10 8C6 12 5 19 5 19L8 16C9 17 10.5 18 12 18C16 18 20.5 10 20.5 3Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      />
      <path d="M5 19C5 19 8 13 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SmallFeatherIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.5 3C20.5 3 14 4 10 8C6 12 5 19 5 19L8 16C9 17 10.5 18 12 18C16 18 20.5 10 20.5 3Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      />
      <path d="M5 19C5 19 8 13 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
