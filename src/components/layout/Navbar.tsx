import { NavLink } from 'react-router-dom';
import { useBirdStore } from '../../store/useBirdStore';
import { useAuthStore } from '../../store/useAuthStore';
import { SPIRIT_BIRDS } from '../../data/spiritBirds';
import './Navbar.css';

const TABS = [
  { to: '/',         label: 'My Birds',  end: true  },
  { to: '/discover', label: 'Discover',  end: false },
  { to: '/identify', label: 'Identify',  end: false },
  { to: '/friends',  label: 'Friends',   end: false },
];

export function Navbar() {
  const spottedBirds       = useBirdStore((s) => s.spottedBirds);
  const totalBirds         = useBirdStore((s) => s.allBirds.length);
  const spiritBirdCode     = useBirdStore((s) => s.spiritBirdCode);
  const spiritBirdPhotoUrl = useBirdStore((s) => s.spiritBirdPhotoUrl);
  const spottedCount       = Object.keys(spottedBirds).length;

  const profile  = useAuthStore((s) => s.profile);
  const signOut  = useAuthStore((s) => s.signOut);

  const spiritBird = spiritBirdCode
    ? SPIRIT_BIRDS.find((b) => b.speciesCode === spiritBirdCode) ?? null
    : null;

  const thisWeekCount = Object.values(spottedBirds).filter((entry) => {
    const date = new Date(entry.spottedAt);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return date >= weekAgo;
  }).length;

  return (
    <header className="nb-header">
      <div className="nb-header-top">
        <div className="nb-brand">
          <svg className="nb-brand-feather" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20.5 3C20.5 3 14 4 10 8C6 12 5 19 5 19L8 16C9 17 10.5 18 12 18C16 18 20.5 10 20.5 3Z"
              stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
            />
            <path d="M5 19C5 19 8 13 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="nb-brand-name">BirdDex</span>

          {/* Spirit Bird avatar */}
          {spiritBird && (
            <div
              className="nb-spirit-avatar"
              title={`Spirit Bird: ${spiritBird.comName}`}
              style={{ '--sb-glow': spiritBird.glowColor } as React.CSSProperties}
            >
              {spiritBirdPhotoUrl ? (
                <img src={spiritBirdPhotoUrl} alt={spiritBird.comName} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20.5 3C20.5 3 14 4 10 8C6 12 5 19 5 19L8 16C9 17 10.5 18 12 18C16 18 20.5 10 20.5 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M5 19C5 19 8 13 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </div>
          )}

          {totalBirds > 0 && (
            <span className="nb-area-label">Santa Monica · LA Coast</span>
          )}
        </div>

        {/* User identity + sign-out */}
        <div className="nb-user-row">
          {profile && (
            <div className="nb-user">
              <span className="nb-user-name">{profile.display_name ?? profile.username}</span>
              <span className="nb-user-handle">@{profile.username}</span>
            </div>
          )}
          <button
            className="nb-signout"
            onClick={signOut}
            title="Sign out"
            aria-label="Sign out"
          >
            <SignOutIcon />
          </button>
        </div>

        <div className="nb-stats">
          {spottedCount > 0 && (
            <span className="nb-stat">
              <strong>{spottedCount}</strong> spotted
            </span>
          )}
          {thisWeekCount > 0 && (
            <span className="nb-stat nb-stat--week">
              <strong>{thisWeekCount}</strong> this week
            </span>
          )}
          {totalBirds > 0 && (
            <span className="nb-stat nb-stat--area">
              <strong>{totalBirds}</strong> in your area
            </span>
          )}
        </div>
      </div>

      <nav className="nb-tabs" role="navigation" aria-label="Main navigation">
        {TABS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nb-tab ${isActive ? 'nb-tab--active' : ''}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

function SignOutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
