import axios from 'axios';
import type { INatResponse } from '../types/bird';

const INAT_BASE = 'https://api.inaturalist.org/v1';

const inatClient = axios.create({ baseURL: INAT_BASE });

function getPhotoUrl(squareUrl: string): string {
  // Swap 'square' → 'medium' for better card quality
  return squareUrl.replace('/square.', '/medium.');
}

export async function fetchBirdPhoto(sciName: string): Promise<string | null> {
  const query = sciName.toLowerCase();

  try {
    const res = await inatClient.get<INatResponse>('/taxa', {
      params: {
        q: sciName,
        rank: 'species',
        iconic_taxa: 'Aves',
        per_page: 1,
      },
    });

    const result = res.data.results[0];
    if (!result) return null;

    // Validate name match (handle genus-level fallback)
    const matchName = result.name.toLowerCase();
    const isExactMatch = matchName === query;
    const isGenusMatch = matchName.split(' ')[0] === query.split(' ')[0];

    if (!isExactMatch && !isGenusMatch) return null;

    const squareUrl = result.default_photo?.square_url;
    if (!squareUrl) return null;

    return getPhotoUrl(squareUrl);
  } catch {
    return null;
  }
}
