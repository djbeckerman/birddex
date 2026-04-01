import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { useBirdStore } from '../../store/useBirdStore';
import { SPIRIT_BIRDS } from '../../data/spiritBirds';
import * as friendsService from '../../services/friendsService';
import type { SightingRow } from '../../types/database';
import './ProfilePage.css';

const APP_URL = 'https://birddex-one.vercel.app';

/** Deterministic hue from a species code string */
function speciesHue(code: string): number {
  let h = 0;
  for (const c of code) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return h % 360;
}

function CollectionTile({
  sighting,
  mySpeciesCodes,
  isFriend,
}: {
  sighting: SightingRow;
  mySpeciesCodes: Set<string>;
  isFriend: boolean;
}) {
  const hue = speciesHue(sighting.species_code);
  const iHaveToo = mySpeciesCodes.has(sighting.species_code);

  return (
    <div
      className="pp-tile"
      style={{ '--tile-hue': hue } as React.CSSProperties}
      title={sighting.common_name ?? sighting.species_code}
    >
      <span className="pp-tile-name">{sighting.common_name ?? sighting.species_code}</span>
      {isFriend && (
        <span className={`pp-tile-badge ${iHaveToo ? 'pp-tile-badge--shared' : 'pp-tile-badge--missing'}`}>
          {iHaveToo ? '✓' : '!'}
        </span>
      )}
    </div>
  );
}

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const session = useAuthStore((s) => s.session);
  const myProfile = useAuthStore((s) => s.profile);
  const spottedBirds = useBirdStore((s) => s.spottedBirds);

  const isOwnProfile = myProfile?.username === username;
  const inviteUrl = username ? `${APP_URL}/invite/${username}` : '';

  // ── Queries ────────────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => friendsService.getProfileByUsername(username!),
    enabled: !!username,
  });

  const { data: sightings = [], isLoading: sightingsLoading } = useQuery<SightingRow[]>({
    queryKey: ['user-sightings', profile?.id],
    queryFn: () => friendsService.getUserSightings(profile!.id),
    enabled: !!profile?.id && (profile.is_public || isOwnProfile),
  });

  const { data: friendshipStatus = 'none' } = useQuery({
    queryKey: ['friendship-status', session?.user.id, profile?.id],
    queryFn: () => friendsService.getFriendshipStatus(session!.user.id, profile!.id),
    enabled: !!session && !!profile?.id && !isOwnProfile,
  });

  // ── Mutations ──────────────────────────────────────────────────
  const addFriend = useMutation({
    mutationFn: () => friendsService.sendFriendRequest(session!.user.id, username!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friendship-status', session?.user.id, profile?.id] });
    },
  });

  // ── OG meta update ────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const name = profile.display_name ?? profile.username ?? 'BirdDex User';
    const count = sightings.length;
    document.title = `${name} — BirdDex`;
    const setMeta = (prop: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${prop}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', prop);
        document.head.appendChild(el);
      }
      el.content = content;
    };
    setMeta('og:title', `${name} on BirdDex`);
    setMeta('og:description', `${name} has spotted ${count} bird species. Check out their collection!`);
    if (profile.spirit_bird_photo_url) setMeta('og:image', profile.spirit_bird_photo_url);
    setMeta('og:url', `${APP_URL}/profile/${profile.username}`);
    return () => { document.title = 'BirdDex — My Field Journal'; };
  }, [profile, sightings.length]);

  // ── Derived data ──────────────────────────────────────────────
  const spiritBird = SPIRIT_BIRDS.find((b) => b.speciesCode === profile?.spirit_bird_code);
  const isFriend = friendshipStatus === 'accepted';
  const mySpeciesCodes = new Set(Object.keys(spottedBirds));

  const sharedCount = isFriend
    ? sightings.filter((s) => mySpeciesCodes.has(s.species_code)).length
    : 0;
  const theyHaveNotYou = isFriend
    ? sightings.filter((s) => !mySpeciesCodes.has(s.species_code)).length
    : 0;

  // ── Render states ──────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div className="pp-root pp-centered">
        <p className="pp-muted">Loading profile…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pp-root pp-centered">
        <p className="pp-muted">Profile not found.</p>
        <button className="pp-back-btn" onClick={() => navigate(-1)}>← Back</button>
      </div>
    );
  }

  if (!profile.is_public && !isOwnProfile && friendshipStatus !== 'accepted') {
    return (
      <div className="pp-root pp-centered">
        <p className="pp-muted">This profile is private.</p>
        {session && friendshipStatus === 'none' && (
          <button className="pp-action-btn pp-action-btn--add" onClick={() => addFriend.mutate()}>
            Send Friend Request
          </button>
        )}
        <button className="pp-back-btn" onClick={() => navigate(-1)}>← Back</button>
      </div>
    );
  }

  return (
    <div className="pp-root">
      {/* ── Spirit Bird hero ──────────────────────── */}
      <div
        className="pp-hero"
        style={{ '--hero-glow': spiritBird?.glowColor ?? '#c8a050' } as React.CSSProperties}
      >
        <div className="pp-hero-bg" />
        {profile.spirit_bird_photo_url ? (
          <img className="pp-hero-photo" src={profile.spirit_bird_photo_url} alt={spiritBird?.comName ?? 'Spirit Bird'} />
        ) : (
          <div className="pp-hero-photo pp-hero-photo--empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20.5 3C20.5 3 14 4 10 8C6 12 5 19 5 19L8 16C9 17 10.5 18 12 18C16 18 20.5 10 20.5 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M5 19C5 19 8 13 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        )}
        {spiritBird && <span className="pp-hero-label">{spiritBird.comName}</span>}
      </div>

      {/* ── Profile header ────────────────────────── */}
      <div className="pp-header">
        <h1 className="pp-display-name">{profile.display_name ?? profile.username}</h1>
        {profile.username && <p className="pp-username">@{profile.username}</p>}
        <div className="pp-stats-row">
          <span className="pp-stat-chip">{sightings.length} species spotted</span>
        </div>
      </div>

      {/* ── Action button ─────────────────────────── */}
      <div className="pp-actions">
        {isOwnProfile ? (
          <button
            className="pp-action-btn pp-action-btn--share"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: `${profile.display_name} on BirdDex`, url: inviteUrl });
              } else {
                navigator.clipboard.writeText(inviteUrl);
              }
            }}
          >
            Share my profile
          </button>
        ) : !session ? null : friendshipStatus === 'none' ? (
          <button
            className="pp-action-btn pp-action-btn--add"
            onClick={() => addFriend.mutate()}
            disabled={addFriend.isPending}
          >
            {addFriend.isPending ? 'Sending…' : '+ Add Friend'}
          </button>
        ) : friendshipStatus === 'pending_sent' ? (
          <span className="pp-action-btn pp-action-btn--pending">Request Sent</span>
        ) : friendshipStatus === 'pending_received' ? (
          <button
            className="pp-action-btn pp-action-btn--add"
            onClick={() => {
              // The pending request ID isn't available here — navigate to friends tab
              navigate('/friends');
            }}
          >
            Accept Request
          </button>
        ) : (
          <span className="pp-action-btn pp-action-btn--friends">✓ Friends</span>
        )}
      </div>

      {/* ── Comparison banner ─────────────────────── */}
      {isFriend && !isOwnProfile && sightings.length > 0 && (
        <div className="pp-comparison">
          You and <strong>{profile.display_name ?? profile.username}</strong> share{' '}
          <strong>{sharedCount}</strong> species.
          {theyHaveNotYou > 0 && (
            <> They have <strong>{theyHaveNotYou}</strong> you haven't found yet.</>
          )}
        </div>
      )}

      {/* ── Collection grid ───────────────────────── */}
      {sightingsLoading ? (
        <p className="pp-muted pp-grid-loading">Loading collection…</p>
      ) : sightings.length === 0 ? (
        <p className="pp-muted pp-grid-loading">No sightings yet.</p>
      ) : (
        <>
          <p className="pp-grid-header">Collection</p>
          <div className="pp-grid">
            {sightings.map((s) => (
              <CollectionTile
                key={s.id}
                sighting={s}
                mySpeciesCodes={mySpeciesCodes}
                isFriend={isFriend && !isOwnProfile}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
