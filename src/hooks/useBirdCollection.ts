import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLocalBirds } from '../api/ebird';
import { useBirdStore } from '../store/useBirdStore';
import type { BirdWithMeta } from '../types/bird';

export function useBirdCollection() {
  const { allBirds, spottedBirds, photoCache, setLocalBirds, setLocalBirdsStatus, localBirdsStatus } =
    useBirdStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['local-birds'],
    queryFn: fetchLocalBirds,
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
