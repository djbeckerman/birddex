import '../Identify/IdentifyPage.css';

/**
 * Nearby Page
 *
 * Planned features:
 *   - Request browser geolocation
 *   - Query eBird's Nearby Observations API (/v2/data/obs/geo/recent)
 *     with lat/lng and a configurable radius
 *   - Show a list/map of recently reported species in the area
 *   - Tap a species to add to your unspotted watchlist
 *   - Filter by distance, recency, rarity
 *
 * Architecture notes:
 *   - Will use: api.ebird.org/v2/data/obs/geo/recent?lat=&lng=&maxResults=50
 *   - Requires the same VITE_EBIRD_API_KEY already in use
 *   - Location permission handled via navigator.geolocation
 *   - Map integration via Leaflet or Mapbox (TBD)
 */
export function NearbyPage() {
  return (
    <div className="stub-page">
      <div className="stub-page-inner">
        <div className="stub-page-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path
              d="M24 6C17.37 6 12 11.37 12 18C12 27 24 42 24 42C24 42 36 27 36 18C36 11.37 30.63 6 24 6Z"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <circle cx="24" cy="18" r="4" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
        <h1 className="stub-page-title">Birds Nearby</h1>
        <p className="stub-page-desc">
          Discover what species have been spotted near you recently, powered by eBird's real-time
          observation data.
        </p>
        <div className="stub-page-badge">Coming Soon</div>
        <ul className="stub-page-features">
          <li>Live eBird sightings within your chosen radius</li>
          <li>Map view of recent observation hotspots</li>
          <li>Filter by distance, time, and rarity</li>
          <li>Add species to your personal watchlist</li>
        </ul>
      </div>
    </div>
  );
}
