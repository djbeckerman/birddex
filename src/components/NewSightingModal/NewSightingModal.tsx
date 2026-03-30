import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useBirdStore } from '../../store/useBirdStore';
import { CustomCalendar } from '../CustomCalendar/CustomCalendar';
import { getPositionOnce, formatCoordsLabel } from '../../utils/gps';
import type { Bird } from '../../types/bird';
import './NewSightingModal.css';

interface NewSightingModalProps {
  onClose: () => void;
  preselectedBird?: Bird | null;
}

type Panel = 'choose' | 'log' | 'identify';

const TODAY = new Date().toISOString().split('T')[0];

async function compressPhoto(file: File, maxSize = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function NewSightingModal({ onClose, preselectedBird }: NewSightingModalProps) {
  const [panel, setPanel] = useState<Panel>(preselectedBird ? 'log' : 'choose');

  return (
    <div className="nsm-overlay" onClick={onClose}>
      <motion.div
        className="nsm-paper"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence mode="wait">
          {panel === 'choose' && (
            <ChoosePanel key="choose" onClose={onClose} onChoose={(p) => setPanel(p)} />
          )}
          {panel === 'log' && (
            <LogPanel
              key="log"
              onClose={onClose}
              onBack={preselectedBird ? undefined : () => setPanel('choose')}
              preselectedBird={preselectedBird}
            />
          )}
          {panel === 'identify' && (
            <IdentifyPanel key="identify" onClose={onClose} onBack={() => setPanel('choose')} />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ── Panel: Choose path ────────────────────────────────────── */
function ChoosePanel({ onClose, onChoose }: { onClose: () => void; onChoose: (p: Panel) => void }) {
  const navigate = useNavigate();

  const handleIdentify = () => {
    onClose();
    navigate('/identify');
  };

  return (
    <motion.div
      className="nsm-panel"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.18 }}
    >
      <div className="nsm-header">
        <h2 className="nsm-title">+ New Sighting</h2>
        <button className="nsm-close" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
      </div>

      <div className="nsm-body nsm-body--choose">
        <p className="nsm-choose-prompt">How would you like to log this sighting?</p>

        <button className="nsm-path-card" onClick={() => onChoose('log')}>
          <div className="nsm-path-icon nsm-path-icon--green"><PenIcon /></div>
          <div>
            <div className="nsm-path-label">I know what I saw</div>
            <div className="nsm-path-sub">Search by name and log it</div>
          </div>
          <ChevronRightIcon />
        </button>

        <button className="nsm-path-card" onClick={handleIdentify}>
          <div className="nsm-path-icon nsm-path-icon--amber"><CameraIcon /></div>
          <div>
            <div className="nsm-path-label">Help me identify it</div>
            <div className="nsm-path-sub">Photo or audio recognition</div>
          </div>
          <ChevronRightIcon />
        </button>
      </div>
    </motion.div>
  );
}

/* ── Panel: Log form ────────────────────────────────────────── */
function LogPanel({
  onClose,
  onBack,
  preselectedBird,
}: {
  onClose: () => void;
  onBack?: () => void;
  preselectedBird?: Bird | null;
}) {
  const allBirds = useBirdStore((s) => s.allBirds);
  const spotBird = useBirdStore((s) => s.spotBird);

  const [search, setSearch] = useState(preselectedBird?.comName ?? '');
  const [selected, setSelected] = useState<Bird | null>(preselectedBird ?? null);
  const [locationName, setLocationName] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(TODAY);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (search.length < 2) return [];
    const q = search.toLowerCase();
    return allBirds
      .filter((b) => b.comName.toLowerCase().includes(q) || b.sciName.toLowerCase().includes(q))
      .sort((a, b) => (b.likelihoodScore ?? 0) - (a.likelihoodScore ?? 0))
      .slice(0, 8);
  }, [search, allBirds]);

  const handleSelect = (bird: Bird) => {
    setSelected(bird);
    setSearch(bird.comName);
    setShowDropdown(false);
  };

  const handleGps = async () => {
    setGpsLoading(true);
    const pos = await getPositionOnce(5000);
    setGpsLoading(false);
    if (pos) {
      setLocationName(formatCoordsLabel(pos.coords.latitude, pos.coords.longitude));
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressPhoto(file);
      setPhotoData(compressed);
      setPhotoPreview(compressed);
    } catch { /* ignore */ }
  };

  const handleSubmit = () => {
    if (!selected) return;
    spotBird(selected.speciesCode, {
      spottedAt: new Date(date + 'T12:00:00').toISOString(),
      locationName: locationName.trim() || undefined,
      notes: notes.trim() || undefined,
      userPhotoUrl: photoData ?? undefined,
    });
    onClose();
  };

  return (
    <motion.div
      className="nsm-panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.18 }}
    >
      <div className="nsm-header">
        {onBack && (
          <button className="nsm-back" onClick={onBack} aria-label="Back">
            <BackIcon />
          </button>
        )}
        <h2 className="nsm-title">Log a Sighting</h2>
        <button className="nsm-close" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
      </div>

      <div className="nsm-body nsm-body--scroll">
        {/* Bird search */}
        <div className="nsm-field">
          <label className="nsm-label">Bird species</label>
          <div className="nsm-search-wrap">
            <input
              className="nsm-input"
              type="text"
              placeholder='Search (try "seagull" or "hawk")…'
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              autoFocus={!preselectedBird}
            />
            <AnimatePresence>
              {showDropdown && suggestions.length > 0 && (
                <motion.ul
                  className="nsm-dropdown"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14 }}
                >
                  {suggestions.map((bird) => (
                    <li key={bird.speciesCode} className="nsm-dropdown-item" onClick={() => handleSelect(bird)}>
                      <span className="nsm-dropdown-common">{bird.comName}</span>
                      <span className="nsm-dropdown-sci">{bird.sciName}</span>
                      {(bird.likelihoodScore ?? 0) > 60 && (
                        <span className="nsm-dropdown-badge">common nearby</span>
                      )}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Date */}
        <div className="nsm-field">
          <label className="nsm-label">Date spotted</label>
          <button type="button" className="nsm-date-trigger" onClick={() => setShowCalendar((v) => !v)}>
            <CalIcon />
            <span>{formatDisplayDate(date)}</span>
            <ChevronDownIcon open={showCalendar} />
          </button>
          <AnimatePresence>
            {showCalendar && (
              <motion.div
                className="nsm-calendar-wrap"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
              >
                <CustomCalendar value={date} onChange={(d) => { setDate(d); setShowCalendar(false); }} maxDate={TODAY} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Location */}
        <div className="nsm-field">
          <label className="nsm-label">Location <span className="nsm-optional">(optional)</span></label>
          <div className="nsm-location-wrap">
            <input
              className="nsm-input nsm-input--location"
              type="text"
              placeholder="e.g. Santa Monica Pier, Malibu Creek…"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
            <button
              type="button"
              className={`nsm-gps-btn ${gpsLoading ? 'nsm-gps-btn--loading' : ''}`}
              onClick={handleGps}
              title="Use my location"
              disabled={gpsLoading}
            >
              <GpsIcon />
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="nsm-field">
          <label className="nsm-label">Field notes <span className="nsm-optional">(optional)</span></label>
          <textarea
            className="nsm-textarea"
            placeholder="Behavior, plumage details, conditions…"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Photo */}
        <div className="nsm-field">
          <label className="nsm-label">Photo <span className="nsm-optional">(optional)</span></label>
          <input ref={fileInputRef} type="file" accept="image/*" className="nsm-file-input" onChange={handlePhotoChange} />
          {photoPreview ? (
            <div className="nsm-photo-preview">
              <img src={photoPreview} alt="Sighting photo" className="nsm-photo-thumb" />
              <button
                type="button"
                className="nsm-photo-remove"
                onClick={() => { setPhotoData(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              >
                Remove
              </button>
            </div>
          ) : (
            <button type="button" className="nsm-photo-upload-btn" onClick={() => fileInputRef.current?.click()}>
              <CameraIcon />
              Add a photo
            </button>
          )}
        </div>
      </div>

      <div className="nsm-footer">
        <button className="nsm-btn-cancel" onClick={onClose}>Cancel</button>
        <button className="nsm-btn-submit" onClick={handleSubmit} disabled={!selected}>
          Log Sighting
        </button>
      </div>
    </motion.div>
  );
}

/* ── Panel: Identify (coming soon) ─────────────────────────── */
function IdentifyPanel({ onClose, onBack }: { onClose: () => void; onBack: () => void }) {
  return (
    <motion.div
      className="nsm-panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.18 }}
    >
      <div className="nsm-header">
        <button className="nsm-back" onClick={onBack} aria-label="Back"><BackIcon /></button>
        <h2 className="nsm-title">Identify a Bird</h2>
        <button className="nsm-close" onClick={onClose} aria-label="Close"><CloseIcon /></button>
      </div>
      <div className="nsm-body nsm-identify-body">
        <div className="nsm-identify-icon"><SearchLargeIcon /></div>
        <p className="nsm-identify-headline">Photo & audio ID coming soon</p>
        <p className="nsm-identify-desc">
          Snap a photo or record a bird call and we'll identify the species for you.
        </p>
        <ul className="nsm-identify-features">
          <li>AI-powered photo recognition</li>
          <li>Bird call audio matching</li>
          <li>Ranked results with confidence scores</li>
          <li>One-tap logging of identified species</li>
        </ul>
      </div>
    </motion.div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */
function formatDisplayDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });
}

/* ── Icons ─────────────────────────────────────────────────────── */
function CloseIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}
function BackIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function PenIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M14.5 3.5L16.5 5.5L7 15l-3 .5.5-3L14.5 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>;
}
function CameraIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 7c0-1.1.9-2 2-2h1.5l1.2-2h6.6l1.2 2H16a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" stroke="currentColor" strokeWidth="1.4"/><circle cx="10" cy="11" r="2.8" stroke="currentColor" strokeWidth="1.4"/></svg>;
}
function ChevronRightIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function ChevronDownIcon({ open }: { open: boolean }) {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function CalIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6h12M4.5 1v3M9.5 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}
function GpsIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
}
function SearchLargeIcon() {
  return <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="22" cy="22" r="13" stroke="currentColor" strokeWidth="2.5"/><path d="M32 32l9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M18 22h8M22 18v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}
