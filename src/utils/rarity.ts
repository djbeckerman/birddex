import type { RarityTier } from '../types/bird';

export function getRarityTier(score: number | undefined): RarityTier {
  if (score === undefined) return 'rare';
  if (score >= 60) return 'common';
  if (score >= 20) return 'uncommon';
  return 'rare';
}

export const RARITY_META: Record<RarityTier, { label: string; color: string; bg: string }> = {
  common:   { label: 'Common',   color: '#2D5A1B', bg: 'rgba(107,143,74,0.15)' },
  uncommon: { label: 'Uncommon', color: '#8A5200', bg: 'rgba(192,128,48,0.15)' },
  rare:     { label: 'Rare',     color: '#8B2020', bg: 'rgba(176,32,32,0.15)'  },
};
