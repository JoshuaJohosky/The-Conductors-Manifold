/**
 * Mobile API Client with Caching Layer
 *
 * Consumes the Manifold read-only endpoints from /api/v2/mobile
 * Implements client-side caching for performance and offline support.
 */

import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import {
  HorizonScale,
  DataFeed,
  ProjectionsResponse,
  InterpretationResponse,
  MultiscaleResponse,
  PulseResponse,
  SymbolsResponse,
  HealthResponse,
  ApiError,
  CacheEntry,
} from '../types';

// Configuration
const DEFAULT_API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000';
const API_VERSION = 'v2';
const CACHE_PREFIX = 'manifold_cache_';
const DEFAULT_CACHE_EXPIRY = 60 * 1000; // 1 minute for real-time data
const LONG_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes for less volatile data

// In-memory cache (faster than SecureStore for frequent access)
const memoryCache = new Map<string, CacheEntry<unknown>>();

/**
 * API Client Configuration
 */
interface ApiClientConfig {
  baseUrl: string;
  apiKey: string;
  tenantId?: string;
  cacheExpiry?: number;
}

/**
 * Get stored API key from secure storage
 */
async function getStoredApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('mobile_api_key');
  } catch {
    return null;
  }
}

/**
 * Store API key securely
 */
export async function storeApiKey(apiKey: string): Promise<void> {
  await SecureStore.setItemAsync('mobile_api_key', apiKey);
}

/**
 * Clear stored API key
 */
export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync('mobile_api_key');
}

/**
 * ManifoldMobileAPI - Read-only API client for mobile
 */
class ManifoldMobileAPI {
  private baseUrl: string;
  private apiKey: string;
  private tenantId?: string;
  private cacheExpiry: number;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.baseUrl = config.baseUrl || DEFAULT_API_URL;
    this.apiKey = config.apiKey || 'demo_mobile_key';
    this.tenantId = config.tenantId;
    this.cacheExpiry = config.cacheExpiry || DEFAULT_CACHE_EXPIRY;
  }

  /**
   * Update configuration
   */
  configure(config: Partial<ApiClientConfig>): void {
    if (config.baseUrl) this.baseUrl = config.baseUrl;
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.tenantId) this.tenantId = config.tenantId;
    if (config.cacheExpiry) this.cacheExpiry = config.cacheExpiry;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(endpoint: string, params: Record<string, string>): string {
    const paramStr = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return `${CACHE_PREFIX}${endpoint}?${paramStr}`;
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): T | null {
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (entry && Date.now() < entry.expiresAt) {
      return entry.data;
    }
    memoryCache.delete(key);
    return null;
  }

  /**
   * Set cache
   */
  private setCache<T>(key: string, data: T, expiry?: number): void {
    const now = Date.now();
    memoryCache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (expiry || this.cacheExpiry),
    });
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    memoryCache.clear();
  }

  /**
   * Make authenticated GET request
   */
  private async get<T>(
    endpoint: string,
    params: Record<string, string> = {},
    useCache = true,
    cacheExpiry?: number
  ): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, params);

    // Check cache first
    if (useCache) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Build URL with params
    const url = new URL(`${this.baseUrl}/api/${API_VERSION}/mobile${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    // Make request
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-MOBILE-API-KEY': this.apiKey,
        ...(this.tenantId && { 'X-TENANT-ID': this.tenantId }),
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        detail: `HTTP ${response.status}: ${response.statusText}`,
      }));
      error.status = response.status;
      throw error;
    }

    const data = await response.json() as T;

    // Cache the result
    if (useCache) {
      this.setCache(cacheKey, data, cacheExpiry);
    }

    return data;
  }

  /**
   * Health check - no auth required
   */
  async healthCheck(): Promise<HealthResponse> {
    const url = `${this.baseUrl}/api/${API_VERSION}/mobile/health`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  }

  /**
   * Get price projections for a symbol at specified horizon
   */
  async getProjections(
    symbol: string,
    horizon: HorizonScale = 'medium',
    feed: DataFeed = 'binanceus'
  ): Promise<ProjectionsResponse> {
    return this.get<ProjectionsResponse>(
      `/projections/${symbol}`,
      { horizon, feed },
      true,
      DEFAULT_CACHE_EXPIRY
    );
  }

  /**
   * Get interpretation for a symbol
   */
  async getInterpretation(
    symbol: string,
    horizon: HorizonScale = 'medium',
    feed: DataFeed = 'binanceus'
  ): Promise<InterpretationResponse> {
    return this.get<InterpretationResponse>(
      `/interpretation/${symbol}`,
      { horizon, feed },
      true,
      DEFAULT_CACHE_EXPIRY
    );
  }

  /**
   * Get multi-scale analysis
   */
  async getMultiscale(
    symbol: string,
    feed: DataFeed = 'binanceus'
  ): Promise<MultiscaleResponse> {
    return this.get<MultiscaleResponse>(
      `/multiscale/${symbol}`,
      { feed },
      true,
      LONG_CACHE_EXPIRY // Cache longer for multi-scale
    );
  }

  /**
   * Get quick pulse check - lightweight for frequent polling
   */
  async getPulse(
    symbol: string,
    feed: DataFeed = 'binanceus'
  ): Promise<PulseResponse> {
    return this.get<PulseResponse>(
      `/pulse/${symbol}`,
      { feed },
      true,
      30 * 1000 // 30 second cache for pulse
    );
  }

  /**
   * Get available symbols for a feed
   */
  async getSymbols(feed: DataFeed = 'binanceus'): Promise<SymbolsResponse> {
    return this.get<SymbolsResponse>(
      '/symbols',
      { feed },
      true,
      LONG_CACHE_EXPIRY
    );
  }

  /**
   * Test write endpoint - should fail for mobile_viewer
   * Used to verify read-only enforcement
   */
  async testWriteEndpoint(): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.baseUrl}/api/${API_VERSION}/mobile/test-write`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MOBILE-API-KEY': this.apiKey,
          ...(this.tenantId && { 'X-TENANT-ID': this.tenantId }),
        },
        body: JSON.stringify({ test: 'data' }),
      });

      if (response.status === 403) {
        // Expected! Read-only enforcement working
        return { success: true };
      }

      // If we got here, something is wrong
      return {
        success: false,
        error: `Expected 403, got ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const api = new ManifoldMobileAPI();

// Export class for custom instances
export { ManifoldMobileAPI };

// Export configuration function
export function configureApi(config: Partial<ApiClientConfig>): void {
  api.configure(config);
}
