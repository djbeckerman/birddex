import { useMemo } from 'react';
import { useBirdStore } from '../store/useBirdStore';
import type { BirdWithMeta } from '../types/bird';

/**
 * Casual name aliases for smart, location-aware search.
 * When a user types a generic term, we expand it to match related species names.
 */
const CASUAL_ALIASES: Record<string, string[]> = {
  // Gulls
  'seagull':       ['gull'],
  'sea gull':      ['gull'],
  'gull':          ['gull'],
  // Pelicans
  'pelican':       ['pelican'],
  // Cormorants
  'cormorant':     ['cormorant'],
  'shag':          ['cormorant'],
  // Herons & Egrets
  'heron':         ['heron', 'egret'],
  'egret':         ['egret', 'heron'],
  'great blue':    ['heron'],
  'night heron':   ['night-heron', 'heron'],
  'night-heron':   ['night-heron'],
  'snowy':         ['snowy egret', 'snowy plover', 'snowy'],
  // Raptors
  'hawk':          ['hawk', 'kite', 'harrier'],
  'falcon':        ['falcon', 'kestrel', 'merlin'],
  'kestrel':       ['kestrel', 'falcon'],
  'peregrine':     ['peregrine', 'falcon'],
  'raptor':        ['hawk', 'eagle', 'falcon', 'osprey', 'kite', 'harrier'],
  'eagle':         ['eagle', 'osprey'],
  'osprey':        ['osprey'],
  'fish hawk':     ['osprey'],
  'kite':          ['kite'],
  // Hummingbirds
  'hummingbird':   ['hummingbird'],
  'hummer':        ['hummingbird'],
  'anna':          ['hummingbird'],
  'anna\'s':       ['hummingbird'],
  'allen':         ['hummingbird'],
  // Ducks & Waterfowl
  'duck':          ['duck', 'teal', 'scaup', 'scoter', 'bufflehead', 'merganser', 'wigeon', 'mallard'],
  'diving duck':   ['scaup', 'scoter', 'bufflehead', 'merganser'],
  'bufflehead':    ['bufflehead', 'duck'],
  'coot':          ['coot'],
  // Sparrows
  'sparrow':       ['sparrow', 'towhee', 'junco'],
  'towhee':        ['towhee'],
  'white-crowned': ['white-crowned'],
  'song sparrow':  ['song sparrow'],
  // Warblers
  'warbler':       ['warbler'],
  'yellow-rumped': ['warbler'],
  // Woodpeckers
  'woodpecker':    ['woodpecker', 'flicker', 'sapsucker'],
  // Owls
  'owl':           ['owl'],
  // Corvids
  'crow':          ['crow', 'raven'],
  'raven':         ['raven'],
  // Blackbirds
  'blackbird':     ['blackbird', 'grackle', 'cowbird', 'starling'],
  // Shorebirds
  'shorebird':     ['sandpiper', 'plover', 'curlew', 'godwit', 'dowitcher', 'willet', 'oystercatcher', 'turnstone', 'dunlin', 'knot'],
  'willet':        ['willet', 'sandpiper'],
  'curlew':        ['curlew'],
  'plover':        ['plover'],
  // Terns
  'tern':          ['tern'],
  'elegant tern':  ['tern'],
  // Doves & Pigeons
  'pigeon':        ['pigeon', 'dove'],
  'dove':          ['dove', 'pigeon'],
  // Finches
  'finch':         ['finch', 'goldfinch', 'siskin'],
  // Flycatchers
  'flycatcher':    ['flycatcher', 'phoebe', 'pewee', 'kingbird'],
  'phoebe':        ['phoebe'],
  // Swallows & Swifts
  'swift':         ['swift'],
  'swallow':       ['swallow'],
  // Thrushes
  'thrush':        ['thrush', 'robin', 'bluebird', 'solitaire'],
  // Jays
  'jay':           ['jay', 'scrub-jay'],
  // Water / shore groups
  'water bird':    ['heron', 'egret', 'coot', 'gallinule', 'cormorant'],
  'waterbird':     ['heron', 'egret', 'coot', 'gallinule', 'cormorant'],
  'wren':          ['wren'],
  'small bird':    ['sparrow', 'warbler', 'finch', 'wren'],
};

function getSearchScore(bird: BirdWithMeta, rawQuery: string): number {
  const q = rawQuery.toLowerCase().trim();
  if (!q) return bird.likelihoodScore ?? 0;

  const name = bird.comName.toLowerCase();
  const sci = bird.sciName.toLowerCase();

  // Exact or starts-with common name
  if (name === q) return 1000;
  if (name.startsWith(q)) return 800;
  if (name.includes(q)) return 600;
  // Scientific name
  if (sci.includes(q)) return 400;

  // Casual alias expansion — check if query maps to terms found in bird name
  const aliasTerms = CASUAL_ALIASES[q] ?? [];
  for (const term of aliasTerms) {
    if (name.includes(term)) return 500;
  }

  // Partial alias match (user typed "seagu" → check "seagull" prefix)
  for (const [alias, terms] of Object.entries(CASUAL_ALIASES)) {
    if (alias.startsWith(q) && alias !== q) {
      for (const term of terms) {
        if (name.includes(term)) return 300;
      }
    }
  }

  return -1; // no match
}

export function useFilteredBirds(
  birds: BirdWithMeta[],
  overrideSortBy?: string
) {
  const { searchQuery, sortBy: storeSortBy } = useBirdStore();
  const sortBy = overrideSortBy ?? storeSortBy;

  return useMemo(() => {
    let result = [...birds];

    // ── Smart search ──────────────────────────────
    if (searchQuery.trim()) {
      const scored = result
        .map((bird) => ({ bird, score: getSearchScore(bird, searchQuery) }))
        .filter(({ score }) => score >= 0)
        .sort(
          (a, b) =>
            b.score - a.score ||
            (b.bird.likelihoodScore ?? 0) - (a.bird.likelihoodScore ?? 0)
        );
      return scored.map(({ bird }) => bird);
    }

    // ── Sort ──────────────────────────────────────
    result.sort((a, b) => {
      switch (sortBy) {
        case 'comName':
          return a.comName.localeCompare(b.comName);

        case 'spottedAt': {
          const ta = a.spottedEntry?.spottedAt ?? '';
          const tb = b.spottedEntry?.spottedAt ?? '';
          return tb.localeCompare(ta); // most recent first
        }

        case 'rarest':
          // Lowest likelihood score first (hardest to find locally)
          return (a.likelihoodScore ?? 0) - (b.likelihoodScore ?? 0);

        case 'likelihood':
        default:
          // Highest likelihood first
          return (b.likelihoodScore ?? 0) - (a.likelihoodScore ?? 0);
      }
    });

    return result;
  }, [birds, searchQuery, sortBy]);
}
