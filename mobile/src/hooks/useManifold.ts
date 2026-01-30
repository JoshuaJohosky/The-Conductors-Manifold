/**
 * React Query Hooks for Manifold Data
 *
 * Provides declarative data fetching with automatic caching,
 * background refetching, and error handling.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  HorizonScale,
  DataFeed,
  ProjectionsResponse,
  InterpretationResponse,
  MultiscaleResponse,
  PulseResponse,
  SymbolsResponse,
  ApiError,
} from '../types';

// Query key factory for consistent cache keys
export const manifoldKeys = {
  all: ['manifold'] as const,
  projections: (symbol: string, horizon: HorizonScale, feed: DataFeed) =>
    [...manifoldKeys.all, 'projections', symbol, horizon, feed] as const,
  interpretation: (symbol: string, horizon: HorizonScale, feed: DataFeed) =>
    [...manifoldKeys.all, 'interpretation', symbol, horizon, feed] as const,
  multiscale: (symbol: string, feed: DataFeed) =>
    [...manifoldKeys.all, 'multiscale', symbol, feed] as const,
  pulse: (symbol: string, feed: DataFeed) =>
    [...manifoldKeys.all, 'pulse', symbol, feed] as const,
  symbols: (feed: DataFeed) =>
    [...manifoldKeys.all, 'symbols', feed] as const,
};

/**
 * Hook for fetching price projections
 */
export function useProjections(
  symbol: string,
  horizon: HorizonScale = 'medium',
  feed: DataFeed = 'binanceus',
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery<ProjectionsResponse, ApiError>({
    queryKey: manifoldKeys.projections(symbol, horizon, feed),
    queryFn: () => api.getProjections(symbol, horizon, feed),
    enabled: options?.enabled !== false && !!symbol,
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
    refetchInterval: options?.refetchInterval,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Hook for fetching interpretation
 */
export function useInterpretation(
  symbol: string,
  horizon: HorizonScale = 'medium',
  feed: DataFeed = 'binanceus',
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery<InterpretationResponse, ApiError>({
    queryKey: manifoldKeys.interpretation(symbol, horizon, feed),
    queryFn: () => api.getInterpretation(symbol, horizon, feed),
    enabled: options?.enabled !== false && !!symbol,
    staleTime: 30 * 1000,
    refetchInterval: options?.refetchInterval,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Hook for fetching multi-scale analysis
 */
export function useMultiscale(
  symbol: string,
  feed: DataFeed = 'binanceus',
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery<MultiscaleResponse, ApiError>({
    queryKey: manifoldKeys.multiscale(symbol, feed),
    queryFn: () => api.getMultiscale(symbol, feed),
    enabled: options?.enabled !== false && !!symbol,
    staleTime: 60 * 1000, // Cache longer for multi-scale
    refetchInterval: options?.refetchInterval,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Hook for fetching pulse (lightweight, frequent polling)
 */
export function usePulse(
  symbol: string,
  feed: DataFeed = 'binanceus',
  options?: { enabled?: boolean; pollInterval?: number }
) {
  return useQuery<PulseResponse, ApiError>({
    queryKey: manifoldKeys.pulse(symbol, feed),
    queryFn: () => api.getPulse(symbol, feed),
    enabled: options?.enabled !== false && !!symbol,
    staleTime: 15 * 1000, // Very short stale time for pulse
    refetchInterval: options?.pollInterval || 30 * 1000, // Poll every 30s by default
    retry: 1,
  });
}

/**
 * Hook for fetching available symbols
 */
export function useSymbols(
  feed: DataFeed = 'binanceus',
  options?: { enabled?: boolean }
) {
  return useQuery<SymbolsResponse, ApiError>({
    queryKey: manifoldKeys.symbols(feed),
    queryFn: () => api.getSymbols(feed),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // Symbols don't change often
    retry: 2,
  });
}

/**
 * Combined hook for projections + interpretation
 * Fetches both in parallel for a complete view
 */
export function useManifoldView(
  symbol: string,
  horizon: HorizonScale = 'medium',
  feed: DataFeed = 'binanceus',
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  const projections = useProjections(symbol, horizon, feed, options);
  const interpretation = useInterpretation(symbol, horizon, feed, options);

  return {
    projections: projections.data,
    interpretation: interpretation.data,
    isLoading: projections.isLoading || interpretation.isLoading,
    isFetching: projections.isFetching || interpretation.isFetching,
    error: projections.error || interpretation.error,
    refetch: () => {
      projections.refetch();
      interpretation.refetch();
    },
  };
}

/**
 * Hook to prefetch data for a symbol
 * Useful for preloading data when user hovers over symbol list
 */
export function usePrefetchSymbol() {
  const queryClient = useQueryClient();

  return (symbol: string, feed: DataFeed = 'binanceus') => {
    // Prefetch projections
    queryClient.prefetchQuery({
      queryKey: manifoldKeys.projections(symbol, 'medium', feed),
      queryFn: () => api.getProjections(symbol, 'medium', feed),
      staleTime: 30 * 1000,
    });

    // Prefetch interpretation
    queryClient.prefetchQuery({
      queryKey: manifoldKeys.interpretation(symbol, 'medium', feed),
      queryFn: () => api.getInterpretation(symbol, 'medium', feed),
      staleTime: 30 * 1000,
    });
  };
}

/**
 * Hook to invalidate all data for a symbol
 * Useful when user wants to force refresh
 */
export function useInvalidateSymbol() {
  const queryClient = useQueryClient();

  return (symbol: string) => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === 'manifold' &&
        (query.queryKey as string[]).includes(symbol),
    });
  };
}
