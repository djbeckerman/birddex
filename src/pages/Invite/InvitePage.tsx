import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { SPIRIT_BIRDS } from '../../data/spiritBirds';
import * as friendsService from '../../services/friendsService';
import './InvitePage.css';

const APP_URL = 'https://birddex-one.vercel.app';

export function InvitePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const session = useAuthStore((s) => s.session);
  const myProfile = useAuthStore((s) => s.profile);
  const isOwnProfile = myProfile?.username === username;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => friendsService.getProfileByUsername(username!),
    enabled: !!username,
  });

  const { data: sightingCount = 0 } = useQuery({
    queryKey: ['sighting-count', profile?.id],
    queryFn: () => friendsService.getUserSightingCount(profile!.id),
    enabled: !!profile?.id,
  });

  const { data: friendshipStatus = 'none' } = useQuery({
    queryKey: ['friendship-status', session?.user.id, profile?.id],
    queryFn: () => friendsService.getFriendshipStatus(session!.user.id, profile!.id),
    enabled: !!session && !!profile?.id && !isOwnProfile,
  });

  const addFriend = useMutation({
    mutationFn: () => friendsService.sendFriendRequest(session!.user.id, username!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friendship-status', session?.user.id, profile?.id] });
    },
  });

  // Update OG meta for link previews
  useEffect(() => {
    if (!profile) return;
    const name = profile.display_name ?? profile.username ?? 'A birder';
    document.title = `${name} invited you to BirdDex`;
    const setMeta = (prop: string, val: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${prop}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
      el.content = val;
    };
    setMeta('og:title', `${name} invited you to BirdDex`);
    setMeta('og:description', `${name} has spotted ${sightingCount} bird species. Join BirdDex to track your own sightings!`);
    if (profile.spirit_bird_photo_url) setMeta('og:image', profile.spirit_bird_photo_url);
    setMeta('og:url', `${APP_URL}/invite/${username}`);
    return () => { document.title = 'BirdDex — My Field Journal'; };
  }, [profile, sightingCount, username]);

  const spiritBird = SPIRIT_BIRDS.find((b) => b.speciesCode === profile?.spirit_bird_code);
  const glowColor = spiritBird?.glowColor ?? '#c8a050';

  if (isLoading) {
    return (
      <div className="inv-root inv-loading">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4, color: 'var(--ink-muted, #8a7155)' }}>
          <path d="M20.5 3C20.5 3 14 4 10 8C6 12 5 19 5 19L8 16C9 17 10.5 18 12 18C16 18 20.5 10 20.5 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M5 19C5 19 8 13 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="inv-root inv-loading">
        <p className="inv-muted">Invite link not found.</p>
        <button className="inv-btn inv-btn--primary" onClick={() => navigate('/')}>Open BirdDex</button>
      </div>
    );
  }

  return (
    <div className="inv-root">
      <motion.div
        className="inv-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Brand */}
        <div className="inv-brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: 'var(--forest-green, #4a7c59)' }}>
            <path d="M20.5 3C20.5 3 14 4 10 8C6 12 5 19 5 19L8 16C9 17 10.5 18 12 18C16 18 20.5 10 20.5 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M5 19C5 19 8 13 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="inv-brand-name">BirdDex</span>
        </div>

        {/* Spirit bird avatar */}
        <div
          className="inv-avatar-wrap"
          style={{ '--inv-glow': glowColor } as React.CSSProperties}
        >
          {profile.spirit_bird_photo_url ? (
            <img className="inv-avatar" src={profile.spirit_bird_photo_url} alt={spiritBird?.comName ?? 'Spirit Bird'} />
          ) : (
            <div className="inv-avatar inv-avatar--empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20.5 3C20.5 3 14 4 10 8C6 12 5 19 5 19L8 16C9 17 10.5 18 12 18C16 18 20.5 10 20.5 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M5 19C5 19 8 13 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </div>

        {spiritBird && (
          <p className="inv-spirit-name">{spiritBird.comName}</p>
        )}

        {/* Headline */}
        <h1 className="inv-heading">
          {profile.display_name ?? `@${profile.username}`} invited you to BirdDex
        </h1>
        <p className="inv-sub">
          Join {profile.display_name ?? profile.username} and {sightingCount > 0 ? `track the ${sightingCount} birds they've spotted` : 'track birds in your area'} — plus discover what's flying near you.
        </p>

        {/* Actions */}
        {isOwnProfile ? (
          <p className="inv-own-note">This is your own invite link — share it with friends!</p>
        ) : !session ? (
          <button className="inv-btn inv-btn--primary" onClick={() => navigate('/')}>
            Join BirdDex →
          </button>
        ) : friendshipStatus === 'none' ? (
          <button
            className="inv-btn inv-btn--primary"
            onClick={() => addFriend.mutate()}
            disabled={addFriend.isPending}
          >
            {addFriend.isPending ? 'Sending…' : `Follow ${profile.display_name ?? profile.username} →`}
          </button>
        ) : friendshipStatus === 'pending_sent' ? (
          <div className="inv-status">Friend request sent ✓</div>
        ) : friendshipStatus === 'accepted' ? (
          <div className="inv-status inv-status--friends">You're already friends ✓</div>
        ) : (
          <button className="inv-btn inv-btn--primary" onClick={() => navigate('/friends')}>
            Accept friend request
          </button>
        )}

        {session && (
          <button className="inv-btn inv-btn--secondary" onClick={() => navigate(`/profile/${profile.username}`)}>
            View their collection
          </button>
        )}

        <p className="inv-footer">
          BirdDex — bird watching, reimagined
        </p>
      </motion.div>
    </div>
  );
}
