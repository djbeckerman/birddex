import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { SPIRIT_BIRDS } from '../../data/spiritBirds';
import { track } from '../../lib/posthog';
import {
  getFriends,
  getPendingRequests,
  getFriendActivity,
  sendFriendRequest,
  respondToRequest,
} from '../../services/friendsService';
import type { ActivityItem, FriendProfile, FriendRequest } from '../../services/friendsService';
import './FriendsPage.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getGlowColor(spiritBirdCode: string | null): string {
  if (!spiritBirdCode) return 'var(--tan)';
  const bird = SPIRIT_BIRDS.find((b) => b.speciesCode === spiritBirdCode);
  return bird?.glowColor ?? 'var(--tan)';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SpiritAvatar({
  photoUrl,
  name,
  glowColor,
}: {
  photoUrl: string | null;
  name: string;
  glowColor?: string;
}) {
  const color = glowColor ?? 'var(--tan)';
  return (
    <div
      className="fp-spirit-avatar"
      style={{ borderColor: color, boxShadow: `0 0 0 2px ${color}22` }}
      aria-label={name}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={name} />
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3C9.5 3 7.5 5 7.5 7.5C7.5 9.5 8.7 11.2 10.5 11.8V14H9V16H10.5V21H13.5V16H15V14H13.5V11.8C15.3 11.2 16.5 9.5 16.5 7.5C16.5 5 14.5 3 12 3Z"
            fill="currentColor"
          />
        </svg>
      )}
    </div>
  );
}

function RequestCard({
  request,
  onAccept,
  onDecline,
}: {
  request: FriendRequest;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const glow = getGlowColor(request.requester.spirit_bird_code);
  return (
    <div className="fp-request-card">
      <SpiritAvatar
        photoUrl={request.requester.spirit_bird_photo_url}
        name={request.requester.display_name ?? request.requester.username ?? '?'}
        glowColor={glow}
      />
      <div className="fp-friend-meta">
        <span className="fp-friend-name">
          {request.requester.display_name ?? request.requester.username ?? 'Unknown'}
        </span>
        {request.requester.username && (
          <span className="fp-friend-handle">@{request.requester.username}</span>
        )}
      </div>
      <div className="fp-request-actions">
        <button className="fp-accept-btn" onClick={onAccept}>
          Accept
        </button>
        <button className="fp-decline-btn" onClick={onDecline}>
          Decline
        </button>
      </div>
    </div>
  );
}

function FriendRow({ friend, onClick }: { friend: FriendProfile; onClick: () => void }) {
  const glow = getGlowColor(friend.spirit_bird_code);
  return (
    <div className="fp-friend-row" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <SpiritAvatar
        photoUrl={friend.spirit_bird_photo_url}
        name={friend.display_name ?? friend.username ?? '?'}
        glowColor={glow}
      />
      <div className="fp-friend-meta">
        <span className="fp-friend-name">
          {friend.display_name ?? friend.username ?? 'Unknown'}
        </span>
        {friend.username && (
          <span className="fp-friend-handle">@{friend.username}</span>
        )}
        <span className="fp-friend-count">{friend.sightingCount} species</span>
        {friend.latestSighting && (
          <span className="fp-friend-latest">
            Last: {friend.latestSighting.common_name ?? friend.latestSighting.species_code}
          </span>
        )}
      </div>
      <svg className="fp-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const glow = getGlowColor(item.profile.spirit_bird_code);
  const name = item.profile.display_name ?? item.profile.username ?? 'Someone';
  const species = item.sighting.common_name ?? item.sighting.species_code;
  return (
    <div className="fp-activity-item">
      <SpiritAvatar
        photoUrl={item.profile.spirit_bird_photo_url}
        name={name}
        glowColor={glow}
      />
      <div className="fp-activity-body">
        <span className="fp-activity-text">
          <strong>{name}</strong> spotted a <em>{species}</em>
          {item.sighting.location_name ? ` in ${item.sighting.location_name}` : ''}
        </span>
        <span className="fp-activity-time">{timeAgo(item.sighting.spotted_date)}</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function FriendsPage() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();

  const [addUsername, setAddUsername] = useState('');
  const [addResult, setAddResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteUrl = profile?.username
    ? `https://birddex-one.vercel.app/invite/${profile.username}`
    : null;

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: friends = [], isLoading: friendsLoading } = useQuery<FriendProfile[]>({
    queryKey: ['friends', session?.user.id],
    queryFn: () => getFriends(session!.user.id),
    enabled: !!session,
  });

  const { data: pendingRequests = [] } = useQuery<FriendRequest[]>({
    queryKey: ['pending-requests', session?.user.id],
    queryFn: () => getPendingRequests(session!.user.id),
    enabled: !!session,
  });

  const { data: activity = [] } = useQuery<ActivityItem[]>({
    queryKey: ['friend-activity', session?.user.id],
    queryFn: () => getFriendActivity(session!.user.id),
    enabled: !!session,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const sendRequestMutation = useMutation({
    mutationFn: ({ requesterId, username }: { requesterId: string; username: string }) =>
      sendFriendRequest(requesterId, username),
    onSuccess: (result) => {
      if (result.error) {
        setAddResult({ type: 'error', msg: result.error });
      } else {
        track('friend_request_sent');
        setAddResult({ type: 'success', msg: 'Friend request sent!' });
        setAddUsername('');
        queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      }
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'accepted' | 'declined' }) =>
      respondToRequest(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests', session?.user.id] });
      queryClient.invalidateQueries({ queryKey: ['friends', session?.user.id] });
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleCopy() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleShare() {
    if (!inviteUrl) return;
    track('friend_invited');
    if (navigator.share) {
      navigator.share({ title: 'Join me on BirdDex', url: inviteUrl }).catch(() => handleCopy());
    } else {
      handleCopy();
    }
  }

  function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !addUsername.trim()) return;
    const username = addUsername.trim().replace(/^@/, '');
    setAddResult(null);
    sendRequestMutation.mutate({ requesterId: session.user.id, username });
  }

  // ── Unauthenticated state ──────────────────────────────────────────────────

  if (!session) {
    return (
      <div className="fp-root">
        <div className="fp-section fp-empty-auth">
          <p className="fp-empty">Sign in to see your friends and activity.</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fp-root">

      {/* ── Invite link ──────────────────────────────────────────── */}
      {inviteUrl && (
        <div className="fp-section">
          <h2 className="fp-section-title">Your Invite Link</h2>
          <div className="fp-invite-row">
            <span className="fp-invite-url">{inviteUrl}</span>
            <button className="fp-invite-btn" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button className="fp-invite-btn" onClick={handleShare}>
              Share
            </button>
          </div>
        </div>
      )}

      {/* ── Add friend ───────────────────────────────────────────── */}
      <div className="fp-section">
        <h2 className="fp-section-title">Add Friend</h2>
        <form className="fp-add-row" onSubmit={handleSendRequest}>
          <input
            className="fp-add-input"
            type="text"
            placeholder="@username"
            value={addUsername}
            onChange={(e) => {
              setAddUsername(e.target.value);
              setAddResult(null);
            }}
            autoComplete="off"
            autoCapitalize="none"
          />
          <button
            className="fp-add-btn"
            type="submit"
            disabled={!addUsername.trim() || sendRequestMutation.isPending}
          >
            {sendRequestMutation.isPending ? 'Sending…' : 'Send Request'}
          </button>
        </form>
        {addResult && (
          <p className={`fp-add-result fp-add-result--${addResult.type}`}>{addResult.msg}</p>
        )}
      </div>

      {/* ── Pending requests ─────────────────────────────────────── */}
      {pendingRequests.length > 0 && (
        <div className="fp-section">
          <h2 className="fp-section-title">Friend Requests</h2>
          {pendingRequests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              onAccept={() => respondMutation.mutate({ id: req.id, status: 'accepted' })}
              onDecline={() => respondMutation.mutate({ id: req.id, status: 'declined' })}
            />
          ))}
        </div>
      )}

      {/* ── Friends list ─────────────────────────────────────────── */}
      <div className="fp-section">
        <h2 className="fp-section-title">Friends</h2>
        {friendsLoading ? (
          <p className="fp-loading">Loading…</p>
        ) : friends.length === 0 ? (
          <p className="fp-empty">
            No friends yet. Share your invite link to get started!
          </p>
        ) : (
          friends.map((friend) => (
            <FriendRow
              key={friend.id}
              friend={friend}
              onClick={() => friend.username && navigate(`/profile/${friend.username}`)}
            />
          ))
        )}
      </div>

      {/* ── Activity feed ────────────────────────────────────────── */}
      {activity.length > 0 && (
        <div className="fp-section">
          <h2 className="fp-section-title">Recent Activity</h2>
          <div className="fp-activity-list">
            {activity.map((item) => (
              <ActivityRow key={item.sighting.id} item={item} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
