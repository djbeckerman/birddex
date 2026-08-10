/**
 * Xeno-canto API v3 — fetch a bird call recording for a given scientific name.
 * Recordings are CC-licensed; attribution (recordist name + xeno-canto link) is required.
 * https://xeno-canto.org/explore/api
 *
 * v3 changes from v2:
 *   - Requires API key (?key=...)
 *   - Query must use search tags: gen:Genus sp:species (not free text)
 *   - Country filter: cnt:"United States" (not area:north-america)
 *   - Response total field: numRecording (singular, not numRecordings)
 *   - Audio file URL: recording.file (direct download link, same field name)
 *   - Recording page URL: recording.url (now present in response)
 */

export interface XCRecording {
  audioUrl: string;
  recordist: string;
  xcUrl: string;
  licenseUrl: string;
}

// Session-level cache — one good recording per species is enough
const cache = new Map<string, XCRecording | null>();

export async function fetchBirdCall(sciName: string): Promise<XCRecording | null> {
  if (cache.has(sciName)) return cache.get(sciName)!;

  const key = import.meta.env.VITE_XC_API_KEY as string | undefined;
  if (!key) { cache.set(sciName, null); return null; }

  try {
    const [genus, species] = sciName.split(' ');
    if (!genus || !species) { cache.set(sciName, null); return null; }

    // v3 requires tag-based queries; q:A = quality A; cnt filters to US recordings
    const query = encodeURIComponent(`gen:${genus} sp:${species} cnt:"United States" q:A`);
    const res = await fetch(
      `https://xeno-canto.org/api/3/recordings?query=${query}&key=${key}&per_page=20&page=1`,
    );
    if (!res.ok) { cache.set(sciName, null); return null; }

    const data = await res.json() as {
      numRecordings?: string; // v3 returns this as a string, not number
      recordings?: Array<{
        id: string;
        rec: string;
        type: string;
        url: string;
        file: string;
        lic: string;
        q: string;
      }>;
      error?: string;
    };

    if (data.error) { cache.set(sciName, null); return null; }

    const recordings = data.recordings ?? [];
    if (recordings.length === 0) {
      // Fall back without country filter — some species have US recordings
      // filed under variants; try without cnt restriction
      const queryWide = encodeURIComponent(`gen:${genus} sp:${species} q:A`);
      const res2 = await fetch(
        `https://xeno-canto.org/api/3/recordings?query=${queryWide}&key=${key}&per_page=20&page=1`,
      );
      if (!res2.ok) { cache.set(sciName, null); return null; }
      const data2 = await res2.json() as typeof data;
      const recs2 = data2.recordings ?? [];
      if (recs2.length === 0) { cache.set(sciName, null); return null; }
      recordings.push(...recs2);
    }

    // Prefer song > call > anything
    const best =
      recordings.find((r) => r.type?.toLowerCase().includes('song')) ??
      recordings.find((r) => r.type?.toLowerCase().includes('call')) ??
      recordings[0];

    const result: XCRecording = {
      audioUrl: best.file,
      recordist: best.rec,
      xcUrl: best.url || `https://xeno-canto.org/${best.id}`,
      licenseUrl: best.lic
        ? (best.lic.startsWith('http') ? best.lic : `https:${best.lic}`)
        : 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    };

    cache.set(sciName, result);
    return result;
  } catch {
    cache.set(sciName, null);
    return null;
  }
}
