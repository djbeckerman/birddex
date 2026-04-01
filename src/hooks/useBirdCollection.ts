import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLocalBirds } from '../api/ebird';
import { useBirdStore } from '../store/useBirdStore';
import { useLocationStore, DEFAULT_LOCATION } from '../store/useLocationStore';
import type { BirdWithMeta } from '../types/bird';

export function useBirdCollection() {
  const { allBirds, spottedBirds, photoCache, setLocalBirds, setLocalBirdsStatus, localBirdsStatus } =
    useBirdStore();

  const coords = useLocationStore((s) => s.coords);
  const lat = coords?.lat ?? DEFAULT_LOCATION.lat;
  const lng = coords?.lng ?? DEFAULT_LOCATION.lng;

  // Round to 1 decimal place (~11km precision) for the query key —
  // avoids refetching for minor GPS jitter while still re-fetching for new cities
  const latKey = Math.round(lat * 10) / 10;
  const lngKey = Math.round(lng * 10) / 10;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['local-birds', latKey, lngKey],
    queryFn: () => fetchLocalBirds(lat, lng),
    staleTime: 1000 * 60 * 60 * 6, // 6 hours — matches API cache TTL
    retry: 1,
  });

  useEffect(() => {
    if (isLoading) setLocalBirdsStatus('loading');
    if (isError) setLocalBirdsStatus('error');
    if (data) setLocalBirds(data);
  }, [data, isLoading, isError, setLocalBirds, setLocalBirdsStatus]);

  const birdsWithMeta: BirdWithMeta[] = allBirds.map((bird) => ({
    ...bird,
    photoUrl: photoCache[bird.speciesCode] ?? null,
    photoStatus:
      bird.speciesCode in photoCache
        ? photoCache[bird.speciesCode] !== null
          ? 'loaded'
          : 'error'
        : 'idle',
    isSpotted: !!spottedBirds[bird.speciesCode],
    spottedEntry: spottedBirds[bird.speciesCode],
  }));

  return {
    birds: birdsWithMeta,
    isLoading: localBirdsStatus === 'loading' || (isLoading && allBirds.length === 0),
    isError: localBirdsStatus === 'error',
    totalSpotted: Object.keys(spottedBirds).length,
    totalBirds: allBirds.length,
  };
}
