/**
 * Analysis Screen
 *
 * Main screen showing projections and interpretation.
 * Allows scale selection and symbol switching.
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ScaleSelector,
  ProjectionDisplay,
  InterpretationPanel,
  LoadingState,
  ErrorState,
} from '../components';
import { useManifoldView, usePulse, useInvalidateSymbol } from '../hooks/useManifold';
import { HorizonScale, DataFeed } from '../types';

export function AnalysisScreen() {
  // State
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [inputValue, setInputValue] = useState('BTCUSDT');
  const [scale, setScale] = useState<HorizonScale>('medium');
  const [feed, setFeed] = useState<DataFeed>('binanceus');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data hooks
  const {
    projections,
    interpretation,
    isLoading,
    error,
    refetch,
  } = useManifoldView(symbol, scale, feed, { refetchInterval: 60000 });

  const { data: pulse } = usePulse(symbol, feed, { pollInterval: 30000 });
  const invalidateSymbol = useInvalidateSymbol();

  // Handle symbol change
  const handleSymbolSubmit = useCallback(() => {
    const trimmed = inputValue.trim().toUpperCase();
    if (trimmed && trimmed !== symbol) {
      setSymbol(trimmed);
    }
  }, [inputValue, symbol]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    invalidateSymbol(symbol);
    await refetch();
    setIsRefreshing(false);
  }, [symbol, invalidateSymbol, refetch]);

  // Handle scale change
  const handleScaleChange = useCallback((newScale: HorizonScale) => {
    setScale(newScale);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>The Conductor's Manifold</Text>
          <Text style={styles.subtitle}>Multi-Scale Projections</Text>
        </View>

        {/* Symbol Input */}
        <View style={styles.symbolInputContainer}>
          <View style={styles.symbolInput}>
            <Ionicons name="search" size={20} color="#64748b" />
            <TextInput
              style={styles.input}
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={handleSymbolSubmit}
              placeholder="Enter symbol (e.g., BTCUSDT)"
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

          {/* Feed Selector */}
          <View style={styles.feedSelector}>
            <FeedButton
              label="Crypto"
              active={feed === 'binanceus'}
              onPress={() => setFeed('binanceus')}
            />
            <FeedButton
              label="Stocks"
              active={feed === 'alphavantage'}
              onPress={() => setFeed('alphavantage')}
            />
          </View>
        </View>

        {/* Pulse Mini Display */}
        {pulse && (
          <View style={styles.pulseBar}>
            <View style={styles.pulseItem}>
              <Text style={styles.pulseLabel}>Price</Text>
              <Text style={styles.pulseValue}>
                ${pulse.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.pulseDivider} />
            <View style={styles.pulseItem}>
              <Text style={styles.pulseLabel}>Phase</Text>
              <Text
                style={[
                  styles.pulsePhase,
                  { color: getPhaseColor(pulse.phase) },
                ]}
              >
                {pulse.phase.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            <View style={styles.pulseDivider} />
            <View style={styles.pulseItem}>
              <Text style={styles.pulseLabel}>Tension</Text>
              <Text
                style={[
                  styles.pulseValue,
                  { color: getTensionColor(pulse.tension) },
                ]}
              >
                {pulse.tension.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Scale Selector */}
        <ScaleSelector
          selectedScale={scale}
          onSelectScale={handleScaleChange}
          disabled={isLoading}
        />

        {/* Main Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#3b82f6"
              colors={['#3b82f6']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading && !projections && !interpretation ? (
            <LoadingState message={`Analyzing ${symbol}...`} />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : (
            <>
              {/* Projections */}
              {projections && (
                <ProjectionDisplay
                  projections={projections.projections}
                  quality={projections.model_quality}
                />
              )}

              {/* Interpretation */}
              {interpretation && (
                <InterpretationPanel
                  interpretation={interpretation.interpretation}
                  confidence={interpretation.confidence}
                  metrics={interpretation.metrics}
                  attractor={interpretation.attractor}
                />
              )}

              {/* Timestamp */}
              {interpretation && (
                <Text style={styles.timestamp}>
                  Last updated: {new Date(interpretation.timestamp).toLocaleTimeString()}
                </Text>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Feed button sub-component
function FeedButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.feedButton, active && styles.feedButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.feedButtonText, active && styles.feedButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Helper functions
function getPhaseColor(phase: string): string {
  const colors: Record<string, string> = {
    stable: '#22c55e',
    transitional: '#64748b',
    chaotic: '#f59e0b',
    high_tension: '#ef4444',
    compressed: '#f97316',
  };
  return colors[phase] || '#64748b';
}

function getTensionColor(tension: number): string {
  const abs = Math.abs(tension);
  if (abs > 1.5) return '#ef4444';
  if (abs > 0.7) return '#f59e0b';
  return '#22c55e';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardView: {
    flex: 1,
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
  symbolInputContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  symbolInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
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
  feedSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  feedButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  feedButtonActive: {
    backgroundColor: '#3b82f620',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  feedButtonText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  feedButtonTextActive: {
    color: '#3b82f6',
  },
  pulseBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
  },
  pulseItem: {
    flex: 1,
    alignItems: 'center',
  },
  pulseLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  pulseValue: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
  },
  pulsePhase: {
    fontSize: 11,
    fontWeight: '700',
  },
  pulseDivider: {
    width: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  timestamp: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
});

export default AnalysisScreen;
