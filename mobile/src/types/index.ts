/**
 * Type definitions for The Conductor's Manifold Mobile App
 */

// Horizon scales for analysis
export type HorizonScale = 'micro' | 'short' | 'medium' | 'long' | 'macro';

// Model quality grades
export type QualityGrade = 'A' | 'B' | 'C' | 'D';

// Phase types from the manifold interpreter
export type ManifoldPhase =
  | 'Impulse Phase'
  | 'Singularity Alert'
  | 'Correction Phase'
  | 'Convergence Phase'
  | 'Equilibrium Phase'
  | 'Compression Building'
  | 'Transitional';

// Directional bias
export type DirectionalBias = 'bullish' | 'bearish' | 'neutral';

// Price target
export interface PriceTarget {
  price: number;
  strength: number;
  distance_pct: number;
  direction: 'above' | 'below';
}

// Projected range
export interface ProjectedRange {
  low: number;
  high: number;
  range_pct: number;
}

// Directional bias info
export interface DirectionalBiasInfo {
  direction: DirectionalBias;
  confidence: number;
}

// Price projections response
export interface Projections {
  current_price: number;
  projected_range: ProjectedRange;
  targets: PriceTarget[];
  directional_bias: DirectionalBiasInfo;
  horizon: HorizonScale;
  timestamp: string;
}

// Model quality metrics
export interface ModelQuality {
  overall: number;
  consistency: number;
  signal_clarity: number;
  sample_sufficiency: number;
  grade: QualityGrade;
}

// Projections API response
export interface ProjectionsResponse {
  symbol: string;
  feed: string;
  projections: Projections;
  model_quality: ModelQuality;
  tenant_id: string;
  cached: boolean;
}

// Interpretation text
export interface InterpretationText {
  phase_title: string;
  phase_detail: string;
  conductor_view: string;
  singer_view: string;
  curvature: string;
  tension: string;
  entropy: string;
  wave_context: string;
  narrative: string;
  warning: string | null;
}

// Metrics values
export interface MetricsValues {
  curvature: number;
  entropy: number;
  tension: number;
}

// Attractor info
export interface AttractorInfo {
  price: number | null;
  description: string | null;
  pull_strength: number;
}

// Interpretation API response
export interface InterpretationResponse {
  symbol: string;
  horizon: HorizonScale;
  interpretation: InterpretationText;
  confidence: number;
  metrics: MetricsValues;
  attractor: AttractorInfo | null;
  timestamp: string;
}

// Scale data for multiscale view
export interface ScaleData {
  projections: Projections;
  interpretation: {
    phase: string;
    summary: string;
    conductor: string;
    singer: string;
    warning: string | null;
  };
  quality: ModelQuality;
}

// Fractal analysis
export interface FractalAnalysis {
  consistency: number;
  dominant_phase: string;
}

// Multiscale API response
export interface MultiscaleResponse {
  symbol: string;
  feed: string;
  current_price: number;
  scales: Record<HorizonScale, ScaleData>;
  fractal_analysis: FractalAnalysis;
  timestamp: string;
}

// Nearest attractor for pulse
export interface NearestAttractor {
  price: number;
  distance_pct: number;
}

// Pulse API response
export interface PulseResponse {
  symbol: string;
  price: number;
  phase: string;
  tension: number;
  entropy: number;
  nearest_attractor: NearestAttractor;
  timestamp: string;
}

// Symbol info
export interface SymbolInfo {
  symbol: string;
  name: string;
  type: 'crypto' | 'stock';
}

// Symbols API response
export interface SymbolsResponse {
  feed: string;
  symbols: SymbolInfo[];
  note: string;
}

// API error
export interface ApiError {
  detail: string;
  status?: number;
}

// Health check response
export interface HealthResponse {
  status: string;
  api_version: string;
  service: string;
  timestamp: string;
}

// Data feed types
export type DataFeed = 'binanceus' | 'alphavantage' | 'coingecko';

// App configuration
export interface AppConfig {
  apiUrl: string;
  apiKey: string;
  tenantId: string;
  defaultFeed: DataFeed;
  defaultSymbol: string;
  cacheExpiry: number; // milliseconds
}

// Cache entry
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}
