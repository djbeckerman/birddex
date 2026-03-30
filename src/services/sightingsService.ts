import { supabase } from '../lib/supabase';
import type { SpottedEntry, Bird } from '../types/bird';
import type { SightingRow } from '../types/database';

// ── Conversions ──────────────────────────────────────────────

function toSpottedEntry(row: SightingRow): SpottedEntry {
  return {
    spottedAt: row.spotted_date,
    locationName: row.location_name ?? undefined,
    notes: row.notes ?? undefined,
    userPhotoUrl: row.photo_url ?? undefined,
    coords: row.latitude != null && row.longitude != null
      ? { lat: row.latitude, lng: row.longitude }
      : undefined,
  };
}

function toSightingInsert(
  userId: string,
  speciesCode: string,
  comName: string,
  sciName: string,
  entry: SpottedEntry,
): Omit<SightingRow, 'id' | 'created_at'> {
  return {
    user_id:         userId,
    species_code:    speciesCode,
    common_name:     comName || null,
    scientific_name: sciName || null,
    spotted_date:    entry.spottedAt,
    latitude:        entry.coords?.lat ?? null,
    longitude:       entry.coords?.lng ?? null,
    location_name:   entry.locationName ?? null,
    notes:           entry.notes ?? null,
    photo_url:       entry.userPhotoUrl ?? null,
  };
}

// ── Public API ────────────────────────────────────────────────

/**
 * Fetch all sightings for a user, collapsed to one entry per species
 * (the most recent sighting for each species).
 */
export async function fetchSightings(
  userId: string,
): Promise<Record<string, SpottedEntry>> {
  const { data, error } = await supabase
    .from('sightings')
    .select('*')
    .eq('user_id', userId)
    .order('spotted_date', { ascending: false });

  if (error) {
    console.error('[sightingsService] fetchSightings error:', error.message);
    return {};
  }

  // Collapse to one entry per species (first = most recent due to order)
  const map: Record<string, SpottedEntry> = {};
  for (const row of (data ?? []) as SightingRow[]) {
    if (!map[row.species_code]) {
      map[row.species_code] = toSpottedEntry(row);
    }
  }
  return map;
}

/** Upsert a sighting. If a row already exists for this user+species, updates it. */
export async function upsertSighting(
  userId: string,
  speciesCode: string,
  comName: string,
  sciName: string,
  entry: SpottedEntry,
): Promise<void> {
  const { data: existing } = await supabase
    .from('sightings')
    .select('id')
    .eq('user_id', userId)
    .eq('species_code', speciesCode)
    .order('spotted_date', { ascending: false })
    .limit(1);

  const payload = toSightingInsert(userId, speciesCode, comName, sciName, entry);

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('sightings')
      .update({
        spotted_date:    payload.spotted_date,
        location_name:   payload.location_name,
        notes:           payload.notes,
        photo_url:       payload.photo_url,
        latitude:        payload.latitude,
        longitude:       payload.longitude,
      })
      .eq('id', (existing[0] as { id: string }).id);
    if (error) console.error('[sightingsService] upsertSighting update error:', error.message);
  } else {
    const { error } = await supabase.from('sightings').insert(payload);
    if (error) console.error('[sightingsService] upsertSighting insert error:', error.message);
  }
}

/** Delete all sighting rows for a user+species. */
export async function deleteSighting(
  userId: string,
  speciesCode: string,
): Promise<void> {
  const { error } = await supabase
    .from('sightings')
    .delete()
    .eq('user_id', userId)
    .eq('species_code', speciesCode);

  if (error) console.error('[sightingsService] deleteSighting error:', error.message);
}

/**
 * Migrate local sightings to Supabase in one batch.
 * Skips species that already have a Supabase row.
 */
export async function migrateSightings(
  userId: string,
  local: Record<string, SpottedEntry>,
  allBirds: Bird[],
): Promise<void> {
  const codes = Object.keys(local);
  if (codes.length === 0) return;

  // Find which species already exist in Supabase
  const { data: existing } = await supabase
    .from('sightings')
    .select('species_code')
    .eq('user_id', userId)
    .in('species_code', codes);

  const alreadySynced = new Set(
    (existing ?? []).map((r: { species_code: string }) => r.species_code),
  );

  const toInsert = codes
    .filter((code) => !alreadySynced.has(code))
    .map((code) => {
      const bird = allBirds.find((b) => b.speciesCode === code);
      const entry = local[code];
      return toSightingInsert(userId, code, bird?.comName ?? '', bird?.sciName ?? '', entry);
    });

  if (toInsert.length === 0) return;

  const { error } = await supabase.from('sightings').insert(toInsert);
  if (error) console.error('[sightingsService] migrateSightings error:', error.message);
  else console.log(`[sightingsService] Migrated ${toInsert.length} sightings.`);
}
