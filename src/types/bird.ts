export interface Bird {
  speciesCode: string;
  comName: string;
  sciName: string;
  order: string;
  familyComName: string;
  familySciName: string;
  taxonOrder: number;
  category: string;
  /** How many times this species was observed near the user's location recently */
  observationCount?: number;
  /** 0–100 normalized likelihood score for the user's location */
  likelihoodScore?: number;
}

export type RarityTier = 'common' | 'uncommon' | 'rare';

export interface SpottedEntry {
  spottedAt: string;
  locationName?: string;
  notes?: string;
  userPhotoUrl?: string; // base64 thumbnail or URL
  coords?: { lat: number; lng: number };
}

export type PhotoStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface BirdWithMeta extends Bird {
  photoUrl: string | null;
  photoStatus: PhotoStatus;
  isSpotted: boolean;
  spottedEntry?: SpottedEntry;
}

export type IUCNStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR';
export type BirdType =
  | 'seabird'
  | 'shorebird'
  | 'raptor'
  | 'songbird'
  | 'waterbird'
  | 'wading bird'
  | 'waterfowl'
  | 'hummingbird'
  | 'woodpecker'
  | 'owl'
  | 'corvid'
  | 'flycatcher'
  | 'dove'
  | 'finch'
  | 'sparrow'
  | 'blackbird'
  | 'duck';
export type Seasonality =
  | 'year-round'
  | 'winter-visitor'
  | 'summer-breeder'
  | 'migrant';

/** Rich species content — sourced from placeholder data or future Cornell API */
export interface BirdContent {
  speciesCode: string;
  description: string;
  funFacts: string[];
  habitat: string;
  diet: string;
  conservationStatus: IUCNStatus;
  // Physical stats
  sizeComparison: string; // "Robin-sized", "Crow-sized", "Goose-sized"
  length: string;         // "14–17 in (36–43 cm)"
  wingspan: string;       // "33–38 in (84–96 cm)"
  weight: string;         // "9–14 oz (255–400 g)"
  // Tags
  birdType: BirdType[];
  seasonality: Seasonality;
  audioUrl?: string;
}

// Raw eBird taxonomy API response shape
export interface EBirdTaxon {
  speciesCode: string;
  comName: string;
  sciName: string;
  order: string;
  familyComName: string;
  familySciName: string;
  taxonOrder: number;
  category: string;
  bandingCodes?: string[];
  comNameCodes?: string[];
  sciNameCodes?: string[];
}

// Raw eBird recent observation response shape
export interface EBirdObservation {
  speciesCode: string;
  comName: string;
  sciName: string;
  locId: string;
  locName: string;
  obsDt: string;
  howMany?: number;
  lat: number;
  lng: number;
  obsValid: boolean;
  obsReviewed: boolean;
  locationPrivate: boolean;
  subId: string;
}

// Raw iNaturalist taxa response
export interface INatTaxon {
  id: number;
  name: string;
  default_photo?: {
    square_url: string;
    medium_url?: string;
  };
}

export interface INatResponse {
  total_results: number;
  results: INatTaxon[];
}
