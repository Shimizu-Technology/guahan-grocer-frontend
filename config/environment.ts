// Environment configuration for Guahan Grocer Frontend
// This provides fallback values and environment variable access

import { Platform } from 'react-native';

// Robust environment detection that works across all platforms and build types
const getBaseApiUrl = () => {
  // Multiple checks to detect if we're in local development
  const isLocalDevelopment = (
    // Check 1: Expo Go development (most reliable)
    (typeof __DEV__ !== 'undefined' && __DEV__ === true) ||
    // Check 2: Environment variable override for local testing
    process.env.EXPO_PUBLIC_USE_LOCAL_API === 'true' ||
    // Check 3: Web localhost detection
    (Platform.OS === 'web' && typeof window !== 'undefined' && 
     (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  );
  
  // For local development
  if (isLocalDevelopment) {
    if (Platform.OS === 'web') {
      return 'http://localhost:3000/api/v1';
    } else {
      // For mobile in Expo Go
      // return 'http://192.168.1.190:3000/api/v1';
      return 'http://172.20.10.3:3000/api/v1';
    }
  }
  
  // For ALL production builds (TestFlight, App Store, deployed web, EAS builds)
  return 'https://guahan-grocer-backend.onrender.com/api/v1';
};

// Conservative development flag - defaults to false for safety
const isDevelopment = (
  (typeof __DEV__ !== 'undefined' && __DEV__ === true) &&
  (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname === 'localhost')
);

export const config = {
  // API Configuration
  API_BASE_URL: getBaseApiUrl(),
  
  // Environment
  IS_DEVELOPMENT: isDevelopment,
  IS_PRODUCTION: !isDevelopment,
  
  // Future configurations
  STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  
  // Timeouts and limits
  API_TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  
  // Local storage keys
  STORAGE_KEYS: {
    TOKEN: 'token',
    USER: 'user',
    CART: 'cart',
    FAVORITES: 'favorites',
  },
};

// Helper function to get the correct API URL for device testing
export const getApiUrl = () => {
  return config.API_BASE_URL;
};

// Debug helper - logs the current API URL being used
export const logApiConfiguration = () => {
  console.log('🔧 API Configuration:');
  console.log('  Platform:', Platform.OS);
  console.log('  API URL:', config.API_BASE_URL);
  console.log('  Is Development:', config.IS_DEVELOPMENT);
  if (typeof __DEV__ !== 'undefined') {
    console.log('  __DEV__ flag:', __DEV__);
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    console.log('  Hostname:', window.location.hostname);
  }
};

export default config; 