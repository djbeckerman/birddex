import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { fetchBirdPhoto } from '../../api/inaturalist';
import { useBirdStore } from '../../store/useBirdStore';
import { getBirdContent } from '../../services/birdContent';
import { getRarityTier, RARITY_META } from '../../utils/rarity';
import type { BirdWithMeta, BirdContent, IUCNStatus } from '../../types/bird';
import './BirdCard.css';

interface BirdCardProps {
  bird: BirdWithMeta;
  index: number;
  /** 'discover' = show real photo always + quick-spot CTA; 'collection' = default, spotted-only photo */
  variant?: 'discover' | 'collection';
  /** Called by discover variant when the user taps "I spotted this!" */
  onQuickSpot?: (bird: BirdWithMeta) => void;
}

const IUCN_META: Record<IUCNStatus, { label: string; color: string }> = {
  LC: { label: 'Least Concern',        color: '#4A6A32' },
  NT: { label: 'Near Threatened',      color: '#9A7500' },
  VU: { label: 'Vulnerable',           color: '#C06010' },
  EN: { label: 'Endangered',           color: '#B02020' },
  CR: { label: 'Critically Endangered',color: '#660000' },
};

const SEASONALITY_LABELS = {
  'year-round':     'Year-round resident',
  'winter-visitor': 'Winter visitor',
  'summer-breeder': 'Summer breeder',
  'migrant':        'Migrant',
};

export function BirdCard({ bird, index, variant = 'collection', onQuickSpot }: BirdCardProps) {
  const { toggleSpotted, cachePhoto } = useBirdStore();
  const [isFlipped, setIsFlipped]     = useState(false);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(bird.photoUrl);
  const [imgLoaded, setImgLoaded]     = useState(false);
  const [content, setContent]         = useState<BirdContent | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const isDiscover = variant === 'discover';
  // In discover mode, always try to load the photo
  const shouldLoadPhoto = isDiscover || bird.isSpotted;

  useEffect(() => {
    if (!shouldLoadPhoto) return;
    if (bird.photoStatus !== 'idle') {
      setLocalPhotoUrl(bird.photoUrl);
      return;
    }
    const el = cardRef.current;
    if (!el) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observerRef.current?.disconnect();
          fetchBirdPhoto(bird.sciName).then((url) => {
            cachePhoto(bird.speciesCode, url);
            setLocalPhotoUrl(url);
          });
        }
      },
      { rootMargin: '300px' }
    );
    observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [bird.speciesCode, bird.sciName, bird.photoStatus, bird.photoUrl, cachePhoto, shouldLoadPhoto]);

  useEffect(() => {
    setLocalPhotoUrl(bird.photoUrl);
  }, [bird.photoUrl]);

  const handleFlip = useCallback(async () => {
    if (!isFlipped && !content) {
      const data = await getBirdContent(bird.speciesCode);
      setContent(data);
    }
    setIsFlipped((f) => !f);
  }, [isFlipped, content, bird.speciesCode]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSpotted(bird.speciesCode);
  };

  const handleQuickSpot = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickSpot?.(bird);
  };

  const rarity = getRarityTier(bird.likelihoodScore);
  const rarityInfo = RARITY_META[rarity];

  return (
    <motion.div
      ref={cardRef}
      className={`bird-card ${bird.isSpotted ? 'bird-card--spotted' : 'bird-card--unspotted'} ${isDiscover ? 'bird-card--discover' : ''}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.025, 0.45), duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      layout
      style={{ perspective: '1200px' }}
    >
      <motion.div
        className="bird-card-inner"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.52, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* ── FRONT ─────────────────────────────── */}
        <div className="bird-card-face bird-card-front" onClick={handleFlip}>
          <div className="bird-card-photo-wrap">
            {shouldLoadPhoto && localPhotoUrl ? (
              <img
                src={localPhotoUrl}
                alt={bird.comName}
                className={`bird-card-photo ${imgLoaded ? 'bird-card-photo--loaded' : ''}`}
                onLoad={() => setImgLoaded(true)}
                draggable={false}
              />
            ) : shouldLoadPhoto && !localPhotoUrl ? (
              <div className="bird-card-photo-placeholder"><BirdOutlineSVG /></div>
            ) : (
              /* collection mode, unspotted → silhouette */
              <div className="bird-card-silhouette-wrap">
                <BirdSilhouetteSVG />
                <div className="bird-card-silhouette-fog" />
              </div>
            )}

            {/* Spotted badge */}
            {bird.isSpotted && (
              <div className="bird-card-spotted-badge"><CheckIcon /> Spotted</div>
            )}

            {/* Rarity badge (discover mode only) */}
            {isDiscover && (
              <div
                className={`bird-card-rarity-badge bird-card-rarity-badge--${rarity}`}
                style={{ '--rarity-color': rarityInfo.color, '--rarity-bg': rarityInfo.bg } as React.CSSProperties}
              >
                {rarityInfo.label}
              </div>
            )}

          </div>

          <div className="bird-card-info">
            {bird.isSpotted ? (
              <>
                <h3 className="bird-card-common-name">{bird.comName}</h3>
                <p className="bird-card-sci-name">{bird.sciName}</p>
                {bird.spottedEntry?.locationName && (
                  <p className="bird-card-location"><PinIcon /> {bird.spottedEntry.locationName}</p>
                )}
                {bird.spottedEntry?.spottedAt && (
                  <p className="bird-card-date">{formatDate(bird.spottedEntry.spottedAt)}</p>
                )}
              </>
            ) : isDiscover ? (
              <>
                <h3 className="bird-card-common-name">{bird.comName}</h3>
                <p className="bird-card-sci-name">{bird.sciName}</p>
              </>
            ) : (
              <>
                <h3 className="bird-card-common-name bird-card-unknown">???</h3>
                <p className="bird-card-sci-name bird-card-unknown-sub">Undiscovered species</p>
              </>
            )}

            <div className="bird-card-actions">
              <button
                className="bird-card-flip-btn"
                onClick={(e) => { e.stopPropagation(); handleFlip(); }}
                aria-label="View details"
              >
                <FlipIcon /> Details
              </button>
              {isDiscover && !bird.isSpotted ? (
                <button
                  className="bird-card-quick-spot-btn"
                  onClick={handleQuickSpot}
                  aria-label="I spotted this!"
                >
                  <EyeIcon /> I spotted this!
                </button>
              ) : (
                <button
                  className={`bird-card-toggle ${bird.isSpotted ? 'bird-card-toggle--spotted' : ''}`}
                  onClick={handleToggle}
                  aria-label={bird.isSpotted ? 'Remove from spotted' : 'Mark as spotted'}
                >
                  {bird.isSpotted ? <><CheckIcon /> Spotted</> : <><EyeIcon /> Log</>}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── BACK ──────────────────────────────── */}
        <div className="bird-card-face bird-card-back" style={{ transform: 'rotateY(180deg)' }}>
          <div className="bird-card-back-scroll">
            {/* Header row with photo thumbnail */}
            <div className="bird-card-back-header">
              <div className="bird-card-back-header-text">
                <h3 className="bird-card-back-name">{bird.comName}</h3>
                <p className="bird-card-back-sci">{bird.sciName}</p>
              </div>
              {localPhotoUrl && (bird.isSpotted || isDiscover) && (
                <img src={localPhotoUrl} alt={bird.comName} className="bird-card-back-thumb" draggable={false} />
              )}
            </div>

            {content ? (
              <>
                {/* Tags row */}
                <div className="bird-card-tags">
                  {content.birdType.map((t) => (
                    <span key={t} className="bird-card-tag">{t}</span>
                  ))}
                  <span className="bird-card-tag bird-card-tag--season">
                    {SEASONALITY_LABELS[content.seasonality]}
                  </span>
                </div>

                {/* Flavor text */}
                <p className="bird-card-back-description">{content.description}</p>

                {/* Physical stats grid */}
                <div className="bird-card-stats-grid">
                  <div className="bird-card-stat-cell">
                    <span className="bird-card-stat-main">{content.sizeComparison}</span>
                    <span className="bird-card-stat-sub">{content.length}</span>
                  </div>
                  <div className="bird-card-stat-cell">
                    <span className="bird-card-stat-label">Wingspan</span>
                    <span className="bird-card-stat-sub">{content.wingspan}</span>
                  </div>
                  <div className="bird-card-stat-cell bird-card-stat-cell--wide">
                    <span className="bird-card-stat-label">Weight</span>
                    <span className="bird-card-stat-sub">{content.weight}</span>
                  </div>
                  <IUCNBadge status={content.conservationStatus} />
                </div>

                {/* Fun facts */}
                <div className="bird-card-section">
                  <h4 className="bird-card-section-title">Field Notes</h4>
                  <ul className="bird-card-facts">
                    {content.funFacts.map((fact, i) => <li key={i}>{fact}</li>)}
                  </ul>
                </div>

                {/* Habitat & Diet */}
                <div className="bird-card-two-col">
                  <div className="bird-card-section">
                    <h4 className="bird-card-section-title">Habitat</h4>
                    <p className="bird-card-section-text">{content.habitat}</p>
                  </div>
                  <div className="bird-card-section">
                    <h4 className="bird-card-section-title">Diet</h4>
                    <p className="bird-card-section-text">{content.diet}</p>
                  </div>
                </div>

                {/* Audio placeholder */}
                <div className="bird-card-audio">
                  <button className="bird-card-audio-btn" disabled title="Coming soon">
                    <PlayIcon />
                    <div className="bird-card-waveform">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className="bird-card-waveform-bar"
                          style={{ height: `${4 + Math.sin(i * 0.9) * 4 + Math.cos(i * 1.3) * 3}px` }}
                        />
                      ))}
                    </div>
                    <span>Hear call</span>
                    <span className="bird-card-soon">soon</span>
                  </button>
                </div>

                {/* Bottom action links */}
                <div className="bird-card-back-actions">
                  <button className="bird-card-action-link" disabled>More photos</button>
                  <button className="bird-card-action-link" disabled>Range map</button>
                  <button className="bird-card-action-link" disabled>Full guide</button>
                </div>

                {/* Sighting section — only if spotted */}
                {bird.isSpotted && bird.spottedEntry && (
                  <>
                    <div className="bird-card-sighting-divider"><span>Your Sighting</span></div>
                    <div className="bird-card-sighting">
                      {bird.spottedEntry.locationName && (
                        <p className="bird-card-sighting-row">
                          <PinIcon /> {bird.spottedEntry.locationName}
                        </p>
                      )}
                      <p className="bird-card-sighting-row">
                        <CalIcon /> {formatDateLong(bird.spottedEntry.spottedAt)}
                      </p>
                      {bird.spottedEntry.notes && (
                        <p className="bird-card-sighting-notes">"{bird.spottedEntry.notes}"</p>
                      )}
                      {bird.spottedEntry.userPhotoUrl && (
                        <img
                          src={bird.spottedEntry.userPhotoUrl}
                          alt="My sighting"
                          className="bird-card-sighting-photo"
                          draggable={false}
                        />
                      )}
                      <div className="bird-card-sighting-bottom">
                        <div className="bird-card-spotted-pill"><CheckIcon /> Spotted</div>
                        <ShareButton bird={bird} photoUrl={localPhotoUrl} />
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="bird-card-back-empty">
                {/* Show what eBird data gives us even without placeholder content */}
                {(bird.familyComName || bird.order) && (
                  <div className="bird-card-tags">
                    {bird.familyComName && (
                      <span className="bird-card-tag">{bird.familyComName}</span>
                    )}
                    {bird.order && (
                      <span className="bird-card-tag">{bird.order}</span>
                    )}
                  </div>
                )}
                {bird.isSpotted && bird.spottedEntry && (
                  <>
                    <div className="bird-card-sighting-divider"><span>Your Sighting</span></div>
                    <div className="bird-card-sighting">
                      {bird.spottedEntry.locationName && (
                        <p className="bird-card-sighting-row"><PinIcon /> {bird.spottedEntry.locationName}</p>
                      )}
                      <p className="bird-card-sighting-row"><CalIcon /> {formatDateLong(bird.spottedEntry.spottedAt)}</p>
                      {bird.spottedEntry.notes && (
                        <p className="bird-card-sighting-notes">"{bird.spottedEntry.notes}"</p>
                      )}
                      {bird.spottedEntry.userPhotoUrl && (
                        <img src={bird.spottedEntry.userPhotoUrl} alt="My sighting" className="bird-card-sighting-photo" draggable={false} />
                      )}
                    </div>
                  </>
                )}
                <div className="bird-card-section">
                  <h4 className="bird-card-section-title">Classification</h4>
                  <p className="bird-card-section-text">
                    {bird.familyComName && <><strong>{bird.familyComName}</strong><br /></>}
                    {bird.order && <span style={{ color: 'var(--ink-muted)' }}>Order: {bird.order}</span>}
                  </p>
                </div>
                {bird.observationCount != null && (
                  <div className="bird-card-section">
                    <h4 className="bird-card-section-title">Local Frequency</h4>
                    <p className="bird-card-section-text">
                      Observed {bird.observationCount} time{bird.observationCount !== 1 ? 's' : ''} in your area recently.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="bird-card-back-flip" onClick={handleFlip} aria-label="Flip back">
            <FlipIcon /> Flip back
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Share Button ────────────────────────────────────────── */
function ShareButton({ bird, photoUrl }: { bird: BirdWithMeta; photoUrl: string | null }) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sharing) return;
    setSharing(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d')!;

      // Background
      ctx.fillStyle = '#F5F0E6';
      ctx.fillRect(0, 0, 1080, 1080);

      // Photo
      if (photoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = () => rej();
            img.src = photoUrl;
          });
          ctx.drawImage(img, 0, 0, 1080, 680);
          // Gradient over photo
          const grad = ctx.createLinearGradient(0, 400, 0, 680);
          grad.addColorStop(0, 'rgba(245,240,230,0)');
          grad.addColorStop(1, 'rgba(245,240,230,1)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 400, 1080, 280);
        } catch { /* no photo fallback */ }
      }

      // Feather watermark (top-left)
      ctx.fillStyle = '#C8B891';
      ctx.font = '32px Georgia';
      ctx.fillText('BirdDex', 48, 60);

      // Bird name
      ctx.fillStyle = '#3C2F1E';
      ctx.font = 'bold 64px Georgia';
      ctx.fillText(bird.comName, 48, 760);

      // Sci name
      ctx.fillStyle = '#8B7355';
      ctx.font = 'italic 32px Georgia';
      ctx.fillText(bird.sciName, 48, 810);

      // Location + date
      const entry = bird.spottedEntry;
      if (entry) {
        ctx.fillStyle = '#5C4A3A';
        ctx.font = '28px Georgia';
        const locLine = [entry.locationName, formatDate(entry.spottedAt)].filter(Boolean).join(' · ');
        if (locLine) ctx.fillText(locLine, 48, 870);
      }

      // Bottom rule
      ctx.strokeStyle = '#C8B891';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(48, 920);
      ctx.lineTo(1032, 920);
      ctx.stroke();

      // Tagline
      ctx.fillStyle = '#8B7355';
      ctx.font = '24px Georgia';
      ctx.fillText('Spotted via BirdDex — My Field Journal', 48, 970);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `birddex-${bird.comName.toLowerCase().replace(/\s/g, '-')}.jpg`, { type: 'image/jpeg' });
        const title = `I just spotted a ${bird.comName}!`;
        const text = `${bird.comName} (${bird.sciName}) spotted via BirdDex`;

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title, text });
        } else if (navigator.share) {
          await navigator.share({ title, text });
        } else {
          // Fallback: download
          const a = document.createElement('a');
          a.href = canvas.toDataURL('image/jpeg', 0.9);
          a.download = file.name;
          a.click();
        }
      }, 'image/jpeg', 0.9);
    } catch { /* user cancelled or error */ }

    setSharing(false);
  };

  return (
    <button className="bird-card-share-btn" onClick={handleShare} disabled={sharing} title="Share sighting">
      <ShareIcon />
      {sharing ? 'Sharing…' : 'Share'}
    </button>
  );
}

/* ── IUCN Badge ───────────────────────────────────────────── */
function IUCNBadge({ status }: { status: IUCNStatus }) {
  const meta = IUCN_META[status];
  return (
    <div className="bird-card-stat-cell" title={meta.label}>
      <span className="bird-card-stat-label">Status</span>
      <span className="bird-card-iucn" style={{ '--iucn-color': meta.color } as React.CSSProperties}>
        <span className="bird-card-iucn-dot" />
        {status}
      </span>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────── */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}

/* ── SVG Icons ───────────────────────────────────────────── */
function CheckIcon() {
  return <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function EyeIcon() {
  return <svg width="12" height="12" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M1 6.5s2-4 5.5-4 5.5 4 5.5 4-2 4-5.5 4-5.5-4-5.5-4z" stroke="currentColor" strokeWidth="1.4"/><circle cx="6.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>;
}
function FlipIcon() {
  return <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 4h10M10 2l2 2-2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 10H2M4 8l-2 2 2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function PinIcon() {
  return <svg width="10" height="10" viewBox="0 0 11 11" fill="none" aria-hidden="true" style={{display:'inline',verticalAlign:'middle'}}><path d="M5.5 1C3.57 1 2 2.57 2 4.5c0 2.7 3.5 5.5 3.5 5.5S9 7.2 9 4.5C9 2.57 7.43 1 5.5 1z" stroke="currentColor" strokeWidth="1.3"/><circle cx="5.5" cy="4.5" r="1.2" stroke="currentColor" strokeWidth="1.1"/></svg>;
}
function CalIcon() {
  return <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{display:'inline',verticalAlign:'middle'}}><rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 5h10M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
}
function PlayIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 4l4 2-4 2V4z" fill="currentColor"/></svg>;
}
function ShareIcon() {
  return <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="11" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="11" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="3" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.3 6.25L9.7 3.75M4.3 7.75l5.4 2.5" stroke="currentColor" strokeWidth="1.2"/></svg>;
}
function BirdOutlineSVG() {
  return <svg viewBox="0 0 120 90" fill="none" className="bird-card-outline-svg" aria-hidden="true"><path d="M60 65C42 65 30 55 24 43C21 37 20 31 22 26C24 21 28 18 33 20C36 21 38 24 39 28C42 22 47 17 54 15C61 13 68 15 73 20C78 15 85 13 90 17C93 19 94 22 92 27C99 25 104 30 101 38C98 45 90 50 82 52L78 65Z" stroke="var(--tan)" strokeWidth="2" fill="none"/></svg>;
}
function BirdSilhouetteSVG() {
  return <svg viewBox="0 0 120 90" fill="none" className="bird-card-silhouette-svg" aria-hidden="true"><path d="M60 65C42 65 30 55 24 43C21 37 20 31 22 26C24 21 28 18 33 20C36 21 38 24 39 28C42 22 47 17 54 15C61 13 68 15 73 20C78 15 85 13 90 17C93 19 94 22 92 27C99 25 104 30 101 38C98 45 90 50 82 52L78 65Z" fill="rgba(139, 115, 85, 0.35)"/><ellipse cx="60" cy="70" rx="20" ry="4" fill="rgba(139, 115, 85, 0.12)"/></svg>;
}
