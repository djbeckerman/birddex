/**
 * Bird identification API
 * - Sound: uploads audio to local BirdNET-Analyzer server (localhost:5001)
 * - Photo: sends image to Anthropic Claude vision API
 */

export interface IdentifyMatch {
  commonName: string;
  scientificName: string;
  confidence: number; // 0–100
  funFact?: string;
  photoUrl?: string | null; // fetched separately by the UI
}

// ── Sound identification ──────────────────────────────────────────────────────

export async function identifyBySound(
  audioBlob: Blob,
  lat = 34.0195,
  lng = -118.4912,
): Promise<IdentifyMatch[]> {
  const serverUrl = (import.meta.env.VITE_BIRDNET_URL as string) || 'http://localhost:5001';

  const form = new FormData();
  form.append('audio', audioBlob, 'recording.webm');
  form.append('lat', String(lat));
  form.append('lng', String(lng));
  // week removed — server now passes date= to birdnetlib which converts internally

  const res = await fetch(`${serverUrl}/identify`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`BirdNET server error: ${res.status}`);

  const data: {
    detections?: Array<{ common_name: string; scientific_name: string; confidence: number }>;
    error?: string;
  } = await res.json();

  // Server-side BirdNET error (e.g. ffmpeg missing, librosa decode failure)
  if (data.error) throw new Error(`BirdNET: ${data.error}`);

  return (data.detections ?? []).map((d) => ({
    commonName: d.common_name,
    scientificName: d.scientific_name,
    confidence: d.confidence,
  }));
}

// ── Photo identification ──────────────────────────────────────────────────────
// Runs server-side (via the same Railway server that powers sound ID) so the
// Anthropic API key never ships in the client bundle.

export async function identifyByPhoto(
  imageFile: File,
  lat?: number,
  lng?: number,
): Promise<IdentifyMatch[]> {
  const serverUrl = (import.meta.env.VITE_BIRDNET_URL as string) || 'http://localhost:5001';

  const form = new FormData();
  form.append('image', imageFile, imageFile.name || 'photo.jpg');
  if (lat != null) form.append('lat', String(lat));
  if (lng != null) form.append('lng', String(lng));

  const res = await fetch(`${serverUrl}/identify-photo`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Server error ${res.status}`);
  }

  const data = await res.json() as { matches?: IdentifyMatch[]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.matches ?? [];
}

