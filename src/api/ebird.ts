import axios from 'axios';
import type { Bird, EBirdObservation } from '../types/bird';

const EBIRD_BASE = 'https://api.ebird.org/v2';
const LOCAL_BIRDS_CACHE_PREFIX = 'birddex-local-birds-v2';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const DIST_KM = 50;

const ebirdClient = axios.create({
  baseURL: EBIRD_BASE,
  headers: {
    'X-eBirdApiToken': import.meta.env.VITE_EBIRD_API_KEY ?? '',
  },
});

/**
 * Fetch locally relevant bird species near the given coordinates.
 * Pulls recent observations (30-day window, 50km radius), aggregates by species,
 * and ranks by observation frequency. Returns ~80-150 species typical for the area.
 *
 * Falls back to a hardcoded list of 30 common coastal SoCal species if the API
 * is unavailable (e.g., missing API key, network error).
 */
export async function fetchLocalBirds(lat: number, lng: number): Promise<Bird[]> {
  // Cache key includes rounded coords so different locations get separate caches
  const cacheKey = `${LOCAL_BIRDS_CACHE_PREFIX}-${lat.toFixed(1)}-${lng.toFixed(1)}`;

  // Check session cache
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached) as { data: Bird[]; timestamp: number };
      if (Date.now() - timestamp < CACHE_TTL_MS) return data;
    }
  } catch {
    // corrupt cache — proceed with fetch
  }

  try {
    const resp = await ebirdClient.get<EBirdObservation[]>('/data/obs/geo/recent', {
      params: {
        lat,
        lng,
        dist: DIST_KM,
        back: 30,
        maxResults: 10000,
      },
    });

    const observations: EBirdObservation[] = resp.data ?? [];

    // Aggregate by species code
    const speciesMap: Record<string, { comName: string; sciName: string; count: number }> = {};
    for (const obs of observations) {
      if (!obs.speciesCode || !obs.comName) continue;
      if (speciesMap[obs.speciesCode]) {
        speciesMap[obs.speciesCode].count++;
      } else {
        speciesMap[obs.speciesCode] = { comName: obs.comName, sciName: obs.sciName, count: 1 };
      }
    }

    const entries = Object.entries(speciesMap);
    if (entries.length === 0) return FALLBACK_LOCAL_BIRDS;

    const maxCount = Math.max(...entries.map(([, v]) => v.count));

    const result: Bird[] = entries
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([speciesCode, { comName, sciName, count }], index) => ({
        speciesCode,
        comName,
        sciName,
        order: '',
        familyComName: '',
        familySciName: '',
        taxonOrder: index + 1,
        category: 'species',
        observationCount: count,
        likelihoodScore: Math.max(1, Math.round((count / maxCount) * 100)),
      }));

    try {
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({ data: result, timestamp: Date.now() })
      );
    } catch {
      // storage quota exceeded — skip
    }

    return result;
  } catch {
    // API unavailable — use fallback
    return FALLBACK_LOCAL_BIRDS;
  }
}

/** Hardcoded fallback: 30 common coastal Southern California birds with estimated likelihood scores */
const FALLBACK_LOCAL_BIRDS: Bird[] = [
  { speciesCode: 'brnpel',  comName: 'Brown Pelican',              sciName: 'Pelecanus occidentalis',     order: 'Pelecaniformes',    familyComName: 'Pelicans',          familySciName: 'Pelecanidae',       taxonOrder: 1,  category: 'species', observationCount: 95, likelihoodScore: 100 },
  { speciesCode: 'wester2', comName: 'Western Gull',               sciName: 'Larus occidentalis',         order: 'Charadriiformes',   familyComName: 'Gulls, Terns, Skimmers', familySciName: 'Laridae',       taxonOrder: 2,  category: 'species', observationCount: 92, likelihoodScore: 97 },
  { speciesCode: 'doccor',  comName: 'Double-crested Cormorant',   sciName: 'Nannopterum auritum',        order: 'Suliformes',        familyComName: 'Cormorants',        familySciName: 'Phalacrocoracidae', taxonOrder: 3,  category: 'species', observationCount: 88, likelihoodScore: 93 },
  { speciesCode: 'grbher3', comName: 'Great Blue Heron',           sciName: 'Ardea herodias',             order: 'Pelecaniformes',    familyComName: 'Herons, Egrets, Bitterns', familySciName: 'Ardeidae',  taxonOrder: 4,  category: 'species', observationCount: 85, likelihoodScore: 89 },
  { speciesCode: 'greegr',  comName: 'Great Egret',                sciName: 'Ardea alba',                 order: 'Pelecaniformes',    familyComName: 'Herons, Egrets, Bitterns', familySciName: 'Ardeidae',  taxonOrder: 5,  category: 'species', observationCount: 82, likelihoodScore: 86 },
  { speciesCode: 'annhum',  comName: "Anna's Hummingbird",         sciName: 'Calypte anna',               order: 'Apodiformes',       familyComName: 'Hummingbirds',      familySciName: 'Trochilidae',       taxonOrder: 6,  category: 'species', observationCount: 80, likelihoodScore: 84 },
  { speciesCode: 'amecro',  comName: 'American Crow',              sciName: 'Corvus brachyrhynchos',      order: 'Passeriformes',     familyComName: 'Crows, Jays, Magpies', familySciName: 'Corvidae',     taxonOrder: 7,  category: 'species', observationCount: 78, likelihoodScore: 82 },
  { speciesCode: 'calgul1', comName: 'California Gull',            sciName: 'Larus californicus',         order: 'Charadriiformes',   familyComName: 'Gulls, Terns, Skimmers', familySciName: 'Laridae',       taxonOrder: 8,  category: 'species', observationCount: 76, likelihoodScore: 80 },
  { speciesCode: 'heegul',  comName: "Heermann's Gull",            sciName: 'Larus heermanni',            order: 'Charadriiformes',   familyComName: 'Gulls, Terns, Skimmers', familySciName: 'Laridae',       taxonOrder: 9,  category: 'species', observationCount: 74, likelihoodScore: 78 },
  { speciesCode: 'blkpho',  comName: 'Black Phoebe',               sciName: 'Sayornis nigricans',         order: 'Passeriformes',     familyComName: 'Tyrant Flycatchers', familySciName: 'Tyrannidae',       taxonOrder: 10, category: 'species', observationCount: 72, likelihoodScore: 76 },
  { speciesCode: 'moudov',  comName: 'Mourning Dove',              sciName: 'Zenaida macroura',           order: 'Columbiformes',     familyComName: 'Pigeons, Doves',    familySciName: 'Columbidae',        taxonOrder: 11, category: 'species', observationCount: 70, likelihoodScore: 74 },
  { speciesCode: 'whcspa',  comName: 'White-crowned Sparrow',      sciName: 'Zonotrichia leucophrys',     order: 'Passeriformes',     familyComName: 'New World Sparrows', familySciName: 'Passerellidae',    taxonOrder: 12, category: 'species', observationCount: 68, likelihoodScore: 72 },
  { speciesCode: 'houfin',  comName: 'House Finch',                sciName: 'Haemorhous mexicanus',       order: 'Passeriformes',     familyComName: 'Finches',           familySciName: 'Fringillidae',      taxonOrder: 13, category: 'species', observationCount: 66, likelihoodScore: 69 },
  { speciesCode: 'rethaw',  comName: 'Red-tailed Hawk',            sciName: 'Buteo jamaicensis',          order: 'Accipitriformes',   familyComName: 'Hawks, Eagles, Kites', familySciName: 'Accipitridae',  taxonOrder: 14, category: 'species', observationCount: 64, likelihoodScore: 67 },
  { speciesCode: 'snoegr',  comName: 'Snowy Egret',                sciName: 'Egretta thula',              order: 'Pelecaniformes',    familyComName: 'Herons, Egrets, Bitterns', familySciName: 'Ardeidae',  taxonOrder: 15, category: 'species', observationCount: 62, likelihoodScore: 65 },
  { speciesCode: 'yerwar',  comName: 'Yellow-rumped Warbler',      sciName: 'Setophaga coronata',         order: 'Passeriformes',     familyComName: 'New World Warblers', familySciName: 'Parulidae',        taxonOrder: 16, category: 'species', observationCount: 60, likelihoodScore: 63 },
  { speciesCode: 'osprey',  comName: 'Osprey',                     sciName: 'Pandion haliaetus',          order: 'Accipitriformes',   familyComName: 'Ospreys',           familySciName: 'Pandionidae',       taxonOrder: 17, category: 'species', observationCount: 57, likelihoodScore: 60 },
  { speciesCode: 'sonspa',  comName: 'Song Sparrow',               sciName: 'Melospiza melodia',          order: 'Passeriformes',     familyComName: 'New World Sparrows', familySciName: 'Passerellidae',    taxonOrder: 18, category: 'species', observationCount: 55, likelihoodScore: 58 },
  { speciesCode: 'amecoo',  comName: 'American Coot',              sciName: 'Fulica americana',           order: 'Gruiformes',        familyComName: 'Rails, Gallinules, Coots', familySciName: 'Rallidae',  taxonOrder: 19, category: 'species', observationCount: 53, likelihoodScore: 56 },
  { speciesCode: 'willet1', comName: 'Willet',                     sciName: 'Tringa semipalmata',         order: 'Charadriiformes',   familyComName: 'Sandpipers, Phalaropes', familySciName: 'Scolopacidae',  taxonOrder: 20, category: 'species', observationCount: 51, likelihoodScore: 54 },
  { speciesCode: 'eleter',  comName: 'Elegant Tern',               sciName: 'Thalasseus elegans',         order: 'Charadriiformes',   familyComName: 'Gulls, Terns, Skimmers', familySciName: 'Laridae',       taxonOrder: 21, category: 'species', observationCount: 48, likelihoodScore: 51 },
  { speciesCode: 'coohaw',  comName: "Cooper's Hawk",              sciName: 'Accipiter cooperii',         order: 'Accipitriformes',   familyComName: 'Hawks, Eagles, Kites', familySciName: 'Accipitridae',  taxonOrder: 22, category: 'species', observationCount: 46, likelihoodScore: 48 },
  { speciesCode: 'caltow',  comName: 'California Towhee',          sciName: 'Melozone crissalis',         order: 'Passeriformes',     familyComName: 'New World Sparrows', familySciName: 'Passerellidae',    taxonOrder: 23, category: 'species', observationCount: 44, likelihoodScore: 46 },
  { speciesCode: 'bcnher',  comName: 'Black-crowned Night-Heron',  sciName: 'Nycticorax nycticorax',      order: 'Pelecaniformes',    familyComName: 'Herons, Egrets, Bitterns', familySciName: 'Ardeidae',  taxonOrder: 24, category: 'species', observationCount: 42, likelihoodScore: 44 },
  { speciesCode: 'comrav',  comName: 'Common Raven',               sciName: 'Corvus corax',               order: 'Passeriformes',     familyComName: 'Crows, Jays, Magpies', familySciName: 'Corvidae',     taxonOrder: 25, category: 'species', observationCount: 40, likelihoodScore: 42 },
  { speciesCode: 'buffle',  comName: 'Bufflehead',                 sciName: 'Bucephala albeola',          order: 'Anseriformes',      familyComName: 'Ducks, Geese, Swans', familySciName: 'Anatidae',      taxonOrder: 26, category: 'species', observationCount: 37, likelihoodScore: 39 },
  { speciesCode: 'whtkite', comName: 'White-tailed Kite',          sciName: 'Elanus leucurus',            order: 'Accipitriformes',   familyComName: 'Hawks, Eagles, Kites', familySciName: 'Accipitridae',  taxonOrder: 27, category: 'species', observationCount: 34, likelihoodScore: 36 },
  { speciesCode: 'lobcur',  comName: 'Long-billed Curlew',         sciName: 'Numenius americanus',        order: 'Charadriiformes',   familyComName: 'Sandpipers, Phalaropes', familySciName: 'Scolopacidae',  taxonOrder: 28, category: 'species', observationCount: 30, likelihoodScore: 32 },
  { speciesCode: 'allhum',  comName: "Allen's Hummingbird",        sciName: 'Selasphorus sasin',          order: 'Apodiformes',       familyComName: 'Hummingbirds',      familySciName: 'Trochilidae',       taxonOrder: 29, category: 'species', observationCount: 27, likelihoodScore: 28 },
  { speciesCode: 'perfal',  comName: 'Peregrine Falcon',           sciName: 'Falco peregrinus',           order: 'Falconiformes',     familyComName: 'Falcons, Caracaras', familySciName: 'Falconidae',       taxonOrder: 30, category: 'species', observationCount: 22, likelihoodScore: 23 },
];
