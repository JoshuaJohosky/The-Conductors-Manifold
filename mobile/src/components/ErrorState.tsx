/**
 * Error State Component
 *
 * Shows error messages with retry functionality.
 * Provides helpful troubleshooting suggestions.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorStateProps {
  error: Error | { detail?: string; status?: number } | null;
  onRetry?: () => void;
  compact?: boolean;
}

// Get user-friendly error message
function getErrorMessage(error: ErrorStateProps['error']): string {
  if (!error) {
    return 'An unexpected error occurred';
  }

  // Handle API errors with detail field
  if ('detail' in error && error.detail) {
    return error.detail;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('Network')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    // Timeout errors
    if (error.message.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }
    return error.message;
  }

  return 'An unexpected error occurred';
}

// Get status-specific help text
function getHelpText(error: ErrorStateProps['error']): string | null {
  if (!error || !('status' in error)) {
    return null;
  }

  switch (error.status) {
    case 401:
      return 'Your API key may be invalid or expired. Please check your credentials.';
    case 403:
      return 'You do not have permission to access this resource.';
    case 404:
      return 'The requested symbol or resource was not found.';
    case 429:
      return 'Rate limit exceeded. Please wait a moment before trying again.';
    case 500:
      return 'The server encountered an error. Please try again later.';
    default:
      return null;
  }
}

// Get icon based on error type
function getErrorIcon(error: ErrorStateProps['error']): keyof typeof Ionicons.glyphMap {
  if (!error) return 'alert-circle';

  if ('status' in error) {
    switch (error.status) {
      case 401:
        return 'key-outline';
      case 403:
        return 'lock-closed';
      case 404:
        return 'search';
      case 429:
        return 'timer-outline';
      default:
        return 'alert-circle';
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('Network')) {
      return 'cloud-offline';
    }
    if (error.message.includes('timeout')) {
      return 'time-outline';
    }
  }

  return 'alert-circle';
}

export function ErrorState({
  error,
  onRetry,
  compact = false,
}: ErrorStateProps) {
  const message = getErrorMessage(error);
  const helpText = getHelpText(error);
  const icon = getErrorIcon(error);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactContent}>
          <Ionicons name={icon} size={18} color="#ef4444" />
          <Text style={styles.compactMessage} numberOfLines={2}>
            {message}
          </Text>
        </View>
        {onRetry && (
          <TouchableOpacity
            style={styles.compactRetryButton}
            onPress={onRetry}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={16} color="#3b82f6" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={48} color="#ef4444" />
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {helpText && (
        <View style={styles.helpBox}>
          <Ionicons name="information-circle" size={16} color="#64748b" />
          <Text style={styles.helpText}>{helpText}</Text>
        </View>
      )}
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={20} color="#ffffff" />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
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
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ef444420',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    maxWidth: 300,
  },
  helpBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    maxWidth: 300,
    gap: 8,
  },
  helpText: {
    flex: 1,
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef444420',
    borderRadius: 12,
    padding: 12,
    margin: 8,
  },
  compactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactMessage: {
    flex: 1,
    color: '#fca5a5',
    fontSize: 13,
  },
  compactRetryButton: {
    padding: 8,
  },
});

export default ErrorState;
