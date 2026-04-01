import { supabase } from '../lib/supabase';
import type { ProfileRow, SightingRow } from '../types/database';

export interface FriendProfile extends ProfileRow {
  sightingCount: number;
  latestSighting: SightingRow | null;
}

export interface FriendRequest {
  id: string;
  requester: ProfileRow;
  created_at: string;
}

export interface ActivityItem {
  sighting: SightingRow;
  profile: ProfileRow;
}

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfileByUsername(username: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) return null;
  return data as ProfileRow;
}

// ── Sightings ─────────────────────────────────────────────────────────────────

export async function getUserSightings(userId: string): Promise<SightingRow[]> {
  const { data, error } = await supabase
    .from('sightings')
    .select('*')
    .eq('user_id', userId)
    .order('spotted_date', { ascending: false });

  if (error || !data) return [];
  return data as SightingRow[];
}

export async function getUserSightingCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('sightings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) return 0;
  return count ?? 0;
}

// ── Friends ───────────────────────────────────────────────────────────────────

export async function getFriends(userId: string): Promise<FriendProfile[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      '*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)',
    )
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (error || !data) return [];

  type FriendshipWithProfiles = {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: string;
    created_at: string;
    requester: ProfileRow;
    addressee: ProfileRow;
  };

  const friendships = data as FriendshipWithProfiles[];

  const friendProfiles = friendships.map((f) =>
    f.requester_id === userId ? f.addressee : f.requester,
  );

  const enriched = await Promise.all(
    friendProfiles.map(async (profile) => {
      const [count, latestArr] = await Promise.all([
        getUserSightingCount(profile.id),
        supabase
          .from('sightings')
          .select('*')
          .eq('user_id', profile.id)
          .order('spotted_date', { ascending: false })
          .limit(1),
      ]);

      const latestSighting =
        latestArr.data && latestArr.data.length > 0
          ? (latestArr.data[0] as SightingRow)
          : null;

      return {
        ...profile,
        sightingCount: count,
        latestSighting,
      } satisfies FriendProfile;
    }),
  );

  return enriched;
}

// ── Pending requests ──────────────────────────────────────────────────────────

export async function getPendingRequests(userId: string): Promise<FriendRequest[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      'id, created_at, requester:profiles!friendships_requester_id_fkey(*)',
    )
    .eq('addressee_id', userId)
    .eq('status', 'pending');

  if (error || !data) return [];

  type RawRequest = {
    id: string;
    created_at: string;
    requester: ProfileRow;
  };

  return (data as unknown as RawRequest[]).map((row) => ({
    id: row.id,
    requester: row.requester,
    created_at: row.created_at,
  }));
}

export async function getSentPendingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('addressee_id')
    .eq('requester_id', userId)
    .eq('status', 'pending');

  if (error || !data) return [];
  return (data as { addressee_id: string }[]).map((r) => r.addressee_id);
}

// ── Send / respond / remove ───────────────────────────────────────────────────

export async function sendFriendRequest(
  requesterId: string,
  targetUsername: string,
): Promise<{ error: string | null }> {
  const target = await getProfileByUsername(targetUsername);
  if (!target) return { error: 'User not found' };
  if (target.id === requesterId) return { error: "You can't add yourself" };

  const { error } = await supabase.from('friendships').insert({
    requester_id: requesterId,
    addressee_id: target.id,
    status: 'pending',
  });

  if (error) {
    if (error.code === '23505') return { error: 'Friend request already sent' };
    return { error: error.message };
  }

  return { error: null };
}

export async function respondToRequest(
  friendshipId: string,
  status: 'accepted' | 'declined',
): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status })
    .eq('id', friendshipId);

  if (error) console.error('[friendsService] respondToRequest error:', error.message);
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`,
    );

  if (error) console.error('[friendsService] removeFriend error:', error.message);
}

// ── Friendship status ─────────────────────────────────────────────────────────

export async function getFriendshipStatus(
  myUserId: string,
  otherUserId: string,
): Promise<FriendshipStatus> {
  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(
      `and(requester_id.eq.${myUserId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${myUserId})`,
    )
    .limit(1)
    .maybeSingle();

  if (error || !data) return 'none';

  const row = data as { requester_id: string; addressee_id: string; status: string };

  if (row.status === 'accepted') return 'accepted';
  if (row.status === 'pending') {
    return row.requester_id === myUserId ? 'pending_sent' : 'pending_received';
  }
  return 'none';
}

// ── Activity feed ─────────────────────────────────────────────────────────────

export async function getFriendActivity(
  userId: string,
  limit = 40,
): Promise<ActivityItem[]> {
  // RLS allows reading accepted friends' sightings
  const { data, error } = await supabase
    .from('sightings')
    .select('*')
    .neq('user_id', userId)
    .order('spotted_date', { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) return [];

  const sightings = data as SightingRow[];

  // Batch-fetch profiles for unique user IDs
  const uniqueUserIds = [...new Set(sightings.map((s) => s.user_id))];
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .in('id', uniqueUserIds);

  const profileMap: Record<string, ProfileRow> = {};
  for (const p of (profileData ?? []) as ProfileRow[]) {
    profileMap[p.id] = p;
  }

  const items: ActivityItem[] = [];
  for (const sighting of sightings) {
    const profile = profileMap[sighting.user_id];
    if (profile) {
      items.push({ sighting, profile });
    }
  }

  return items;
}
