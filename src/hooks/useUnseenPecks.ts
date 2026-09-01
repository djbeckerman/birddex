import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { getUnseenPeckCount } from '../services/friendsService';

/**
 * Unseen-peck count for the signed-in user — polled lightly so the Friends
 * tab can show a small "someone pecked you" badge without needing realtime
 * infra. Used by both the bottom nav and the top nav bar.
 */
export function useUnseenPecks() {
  const userId = useAuthStore((s) => s.session?.user.id);

  const { data: count = 0 } = useQuery({
    queryKey: ['unseen-pecks', userId],
    queryFn: () => getUnseenPeckCount(userId!),
    enabled: !!userId,
    refetchInterval: 45_000,
  });

  return count;
}
