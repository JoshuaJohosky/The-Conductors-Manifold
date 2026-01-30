/**
 * Loading State Component
 *
 * Shows a consistent loading indicator across the app.
 * Includes animated pulsing effect for visual feedback.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

interface LoadingStateProps {
  message?: string;
  compact?: boolean;
}

export function LoadingState({
  message = 'Analyzing the manifold...',
  compact = false,
}: LoadingStateProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotate animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Animated.View
          style={[
            styles.compactSpinner,
            { transform: [{ rotate }] },
          ]}
        />
        {message && <Text style={styles.compactMessage}>{message}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.spinnerContainer}>
        <Animated.View
          style={[
            styles.outerRing,
            {
              transform: [{ rotate }, { scale: pulseScale }],
              opacity: pulseOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.middleRing,
            {
              transform: [
                { rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['360deg', '0deg'],
                  }) },
              ],
            },
          ]}
        />
        <View style={styles.centerDot} />
      </View>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.subMessage}>Reading the geometric manifold</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  spinnerContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  outerRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#3b82f6',
    borderTopColor: 'transparent',
  },
  middleRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    borderBottomColor: 'transparent',
  },
  centerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
  },
  message: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subMessage: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  compactSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderTopColor: 'transparent',
  },
  compactMessage: {
    color: '#94a3b8',
    fontSize: 13,
  },
});

export default LoadingState;
