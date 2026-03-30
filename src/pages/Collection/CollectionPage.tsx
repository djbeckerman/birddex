import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useBirdCollection } from '../../hooks/useBirdCollection';
import { useFilteredBirds } from '../../hooks/useFilteredBirds';
import { useBirdStore } from '../../store/useBirdStore';
import { BirdCard } from '../../components/BirdCard/BirdCard';
import { NewSightingModal } from '../../components/NewSightingModal/NewSightingModal';
import { SPIRIT_BIRDS } from '../../data/spiritBirds';
import type { SortBy } from '../../store/useBirdStore';
import './CollectionPage.css';

const PAGE_SIZE = 60;

export function CollectionPage() {
  const { birds, isLoading, isError, totalSpotted } = useBirdCollection();
  const { searchQuery, sortBy, setSearchQuery, setSortBy, spottedBirds, spiritBirdCode, spiritBirdPhotoUrl } = useBirdStore();
  const [page, setPage] = useState(1);
  const [showLogModal, setShowLogModal] = useState(false);

  // My Birds = only spotted birds
  const spottedBirdsList = birds.filter((b) => b.isSpotted);
  const filtered = useFilteredBirds(spottedBirdsList, sortBy);
  const visibleBirds = filtered.slice(0, page * PAGE_SIZE);

  const spottedThisWeek = Object.values(spottedBirds).filter((entry) => {
    const date = new Date(entry.spottedAt);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return date >= weekAgo;
  }).length;

  if (isError) {
    return (
      <div className="collection-error">
        <p>Failed to load bird data.</p>
        <p className="collection-error-hint">
          Make sure your <code>VITE_EBIRD_API_KEY</code> is set in <code>.env</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="collection-root">
      {/* ── Header ────────────────────────────────── */}
      <div className="collection-header">
        <div className="collection-header-top">
          <div>
            <h1 className="collection-title">My Field Journal</h1>
            <div className="collection-stats">
              <div className="collection-stat">
                <span className="collection-stat-number collection-stat-number--green">
                  {totalSpotted}
                </span>
                <span className="collection-stat-label">species spotted</span>
              </div>
              {spottedThisWeek > 0 && (
                <>
                  <div className="collection-stat-divider" />
                  <div className="collection-stat">
                    <span className="collection-stat-number">{spottedThisWeek}</span>
                    <span className="collection-stat-label">this week</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <button className="collection-log-btn" onClick={() => setShowLogModal(true)}>
            <PlusIcon />
            New Sighting
          </button>
        </div>

        {/* Search + Sort — only show if there are spotted birds */}
        {totalSpotted > 0 && (
          <div className="collection-toolbar">
            <div className="collection-search-wrap">
              <SearchIcon />
              <input
                className="collection-search"
                type="text"
                placeholder="Search your spotted birds…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
              {searchQuery && (
                <button className="collection-search-clear" onClick={() => setSearchQuery('')}>×</button>
              )}
            </div>
            <select
              className="collection-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
            >
              <option value="spottedAt">Recently spotted</option>
              <option value="comName">A–Z</option>
            </select>
          </div>
        )}
      </div>

      {/* ── Spirit Bird pinned card ───────────────── */}
      {spiritBirdCode && <SpiritBirdPinnedCard
        spiritBirdCode={spiritBirdCode}
        spiritBirdPhotoUrl={spiritBirdPhotoUrl}
        spottedAt={spottedBirds[spiritBirdCode]?.spottedAt}
      />}

      {/* ── Grid ──────────────────────────────────── */}
      {isLoading ? (
        <div className="collection-skeleton-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="collection-skeleton-card" />
          ))}
        </div>
      ) : totalSpotted === 0 ? (
        <div className="collection-empty collection-empty--journal">
          <div className="collection-empty-icon"><FeatherIcon /></div>
          <p className="collection-empty-headline">Your field journal is empty</p>
          <p className="collection-empty-sub">Log your first sighting to start your collection.</p>
          <NavLink to="/discover" className="collection-discover-link">
            Head to Discover →
          </NavLink>
        </div>
      ) : filtered.length === 0 ? (
        <div className="collection-empty">
          <p>No birds match your search.</p>
          <small>Try a different search term.</small>
        </div>
      ) : (
        <>
          <motion.div className="collection-grid" layout>
            <AnimatePresence mode="popLayout">
              {visibleBirds.map((bird, i) => (
                <BirdCard key={bird.speciesCode} bird={bird} index={i} variant="collection" />
              ))}
            </AnimatePresence>
          </motion.div>

          {visibleBirds.length < filtered.length && (
            <div className="collection-load-more">
              <button className="collection-load-more-btn" onClick={() => setPage((p) => p + 1)}>
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
    </div>
  );
}

// ── Spirit Bird pinned card ────────────────────────────────────────────────

interface SpiritCardProps {
  spiritBirdCode: string;
  spiritBirdPhotoUrl: string | null;
  spottedAt?: string;
}

function SpiritBirdPinnedCard({ spiritBirdCode, spiritBirdPhotoUrl, spottedAt }: SpiritCardProps) {
  const bird = SPIRIT_BIRDS.find((b) => b.speciesCode === spiritBirdCode);
  if (!bird) return null;

  const spottedDate = spottedAt
    ? new Date(spottedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  // Strip the "Your Spirit Bird is the [Name]." opener — already shown as the card heading
  const personalityTeaser = getPersonalityTeaser(bird.personality);

  return (
    <div className="collection-spirit-wrap">
      <div className="collection-spirit-card">
        {spiritBirdPhotoUrl ? (
          <img
            className="collection-spirit-photo"
            src={spiritBirdPhotoUrl}
            alt={bird.comName}
          />
        ) : (
          <div className="collection-spirit-photo-placeholder">
            <FeatherIcon />
          </div>
        )}
        <div className="collection-spirit-info">
          <div className="collection-spirit-badge">✦ Spirit Bird</div>
          <p className="collection-spirit-name">{bird.comName}</p>
          <p className="collection-spirit-sci">{bird.sciName}</p>
          {spottedDate ? (
            <p className="collection-spirit-spotted">Spotted · {spottedDate}</p>
          ) : (
            <p className="collection-spirit-not-spotted">Not yet spotted in the wild</p>
          )}
          {personalityTeaser && (
            <p className="collection-spirit-personality">{personalityTeaser}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Returns a 1-sentence teaser: the first sentence after the "Your Spirit Bird is…" opener. */
function getPersonalityTeaser(personality: string): string {
  // Remove "Your Spirit Bird is the [Name]. " prefix
  const withoutOpener = personality.replace(/^Your Spirit Bird is (?:the )?[^.]+\.\s*/i, '');
  // Take the first sentence
  const firstSentence = withoutOpener.match(/^[^.!?]+[.!?]/)?.[0] ?? '';
  return firstSentence.trim();
}

function SearchIcon() {
  return <svg className="collection-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}
function FeatherIcon() {
  return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.5 3C20.5 3 14 4 10 8C6 12 5 19 5 19L8 16C9 17 10.5 18 12 18C16 18 20.5 10 20.5 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M5 19C5 19 8 13 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
