import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBirdStore } from '../../store/useBirdStore';
import { CustomCalendar } from '../CustomCalendar/CustomCalendar';
import type { Bird } from '../../types/bird';
import './LogSightingModal.css';

interface LogSightingModalProps {
  onClose: () => void;
}

const TODAY = new Date().toISOString().split('T')[0];

/** Compress an image file to a small base64 thumbnail */
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

export function LogSightingModal({ onClose }: LogSightingModalProps) {
  const allBirds = useBirdStore((s) => s.allBirds);
  const spotBird = useBirdStore((s) => s.spotBird);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Bird | null>(null);
  const [locationName, setLocationName] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(TODAY);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location-aware suggestions: filter + sort by likelihoodScore desc
  const suggestions = useMemo(() => {
    if (search.length < 2) return [];
    const q = search.toLowerCase();
    return allBirds
      .filter(
        (b) =>
          b.comName.toLowerCase().includes(q) ||
          b.sciName.toLowerCase().includes(q)
      )
      .sort((a, b) => (b.likelihoodScore ?? 0) - (a.likelihoodScore ?? 0))
      .slice(0, 8);
  }, [search, allBirds]);

  const handleSelect = (bird: Bird) => {
    setSelected(bird);
    setSearch(bird.comName);
    setShowDropdown(false);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressPhoto(file);
      setPhotoData(compressed);
      setPhotoPreview(compressed);
    } catch {
      // ignore — photo upload is optional
    }
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
    <div className="lsm-overlay" onClick={onClose}>
      <motion.div
        className="lsm-paper"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="lsm-header">
          <h2 className="lsm-title">Log a New Sighting</h2>
          <button className="lsm-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="lsm-body">
          {/* Bird search */}
          <div className="lsm-field">
            <label className="lsm-label">Bird species</label>
            <div className="lsm-search-wrap">
              <input
                className="lsm-input"
                type="text"
                placeholder='Search birds (try "seagull" or "hawk")…'
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelected(null);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                autoFocus
              />
              <AnimatePresence>
                {showDropdown && suggestions.length > 0 && (
                  <motion.ul
                    className="lsm-dropdown"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    {suggestions.map((bird) => (
                      <li
                        key={bird.speciesCode}
                        className="lsm-dropdown-item"
                        onClick={() => handleSelect(bird)}
                      >
                        <span className="lsm-dropdown-common">{bird.comName}</span>
                        <span className="lsm-dropdown-sci">{bird.sciName}</span>
                        {(bird.likelihoodScore ?? 0) > 60 && (
                          <span className="lsm-dropdown-badge">common nearby</span>
                        )}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Date — custom calendar */}
          <div className="lsm-field">
            <label className="lsm-label">Date spotted</label>
            <button
              type="button"
              className="lsm-date-trigger"
              onClick={() => setShowCalendar((v) => !v)}
            >
              <CalendarIcon />
              <span>{formatDisplayDate(date)}</span>
              <ChevronIcon open={showCalendar} />
            </button>
            <AnimatePresence>
              {showCalendar && (
                <motion.div
                  className="lsm-calendar-wrap"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <CustomCalendar
                    value={date}
                    onChange={(d) => {
                      setDate(d);
                      setShowCalendar(false);
                    }}
                    maxDate={TODAY}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Location */}
          <div className="lsm-field">
            <label className="lsm-label">Location <span className="lsm-optional">(optional)</span></label>
            <input
              className="lsm-input"
              type="text"
              placeholder="e.g. Santa Monica Pier, Malibu Creek…"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="lsm-field">
            <label className="lsm-label">Field notes <span className="lsm-optional">(optional)</span></label>
            <textarea
              className="lsm-textarea"
              placeholder="Behavior, plumage details, conditions…"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Photo upload */}
          <div className="lsm-field">
            <label className="lsm-label">Photo <span className="lsm-optional">(optional)</span></label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="lsm-file-input"
              onChange={handlePhotoChange}
            />
            {photoPreview ? (
              <div className="lsm-photo-preview">
                <img src={photoPreview} alt="Sighting photo" className="lsm-photo-thumb" />
                <button
                  type="button"
                  className="lsm-photo-remove"
                  onClick={() => { setPhotoData(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="lsm-photo-upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <CameraIcon />
                Add a photo
              </button>
            )}
          </div>
        </div>

        <div className="lsm-footer">
          <button className="lsm-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="lsm-btn-submit"
            onClick={handleSubmit}
            disabled={!selected}
          >
            Log Sighting
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function formatDisplayDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1 6h12M4.5 1v3M9.5 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
    >
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1 4.5C1 3.67 1.67 3 2.5 3h.8l.9-1.5h3.6L8.7 3h.8C10.33 3 11 3.67 11 4.5V10c0 .83-.67 1.5-1.5 1.5h-7C1.67 11.5 1 10.83 1 10V4.5z" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="6" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}
