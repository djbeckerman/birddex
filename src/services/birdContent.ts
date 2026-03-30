/**
 * Bird Content Service
 *
 * Provides rich species content (descriptions, fun facts, habitat, etc.)
 * Architecture is designed for phased upgrades:
 *
 *   Phase 1 (current): Local placeholder data for 25 common North American species.
 *   Phase 2 (planned): Cornell Lab's All About Birds API for full species coverage.
 *   Phase 3 (planned): Macaulay Library integration for audio recordings and photo galleries.
 */

import type { BirdContent } from '../types/bird';
import { PLACEHOLDER_BIRD_CONTENT } from '../data/placeholderBirds';

/**
 * Fetch rich content for a species by eBird species code.
 * Returns null if no content is available for the given code.
 */
export async function getBirdContent(speciesCode: string): Promise<BirdContent | null> {
  // Phase 1: return from local placeholder data
  const content = PLACEHOLDER_BIRD_CONTENT[speciesCode] ?? null;
  return content;

  // Phase 2 (future): fetch from Cornell All About Birds
  // const response = await fetch(`https://api.allaboutbirds.org/species/${speciesCode}`);
  // return response.json();
}

/**
 * Fetch audio URL for a bird's call or song.
 * Returns null if no audio is available yet.
 */
export async function getBirdAudioUrl(_speciesCode: string): Promise<string | null> {
  // Phase 3 (future): fetch from Macaulay Library or Xeno-canto
  // const url = await fetchMacaulayAudio(speciesCode);
  return null;
}

/**
 * Fetch additional photo gallery URLs for a species.
 * Returns empty array if none available yet.
 */
export async function getBirdPhotos(_speciesCode: string): Promise<string[]> {
  // Phase 3 (future): fetch from Macaulay Library
  return [];
}
