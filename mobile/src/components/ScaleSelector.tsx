/**
 * Scale Selector Component
 *
 * Allows users to select analysis horizon/timeframe.
 * Instantly triggers new data fetch on selection.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { HorizonScale } from '../types';

interface ScaleSelectorProps {
  selectedScale: HorizonScale;
  onSelectScale: (scale: HorizonScale) => void;
  disabled?: boolean;
}

interface ScaleOption {
  value: HorizonScale;
  label: string;
  description: string;
}

const SCALE_OPTIONS: ScaleOption[] = [
  { value: 'micro', label: '1H', description: 'Micro' },
  { value: 'short', label: '4H', description: 'Short' },
  { value: 'medium', label: '1D', description: 'Daily' },
  { value: 'long', label: '1W', description: 'Weekly' },
  { value: 'macro', label: '1M', description: 'Monthly' },
];

export function ScaleSelector({
  selectedScale,
  onSelectScale,
  disabled = false,
}: ScaleSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Analysis Horizon</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SCALE_OPTIONS.map((option) => {
          const isSelected = selectedScale === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.scaleButton,
                isSelected && styles.scaleButtonSelected,
                disabled && styles.scaleButtonDisabled,
              ]}
              onPress={() => onSelectScale(option.value)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.scaleLabel,
                  isSelected && styles.scaleLabelSelected,
                ]}
              >
                {option.label}
              </Text>
              <Text
                style={[
                  styles.scaleDescription,
                  isSelected && styles.scaleDescriptionSelected,
                ]}
              >
                {option.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  title: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  scaleButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 70,
    alignItems: 'center',
  },
  scaleButtonSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
  },
  scaleButtonDisabled: {
    opacity: 0.5,
  },
  scaleLabel: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '700',
  },
  scaleLabelSelected: {
    color: '#ffffff',
  },
  scaleDescription: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  scaleDescriptionSelected: {
    color: '#bfdbfe',
  },
});

export default ScaleSelector;
