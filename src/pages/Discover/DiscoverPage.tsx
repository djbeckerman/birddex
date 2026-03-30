import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBirdCollection } from '../../hooks/useBirdCollection';
import { useFilteredBirds } from '../../hooks/useFilteredBirds';
import { useBirdStore } from '../../store/useBirdStore';
import { BirdCard } from '../../components/BirdCard/BirdCard';
import { CaughtAnimation } from '../../components/CaughtAnimation/CaughtAnimation';
import { NewSightingModal } from '../../components/NewSightingModal/NewSightingModal';
import { getPositionOnce, formatCoordsLabel } from '../../utils/gps';
import type { BirdWithMeta } from '../../types/bird';
import type { SortBy } from '../../store/useBirdStore';
import './DiscoverPage.css';

const PAGE_SIZE = 60;

const DISCOVER_SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'likelihood', label: 'Most likely nearby' },
  { value: 'comName',    label: 'A–Z' },
  { value: 'rarest',     label: 'Rarest first' },
];

export function DiscoverPage() {
  const { birds, isLoading, isError, totalBirds, totalSpotted } = useBirdCollection();
  const { searchQuery, setSearchQuery, spotBird, updateSpottedEntry } = useBirdStore();
  const [sortBy, setSortBy] = useState<SortBy>('likelihood');
  const [page, setPage] = useState(1);
  const [showLogModal, setShowLogModal] = useState(false);
  const [caughtBird, setCaughtBird] = useState<BirdWithMeta | null>(null);
  const [caughtTotal, setCaughtTotal] = useState(0);

  // Discover = only UNspotted birds
  const unspottedBirds = birds.filter((b) => !b.isSpotted);
  const filtered = useFilteredBirds(unspottedBirds, sortBy);
  const visibleBirds = filtered.slice(0, page * PAGE_SIZE);
  const waitingCount = unspottedBirds.length;

  const handleQuickSpot = async (bird: BirdWithMeta) => {
    // Capture the correct post-spot count before store update to avoid off-by-one
    const newTotal = totalSpotted + (bird.isSpotted ? 0 : 1);
    setCaughtTotal(newTotal);
    // 1. Log immediately
    spotBird(bird.speciesCode, { spottedAt: new Date().toISOString() });
    // 2. Show celebration
    setCaughtBird(bird);
    // 3. Try to get GPS location (non-blocking)
    getPositionOnce(5000).then((pos) => {
      if (pos) {
        updateSpottedEntry(bird.speciesCode, {
          locationName: formatCoordsLabel(pos.coords.latitude, pos.coords.longitude),
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        });
      }
    });
  };

  if (isError) {
    return (
      <div className="discover-error">
        <p>Failed to load bird data.</p>
        <p className="discover-error-hint">
          Make sure your <code>VITE_EBIRD_API_KEY</code> is set in <code>.env</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="discover-root">
      {/* ── Header ────────────────────────────────── */}
      <div className="discover-header">
        <div className="discover-header-top">
          <div>
            <h1 className="discover-title">Discover</h1>
            {totalBirds > 0 && (
              <p className="discover-subtitle">
                <strong>{totalBirds}</strong> species in your area
                {waitingCount > 0 && (
                  <> · <span className="discover-subtitle-waiting">{waitingCount} waiting to be found</span></>
                )}
              </p>
            )}
          </div>

          <button className="discover-log-btn" onClick={() => setShowLogModal(true)}>
            <PlusIcon />
            New Sighting
          </button>
        </div>

        {/* Toolbar */}
        <div className="discover-toolbar">
          <div className="discover-search-wrap">
            <SearchIcon />
            <input
              className="discover-search"
              type="text"
              placeholder='Search birds (try "seagull" or "hawk")…'
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
            {searchQuery && (
              <button className="discover-search-clear" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>

          <select
            className="discover-sort"
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value as SortBy); setPage(1); }}
          >
            {DISCOVER_SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Grid ──────────────────────────────────── */}
      {isLoading ? (
        <div className="discover-skeleton-grid">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="discover-skeleton-card" />
          ))}
        </div>
      ) : waitingCount === 0 && totalSpotted > 0 ? (
        <div className="discover-empty discover-empty--all-found">
          <div className="discover-empty-icon"><TrophyIcon /></div>
          <p className="discover-empty-headline">You've spotted everything in your area!</p>
          <p className="discover-empty-sub">Extraordinary. Explore a new location to find more species.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="discover-empty">
          <p>No birds match your search.</p>
          <small>Try a different search term.</small>
        </div>
      ) : (
        <>
          <motion.div className="discover-grid" layout>
            <AnimatePresence mode="popLayout">
              {visibleBirds.map((bird, i) => (
                <BirdCard
                  key={bird.speciesCode}
                  bird={bird}
                  index={i}
                  variant="discover"
                  onQuickSpot={handleQuickSpot}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          {visibleBirds.length < filtered.length && (
            <div className="discover-load-more">
              <button className="discover-load-more-btn" onClick={() => setPage((p) => p + 1)}>
                Load more — {filtered.length - visibleBirds.length} remaining
              </button>
            </div>
          )}
        </>
      )}

      {/* ── New Sighting Modal ─────────────────────── */}
      <AnimatePresence>
        {showLogModal && <NewSightingModal onClose={() => setShowLogModal(false)} />}
      </AnimatePresence>

      {/* ── Caught animation ──────────────────────── */}
      <AnimatePresence>
        {caughtBird && (
          <CaughtAnimation
            bird={caughtBird}
            totalSpotted={caughtTotal}
            totalBirds={totalBirds}
            onDismiss={() => setCaughtBird(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchIcon() {
  return <svg className="discover-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}
function TrophyIcon() {
  return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M5 3H3v3c0 2.2 1.5 4 3.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M19 3h2v3c0 2.2-1.5 4-3.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M6 3h12v7a6 6 0 01-12 0V3z" stroke="currentColor" strokeWidth="1.5"/></svg>;
}
