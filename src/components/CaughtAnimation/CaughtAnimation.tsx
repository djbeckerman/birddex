import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { getRarityTier } from '../../utils/rarity';
import type { BirdWithMeta } from '../../types/bird';
import './CaughtAnimation.css';

interface CaughtAnimationProps {
  bird: BirdWithMeta;
  totalSpotted: number;
  totalBirds: number;
  onDismiss: () => void;
}

const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  angle: (360 / 16) * i,
  delay: Math.random() * 0.15,
  size: 6 + Math.random() * 8,
  dist: 90 + Math.random() * 60,
}));

export function CaughtAnimation({ bird, totalSpotted, totalBirds, onDismiss }: CaughtAnimationProps) {
  const rarity = getRarityTier(bird.likelihoodScore);
  const isRare = rarity === 'rare';

  useEffect(() => {
    const timer = setTimeout(onDismiss, 2800);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return createPortal(
    <motion.div
      className={`caught-overlay ${isRare ? 'caught-overlay--rare' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onDismiss}
    >
      {/* Particles */}
      <div className="caught-particles" aria-hidden="true">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="caught-particle"
            style={{
              '--angle': `${p.angle}deg`,
              '--dist': `${p.dist}px`,
              '--delay': `${p.delay}s`,
              '--size': `${p.size}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <motion.div
        className="caught-card"
        initial={{ scale: 0.5, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 22, delay: 0.05 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo / icon */}
        <div className="caught-photo-wrap">
          {bird.photoUrl ? (
            <img src={bird.photoUrl} alt={bird.comName} className="caught-photo" />
          ) : (
            <div className="caught-photo-fallback">
              <FeatherSVG />
            </div>
          )}
          <div className="caught-burst" aria-hidden="true" />
        </div>

        {isRare && (
          <div className="caught-rare-label">
            <StarIcon /> Rare find!
          </div>
        )}

        <h2 className="caught-name">{bird.comName}</h2>
        <p className="caught-sub">Added to your field journal!</p>
        <p className="caught-count">
          <strong>{totalSpotted}</strong> of <strong>{totalBirds}</strong> species discovered
        </p>

        <p className="caught-dismiss-hint">Tap anywhere to continue</p>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      <path d="M7 1l1.5 3.5L12 5l-2.5 2.5.6 3.5L7 9.5 3.9 11l.6-3.5L2 5l3.5-.5z" />
    </svg>
  );
}

function FeatherSVG() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="40" height="40" aria-hidden="true">
      <path
        d="M20.5 3C20.5 3 14 4 10 8C6 12 5 19 5 19L8 16C9 17 10.5 18 12 18C16 18 20.5 10 20.5 3Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      />
      <path d="M5 19C5 19 8 13 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
