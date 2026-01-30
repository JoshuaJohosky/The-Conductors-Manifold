/**
 * Multiscale Screen
 *
 * Shows analysis across all horizons simultaneously.
 * Highlights fractal consistency and dominant phase.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LoadingState, ErrorState } from '../components';
import { useMultiscale, useInvalidateSymbol } from '../hooks/useManifold';
import { HorizonScale, DataFeed, ScaleData } from '../types';

const SCALE_ORDER: HorizonScale[] = ['micro', 'short', 'medium', 'long'];
const SCALE_LABELS: Record<HorizonScale, string> = {
  micro: '1H Micro',
  short: '4H Short',
  medium: '1D Daily',
  long: '1W Weekly',
  macro: '1M Monthly',
};

export function MultiscaleScreen() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [inputValue, setInputValue] = useState('BTCUSDT');
  const [feed, setFeed] = useState<DataFeed>('binanceus');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useMultiscale(symbol, feed, {
    refetchInterval: 120000,
  });
  const invalidateSymbol = useInvalidateSymbol();

  const handleSymbolSubmit = useCallback(() => {
    const trimmed = inputValue.trim().toUpperCase();
    if (trimmed && trimmed !== symbol) {
      setSymbol(trimmed);
    }
  }, [inputValue, symbol]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    invalidateSymbol(symbol);
    await refetch();
    setIsRefreshing(false);
  }, [symbol, invalidateSymbol, refetch]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Multi-Scale View</Text>
        <Text style={styles.subtitle}>Fractal Consistency Analysis</Text>
      </View>

      {/* Symbol Input */}
      <View style={styles.inputContainer}>
        <View style={styles.symbolInput}>
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={handleSymbolSubmit}
            placeholder="Enter symbol"
            placeholderTextColor="#64748b"
            autoCapitalize="characters"
            returnKeyType="search"
          />
          {inputValue !== symbol && (
            <TouchableOpacity
              style={styles.goButton}
              onPress={handleSymbolSubmit}
            >
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#3b82f6"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading && !data ? (
          <LoadingState message={`Analyzing ${symbol} across scales...`} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : data ? (
          <>
            {/* Current Price */}
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>{symbol}</Text>
              <Text style={styles.priceValue}>
                ${data.current_price.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>

            {/* Fractal Analysis Summary */}
            <View style={styles.fractalCard}>
              <View style={styles.fractalHeader}>
                <Ionicons name="git-branch" size={20} color="#8b5cf6" />
                <Text style={styles.fractalTitle}>Fractal Consistency</Text>
              </View>
              <View style={styles.fractalContent}>
                <View style={styles.fractalItem}>
                  <Text style={styles.fractalLabel}>Consistency</Text>
                  <View style={styles.consistencyBar}>
                    <View
                      style={[
                        styles.consistencyFill,
                        { width: `${data.fractal_analysis.consistency}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.fractalValue}>
                    {data.fractal_analysis.consistency}%
                  </Text>
                </View>
                <View style={styles.fractalItem}>
                  <Text style={styles.fractalLabel}>Dominant Phase</Text>
                  <Text style={styles.dominantPhase}>
                    {data.fractal_analysis.dominant_phase}
                  </Text>
                </View>
              </View>
            </View>

            {/* Scale Cards */}
            {SCALE_ORDER.map((scaleKey) => {
              const scaleData = data.scales[scaleKey];
              if (!scaleData) return null;
              return (
                <ScaleCard
                  key={scaleKey}
                  scale={scaleKey}
                  label={SCALE_LABELS[scaleKey]}
                  data={scaleData}
                />
              );
            })}

            {/* Timestamp */}
            <Text style={styles.timestamp}>
              Last updated: {new Date(data.timestamp).toLocaleTimeString()}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// Scale card sub-component
function ScaleCard({
  scale,
  label,
  data,
}: {
  scale: HorizonScale;
  label: string;
  data: ScaleData;
}) {
  const { projections, interpretation, quality } = data;
  const biasColor = getBiasColor(projections.directional_bias.direction);

  return (
    <View style={styles.scaleCard}>
      <View style={styles.scaleHeader}>
        <Text style={styles.scaleLabel}>{label}</Text>
        <View
          style={[styles.qualityBadge, { backgroundColor: getQualityColor(quality.grade) + '20' }]}
        >
          <Text style={[styles.qualityText, { color: getQualityColor(quality.grade) }]}>
            {quality.grade}
          </Text>
        </View>
      </View>

      {/* Phase */}
      <View style={styles.phaseRow}>
        <Ionicons
          name={getPhaseIcon(interpretation.phase)}
          size={16}
          color={getPhaseColor(interpretation.phase)}
        />
        <Text style={[styles.phaseText, { color: getPhaseColor(interpretation.phase) }]}>
          {interpretation.phase}
        </Text>
      </View>

      {/* Summary */}
      <Text style={styles.summaryText} numberOfLines={2}>
        {interpretation.summary}
      </Text>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        {/* Price Range */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Range</Text>
          <Text style={styles.metricValue}>
            ±{projections.projected_range.range_pct.toFixed(1)}%
          </Text>
        </View>

        {/* Bias */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Bias</Text>
          <View style={styles.biasIndicator}>
            <Ionicons
              name={projections.directional_bias.direction === 'bullish' ? 'trending-up' : projections.directional_bias.direction === 'bearish' ? 'trending-down' : 'remove'}
              size={14}
              color={biasColor}
            />
            <Text style={[styles.biasText, { color: biasColor }]}>
              {projections.directional_bias.confidence}%
            </Text>
          </View>
        </View>

        {/* Targets */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Target</Text>
          <Text style={styles.metricValue}>
            ${projections.targets[0]?.price.toFixed(0) || '-'}
          </Text>
        </View>
      </View>

      {/* Warning */}
      {interpretation.warning && (
        <View style={styles.warningRow}>
          <Ionicons name="alert-circle" size={12} color="#fbbf24" />
          <Text style={styles.warningText} numberOfLines={1}>
            {interpretation.warning}
          </Text>
        </View>
      )}
    </View>
  );
}

// Helper functions
function getQualityColor(grade: string): string {
  const colors: Record<string, string> = {
    A: '#22c55e',
    B: '#84cc16',
    C: '#f59e0b',
    D: '#ef4444',
  };
  return colors[grade] || '#64748b';
}

function getPhaseColor(phase: string): string {
  if (phase.includes('Impulse')) return '#3b82f6';
  if (phase.includes('Singularity')) return '#ef4444';
  if (phase.includes('Correction')) return '#f59e0b';
  if (phase.includes('Convergence')) return '#8b5cf6';
  if (phase.includes('Equilibrium')) return '#22c55e';
  if (phase.includes('Compression')) return '#f97316';
  return '#64748b';
}

function getPhaseIcon(phase: string): keyof typeof Ionicons.glyphMap {
  if (phase.includes('Impulse')) return 'flash';
  if (phase.includes('Singularity')) return 'warning';
  if (phase.includes('Correction')) return 'refresh';
  if (phase.includes('Convergence')) return 'git-merge';
  if (phase.includes('Equilibrium')) return 'checkmark-circle';
  if (phase.includes('Compression')) return 'contract';
  return 'help-circle';
}

function getBiasColor(direction: string): string {
  if (direction === 'bullish') return '#22c55e';
  if (direction === 'bearish') return '#ef4444';
  return '#64748b';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    color: '#f1f5f9',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  inputContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  symbolInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  goButton: {
    backgroundColor: '#3b82f6',
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  priceCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  priceLabel: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceValue: {
    color: '#f1f5f9',
    fontSize: 32,
    fontWeight: '700',
  },
  fractalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  fractalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  fractalTitle: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
  },
  fractalContent: {
    gap: 12,
  },
  fractalItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fractalLabel: {
    color: '#64748b',
    fontSize: 13,
    width: 100,
  },
  consistencyBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  consistencyFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 3,
  },
  fractalValue: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  dominantPhase: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '600',
  },
  scaleCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  scaleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scaleLabel: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
  },
  qualityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  phaseText: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '600',
  },
  biasIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  biasText: {
    fontSize: 12,
    fontWeight: '600',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  warningText: {
    flex: 1,
    color: '#fbbf24',
    fontSize: 11,
  },
  timestamp: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default MultiscaleScreen;
