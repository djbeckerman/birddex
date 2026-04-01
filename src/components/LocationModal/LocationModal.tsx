import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useLocationStore } from '../../store/useLocationStore';
import './LocationModal.css';

interface LocationModalProps {
  onClose: () => void;
}

export function LocationModal({ onClose }: LocationModalProps) {
  const locationLabel   = useLocationStore((s) => s.locationLabel);
  const permissionState = useLocationStore((s) => s.permissionState);
  const isLocating      = useLocationStore((s) => s.isLocating);
  const requestLocation = useLocationStore((s) => s.requestLocation);

  const handleRefresh = async () => {
    await requestLocation();
    onClose();
  };

  const content = (
    <div className="lm-backdrop" onClick={onClose}>
      <motion.div
        className="lm-sheet"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lm-header">
          <span className="lm-title">Your Location</span>
          <button className="lm-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="lm-current">
          <PinIcon />
          <span className="lm-current-label">{locationLabel}</span>
        </div>

        {permissionState === 'denied' && (
          <p className="lm-denied-note">
            Location access was denied. Enable it in your browser settings to auto-detect your area.
          </p>
        )}

        <button
          className="lm-refresh-btn"
          onClick={handleRefresh}
          disabled={isLocating}
        >
          {isLocating ? (
            <>
              <SpinnerIcon />
              Detecting location…
            </>
          ) : (
            <>
              <RefreshIcon />
              Refresh my location
            </>
          )}
        </button>

        <p className="lm-hint">
          BirdDex uses your GPS to show birds spotted nearby and pull live eBird data for your area.
        </p>
      </motion.div>
    </div>
  );

  return createPortal(content, document.body);
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M1 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.51 15a9 9 0 1 0 .49-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="lm-spinner">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
