import '../Identify/IdentifyPage.css';

/**
 * Friends Page
 *
 * Planned features:
 *   - User accounts (auth via Supabase or Clerk)
 *   - Add friends by username or share link
 *   - View friends' collections and recent sightings
 *   - Activity feed: "Sarah spotted a Bald Eagle in Marin County"
 *   - Shared lists and friendly species-count competitions
 *   - Comment on and react to each other's sightings
 *
 * Architecture notes:
 *   - Requires backend: user table, friendship graph, sightings table
 *   - spottedBirds will migrate from localStorage to a DB-backed store
 *   - Real-time updates via Supabase Realtime or Pusher
 *   - Privacy controls: public/friends-only/private sightings
 */
export function FriendsPage() {
  return (
    <div className="stub-page">
      <div className="stub-page-inner">
        <div className="stub-page-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="18" cy="16" r="6" stroke="currentColor" strokeWidth="2.5" />
            <path
              d="M6 38C6 32.477 11.373 28 18 28"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="32" cy="20" r="5" stroke="currentColor" strokeWidth="2.5" />
            <path
              d="M22 38C22 33.582 26.477 30 32 30C37.523 30 42 33.582 42 38"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1 className="stub-page-title">Friends & Community</h1>
        <p className="stub-page-desc">
          Share your sightings, follow fellow naturalists, and see what birds your friends have
          been discovering.
        </p>
        <div className="stub-page-badge">Coming Soon</div>
        <ul className="stub-page-features">
          <li>Follow friends and see their recent sightings</li>
          <li>Activity feed across your network</li>
          <li>Friendly species-count competitions</li>
          <li>Shared lists and collaborative field trips</li>
        </ul>
      </div>
    </div>
  );
}
