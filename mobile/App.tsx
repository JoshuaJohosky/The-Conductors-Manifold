/**
 * The Conductor's Manifold - Mobile App
 *
 * Read-only mobile client for multi-scale projections and interpretation.
 * Consumes the /api/v2/mobile endpoints with mobile_viewer scope.
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { AnalysisScreen } from './src/screens/AnalysisScreen';
import { MultiscaleScreen } from './src/screens/MultiscaleScreen';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

// Navigation types
type RootStackParamList = {
  Analysis: undefined;
  Multiscale: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Dark theme for navigation
const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3b82f6',
    background: '#0f172a',
    card: '#1e293b',
    text: '#f1f5f9',
    border: '#334155',
    notification: '#ef4444',
  },
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer theme={DarkTheme}>
          <StatusBar style="light" />
          <Stack.Navigator
            initialRouteName="Analysis"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#0f172a',
              },
              headerTintColor: '#f1f5f9',
              headerTitleStyle: {
                fontWeight: '600',
              },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen
              name="Analysis"
              component={AnalysisScreen}
              options={({ navigation }) => ({
                headerTitle: '',
                headerRight: () => (
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => navigation.navigate('Multiscale')}
                  >
                    <Ionicons name="layers" size={22} color="#3b82f6" />
                    <Text style={styles.headerButtonText}>Multi-Scale</Text>
                  </TouchableOpacity>
                ),
              })}
            />
            <Stack.Screen
              name="Multiscale"
              component={MultiscaleScreen}
              options={{
                headerTitle: '',
                headerBackTitle: 'Back',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3b82f620',
    borderRadius: 8,
  },
  headerButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
});
