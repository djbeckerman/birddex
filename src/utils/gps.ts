/** Attempt to get the user's current position once, with a timeout. Returns null on failure. */
export function getPositionOnce(timeoutMs = 5000): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    const timer = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(timer); resolve(pos); },
      () => { clearTimeout(timer); resolve(null); },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}

/** Format coordinates as a human-readable label */
export function formatCoordsLabel(lat: number, lng: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(3)}°${ns} ${Math.abs(lng).toFixed(3)}°${ew}`;
}
