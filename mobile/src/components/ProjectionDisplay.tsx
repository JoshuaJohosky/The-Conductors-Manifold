/**
 * Projection Display Component
 *
 * Shows projected price range, targets, and directional bias
 * with a compact model quality indicator.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Projections,
  ModelQuality,
  PriceTarget,
  QualityGrade,
} from '../types';

interface ProjectionDisplayProps {
  projections: Projections;
  quality: ModelQuality;
}

// Get color based on quality grade
function getQualityColor(grade: QualityGrade): string {
  switch (grade) {
    case 'A':
      return '#22c55e';
    case 'B':
      return '#84cc16';
    case 'C':
      return '#f59e0b';
    case 'D':
      return '#ef4444';
    default:
      return '#64748b';
  }
}

// Get color based on direction
function getDirectionColor(direction: string): string {
  switch (direction) {
    case 'bullish':
      return '#22c55e';
    case 'bearish':
      return '#ef4444';
    default:
      return '#64748b';
  }
}

// Get icon for direction
function getDirectionIcon(direction: string): keyof typeof Ionicons.glyphMap {
  switch (direction) {
    case 'bullish':
      return 'trending-up';
    case 'bearish':
      return 'trending-down';
    default:
      return 'remove-outline';
  }
}

// Format price with proper decimals
function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function ProjectionDisplay({
  projections,
  quality,
}: ProjectionDisplayProps) {
  const { current_price, projected_range, targets, directional_bias, horizon } =
    projections;

  return (
    <View style={styles.container}>
      {/* Header with current price and quality */}
      <View style={styles.header}>
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Current Price</Text>
          <Text style={styles.priceValue}>${formatPrice(current_price)}</Text>
        </View>
        <View style={styles.qualitySection}>
          <View
            style={[
              styles.qualityBadge,
              { backgroundColor: getQualityColor(quality.grade) + '20' },
            ]}
          >
            <Text
              style={[
                styles.qualityGrade,
                { color: getQualityColor(quality.grade) },
              ]}
            >
              {quality.grade}
            </Text>
            <Text style={styles.qualityLabel}>Quality</Text>
          </View>
          <Text style={styles.qualityScore}>{quality.overall}%</Text>
        </View>
      </View>

      {/* Projected Range */}
      <View style={styles.rangeSection}>
        <Text style={styles.sectionTitle}>
          Projected Range ({horizon.toUpperCase()})
        </Text>
        <View style={styles.rangeBar}>
          <View style={styles.rangeBarFill}>
            {/* Visual range indicator */}
            <View style={[styles.rangeLow, { flex: 1 }]}>
              <Text style={styles.rangeValue}>
                ${formatPrice(projected_range.low)}
              </Text>
            </View>
            <View style={styles.rangeCurrent}>
              <View style={styles.currentMarker} />
            </View>
            <View style={[styles.rangeHigh, { flex: 1 }]}>
              <Text style={styles.rangeValue}>
                ${formatPrice(projected_range.high)}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.rangePercent}>
          ±{projected_range.range_pct.toFixed(1)}% expected volatility
        </Text>
      </View>

      {/* Directional Bias */}
      <View style={styles.biasSection}>
        <View style={styles.biasHeader}>
          <Ionicons
            name={getDirectionIcon(directional_bias.direction)}
            size={24}
            color={getDirectionColor(directional_bias.direction)}
          />
          <Text
            style={[
              styles.biasDirection,
              { color: getDirectionColor(directional_bias.direction) },
            ]}
          >
            {directional_bias.direction.toUpperCase()}
          </Text>
          <View style={styles.confidenceBar}>
            <View
              style={[
                styles.confidenceFill,
                {
                  width: `${directional_bias.confidence}%`,
                  backgroundColor: getDirectionColor(directional_bias.direction),
                },
              ]}
            />
          </View>
          <Text style={styles.confidenceText}>
            {directional_bias.confidence}%
          </Text>
        </View>
      </View>

      {/* Price Targets */}
      {targets.length > 0 && (
        <View style={styles.targetsSection}>
          <Text style={styles.sectionTitle}>Attractor Targets</Text>
          {targets.slice(0, 3).map((target, index) => (
            <TargetRow key={index} target={target} index={index} />
          ))}
        </View>
      )}
    </View>
  );
}

// Target row component
function TargetRow({ target, index }: { target: PriceTarget; index: number }) {
  const isAbove = target.direction === 'above';

  return (
    <View style={styles.targetRow}>
      <View style={styles.targetRank}>
        <Text style={styles.targetRankText}>{index + 1}</Text>
      </View>
      <View style={styles.targetInfo}>
        <Text style={styles.targetPrice}>${formatPrice(target.price)}</Text>
        <View style={styles.targetDetails}>
          <Ionicons
            name={isAbove ? 'arrow-up' : 'arrow-down'}
            size={12}
            color={isAbove ? '#22c55e' : '#ef4444'}
          />
          <Text
            style={[
              styles.targetDistance,
              { color: isAbove ? '#22c55e' : '#ef4444' },
            ]}
          >
            {Math.abs(target.distance_pct).toFixed(1)}%
          </Text>
        </View>
      </View>
      <View style={styles.targetStrength}>
        <View style={styles.strengthBar}>
          <View
            style={[
              styles.strengthFill,
              { width: `${target.strength * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.strengthText}>
          {(target.strength * 100).toFixed(0)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  priceSection: {},
  priceLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  priceValue: {
    color: '#f1f5f9',
    fontSize: 28,
    fontWeight: '700',
  },
  qualitySection: {
    alignItems: 'center',
  },
  qualityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  qualityGrade: {
    fontSize: 20,
    fontWeight: '700',
  },
  qualityLabel: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  qualityScore: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  rangeSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  rangeBar: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  rangeBarFill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeLow: {
    alignItems: 'flex-start',
  },
  rangeHigh: {
    alignItems: 'flex-end',
  },
  rangeCurrent: {
    paddingHorizontal: 16,
  },
  currentMarker: {
    width: 4,
    height: 24,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  rangeValue: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  rangePercent: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
  },
  biasSection: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  biasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  biasDirection: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 70,
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  targetsSection: {},
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  targetRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  targetRankText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  targetInfo: {
    flex: 1,
  },
  targetPrice: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600',
  },
  targetDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  targetDistance: {
    fontSize: 12,
  },
  targetStrength: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  strengthBar: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  strengthText: {
    color: '#64748b',
    fontSize: 11,
    minWidth: 30,
    textAlign: 'right',
  },
});

export default ProjectionDisplay;
