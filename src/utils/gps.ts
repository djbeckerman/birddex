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

/** Reverse geocode coordinates to a "City · State" label via Nominatim (no API key needed). */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } },
    );
    if (!res.ok) throw new Error('nominatim error');
    const data = await res.json() as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        suburb?: string;
        county?: string;
        state?: string;
        state_code?: string;
      };
    };
    const addr = data.address ?? {};
    const city = addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? addr.county ?? '';
    const region = addr.state_code ?? addr.state ?? '';
    if (city && region) return `${city} · ${region}`;
    if (city) return city;
    if (region) return region;
    return formatCoordsLabel(lat, lng);
  } catch {
    return formatCoordsLabel(lat, lng);
  }
}
