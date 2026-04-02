import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useBirdStore } from '../../store/useBirdStore';
import { useAuthStore } from '../../store/useAuthStore';
import { track } from '../../lib/posthog';
import './ProfileSetupPage.css';

interface ProfileSetupPageProps {
  userId: string;
  onComplete(): void;
}

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function ProfileSetupPage({ userId, onComplete }: ProfileSetupPageProps) {
  const spiritBirdCode     = useBirdStore((s) => s.spiritBirdCode);
  const spiritBirdPhotoUrl = useBirdStore((s) => s.spiritBirdPhotoUrl);
  const fetchProfile       = useAuthStore((s) => s.fetchProfile);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername]       = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const validateUsername = (val: string) => {
    if (!USERNAME_RE.test(val)) {
      setUsernameError('3–20 chars, lowercase letters, numbers and underscores only.');
    } else {
      setUsernameError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !username.trim() || usernameError) return;
    setError(null);
    setLoading(true);

    const { error: err } = await supabase.from('profiles').upsert({
      id:                    userId,
      display_name:          displayName.trim(),
      username:              username.trim().toLowerCase(),
      spirit_bird_code:      spiritBirdCode ?? null,
      spirit_bird_photo_url: spiritBirdPhotoUrl ?? null,
    });

    if (err) {
      // Unique username conflict
      const msg = err.code === '23505'
        ? 'That username is already taken — try another.'
        : err.message;
      setError(msg);
      setLoading(false);
      return;
    }

    // Refresh profile in the auth store
    await fetchProfile(userId);
    track('profile_setup_completed');
    setLoading(false);
    onComplete();
  };

  const content = (
    <div className="psu-root">
      <motion.div
        className="psu-paper"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="psu-brand">
          <FeatherMark />
          <span className="psu-brand-name">BirdDex</span>
        </div>

        <h1 className="psu-heading">Set up your field journal</h1>
        <p className="psu-sub">Choose a name for your profile — you can change this later.</p>

        {spiritBirdCode && (
          <div className="psu-spirit-row">
            {spiritBirdPhotoUrl
              ? <img className="psu-spirit-photo" src={spiritBirdPhotoUrl} alt="Spirit bird" />
              : <div className="psu-spirit-placeholder"><FeatherMark /></div>}
            <div>
              <div className="psu-spirit-label">✦ Your Spirit Bird awaits</div>
              <div className="psu-spirit-hint">It'll be saved to your profile automatically.</div>
            </div>
          </div>
        )}

        <form className="psu-form" onSubmit={handleSubmit} noValidate>
          <div className="psu-field">
            <label className="psu-label" htmlFor="psu-displayname">Display name</label>
            <input
              id="psu-displayname"
              className="psu-input"
              type="text"
              autoFocus
              required
              maxLength={40}
              placeholder="e.g. Alex Rivera"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="psu-field">
            <label className="psu-label" htmlFor="psu-username">Username</label>
            <div className="psu-username-wrap">
              <span className="psu-at">@</span>
              <input
                id="psu-username"
                className={`psu-input psu-input--username ${usernameError ? 'psu-input--error' : ''}`}
                type="text"
                required
                maxLength={20}
                placeholder="birder_alex"
                value={username}
                onChange={(e) => {
                  const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                  setUsername(v);
                  if (v.length > 0) validateUsername(v);
                  else setUsernameError(null);
                }}
              />
            </div>
            {usernameError && <p className="psu-field-error">{usernameError}</p>}
          </div>

          {error && <p className="psu-error">{error}</p>}

          <button
            className="psu-btn"
            type="submit"
            disabled={loading || !displayName.trim() || !username.trim() || !!usernameError}
          >
            {loading ? 'Saving…' : 'Begin birding →'}
          </button>
        </form>
      </motion.div>
    </div>
  );

  return createPortal(content, document.body);
}

function FeatherMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.5 3C20.5 3 14 4 10 8C6 12 5 19 5 19L8 16C9 17 10.5 18 12 18C16 18 20.5 10 20.5 3Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      />
      <path d="M5 19C5 19 8 13 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
