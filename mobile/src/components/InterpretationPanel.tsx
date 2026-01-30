/**
 * Interpretation Panel Component
 *
 * Displays the Conductor's interpretation in plain language using
 * the repo's forensic labels and geometry terminology.
 *
 * Includes:
 * - Phase diagnosis with visual indicator
 * - Conductor (macro) and Singer (micro) perspectives
 * - Geometric state descriptions
 * - Warning alerts when applicable
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  InterpretationText,
  MetricsValues,
  AttractorInfo,
} from '../types';

interface InterpretationPanelProps {
  interpretation: InterpretationText;
  confidence: number;
  metrics: MetricsValues;
  attractor: AttractorInfo | null;
}

// Phase color mapping
function getPhaseColor(phase: string): string {
  const phaseColors: Record<string, string> = {
    'Impulse Phase': '#3b82f6',
    'Singularity Alert': '#ef4444',
    'Correction Phase': '#f59e0b',
    'Convergence Phase': '#8b5cf6',
    'Equilibrium Phase': '#22c55e',
    'Compression Building': '#f97316',
    'Transitional': '#64748b',
  };
  return phaseColors[phase] || '#64748b';
}

// Phase icon mapping
function getPhaseIcon(phase: string): keyof typeof Ionicons.glyphMap {
  const phaseIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    'Impulse Phase': 'flash',
    'Singularity Alert': 'warning',
    'Correction Phase': 'refresh',
    'Convergence Phase': 'git-merge',
    'Equilibrium Phase': 'checkmark-circle',
    'Compression Building': 'contract',
    'Transitional': 'swap-horizontal',
  };
  return phaseIcons[phase] || 'help-circle';
}

// Metric color based on value
function getMetricColor(metric: string, value: number): string {
  if (metric === 'tension') {
    if (Math.abs(value) > 1.5) return '#ef4444';
    if (Math.abs(value) > 0.7) return '#f59e0b';
    return '#22c55e';
  }
  if (metric === 'entropy') {
    if (value > 6) return '#ef4444';
    if (value > 4) return '#f59e0b';
    return '#22c55e';
  }
  // curvature
  if (Math.abs(value) > 1.5) return '#ef4444';
  if (Math.abs(value) > 0.5) return '#f59e0b';
  return '#22c55e';
}

export function InterpretationPanel({
  interpretation,
  confidence,
  metrics,
  attractor,
}: InterpretationPanelProps) {
  const phaseColor = getPhaseColor(interpretation.phase_title);
  const phaseIcon = getPhaseIcon(interpretation.phase_title);
  const hasWarning = interpretation.warning !== null;

  return (
    <View style={styles.container}>
      {/* Phase Header */}
      <View style={[styles.phaseHeader, { borderLeftColor: phaseColor }]}>
        <View style={styles.phaseInfo}>
          <View style={styles.phaseTitleRow}>
            <Ionicons name={phaseIcon} size={20} color={phaseColor} />
            <Text style={[styles.phaseTitle, { color: phaseColor }]}>
              {interpretation.phase_title}
            </Text>
          </View>
          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>Confidence</Text>
            <View style={styles.confidenceBar}>
              <View
                style={[
                  styles.confidenceFill,
                  { width: `${confidence}%`, backgroundColor: phaseColor },
                ]}
              />
            </View>
            <Text style={styles.confidenceValue}>{confidence.toFixed(0)}%</Text>
          </View>
        </View>
      </View>

      {/* Warning Alert */}
      {hasWarning && (
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle" size={18} color="#fbbf24" />
          <Text style={styles.warningText}>{interpretation.warning}</Text>
        </View>
      )}

      {/* Phase Detail */}
      <View style={styles.section}>
        <Text style={styles.detailText}>{interpretation.phase_detail}</Text>
      </View>

      {/* Dual Perspective */}
      <View style={styles.perspectiveGrid}>
        <View style={styles.perspectiveCard}>
          <View style={styles.perspectiveHeader}>
            <Ionicons name="musical-notes" size={16} color="#8b5cf6" />
            <Text style={styles.perspectiveTitle}>Conductor View</Text>
          </View>
          <Text style={styles.perspectiveText}>
            {interpretation.conductor_view}
          </Text>
        </View>
        <View style={styles.perspectiveCard}>
          <View style={styles.perspectiveHeader}>
            <Ionicons name="mic" size={16} color="#ec4899" />
            <Text style={styles.perspectiveTitle}>Singer View</Text>
          </View>
          <Text style={styles.perspectiveText}>
            {interpretation.singer_view}
          </Text>
        </View>
      </View>

      {/* Geometric State */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Geometric State</Text>
        <View style={styles.geometryGrid}>
          <GeometryItem
            label="Curvature"
            value={interpretation.curvature}
            metric={metrics.curvature}
          />
          <GeometryItem
            label="Tension"
            value={interpretation.tension}
            metric={metrics.tension}
          />
          <GeometryItem
            label="Entropy"
            value={interpretation.entropy}
            metric={metrics.entropy}
          />
        </View>
      </View>

      {/* Wave Context */}
      <View style={styles.section}>
        <View style={styles.waveRow}>
          <Ionicons name="analytics" size={16} color="#3b82f6" />
          <Text style={styles.waveLabel}>Wave Position:</Text>
          <Text style={styles.waveValue}>{interpretation.wave_context}</Text>
        </View>
      </View>

      {/* Attractor Info */}
      {attractor && attractor.price !== null && (
        <View style={styles.attractorSection}>
          <View style={styles.attractorHeader}>
            <Ionicons name="locate" size={16} color="#22c55e" />
            <Text style={styles.attractorTitle}>Nearest Attractor</Text>
          </View>
          <View style={styles.attractorContent}>
            <Text style={styles.attractorPrice}>
              ${attractor.price?.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text style={styles.attractorDescription}>
              {attractor.description}
            </Text>
            <View style={styles.pullStrength}>
              <Text style={styles.pullLabel}>Pull Strength</Text>
              <View style={styles.pullBar}>
                <View
                  style={[
                    styles.pullFill,
                    { width: `${attractor.pull_strength * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.pullValue}>
                {(attractor.pull_strength * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Narrative */}
      <View style={styles.narrativeSection}>
        <Text style={styles.sectionTitle}>Market Narrative</Text>
        <Text style={styles.narrativeText}>{interpretation.narrative}</Text>
      </View>
    </View>
  );
}

// Geometry item sub-component
function GeometryItem({
  label,
  value,
  metric,
}: {
  label: string;
  value: string;
  metric: number;
}) {
  const color = getMetricColor(label.toLowerCase(), metric);

  return (
    <View style={styles.geometryItem}>
      <Text style={styles.geometryLabel}>{label}</Text>
      <View style={[styles.geometryIndicator, { backgroundColor: color + '20' }]}>
        <View style={[styles.geometryDot, { backgroundColor: color }]} />
        <Text style={[styles.geometryValue, { color }]}>
          {metric.toFixed(2)}
        </Text>
      </View>
      <Text style={styles.geometryDescription}>{value}</Text>
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
  phaseHeader: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    marginBottom: 12,
  },
  phaseInfo: {},
  phaseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phaseTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  confidenceLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  confidenceBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 2,
  },
  confidenceValue: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fbbf2420',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    color: '#fbbf24',
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
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
  detailText: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 22,
  },
  perspectiveGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  perspectiveCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
  },
  perspectiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  perspectiveTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  perspectiveText: {
    color: '#e2e8f0',
    fontSize: 12,
    lineHeight: 18,
  },
  geometryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  geometryItem: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  geometryLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  geometryIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    marginBottom: 6,
  },
  geometryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  geometryValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  geometryDescription: {
    color: '#94a3b8',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  waveLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  waveValue: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '500',
  },
  attractorSection: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  attractorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  attractorTitle: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  attractorContent: {},
  attractorPrice: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  attractorDescription: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  pullStrength: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pullLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  pullBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
  },
  pullFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  pullValue: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
  },
  narrativeSection: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  narrativeText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});

export default InterpretationPanel;
