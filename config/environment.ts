// Environment configuration for Guahan Grocer Frontend
// This provides fallback values and environment variable access

import { Platform } from 'react-native';

const isDevelopment = process.env.EXPO_PUBLIC_ENV === 'development' || __DEV__;

// Helper function to get the correct API URL for the current environment
const getBaseApiUrl = () => {
  // Check if we have an environment variable set
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // For development, detect platform
  if (isDevelopment) {
    // Use Platform.OS to detect the platform reliably
    if (Platform.OS === 'web') {
      // Web browser can use localhost
      return 'http://localhost:3000/api/v1';
    } else {
      // Mobile device (iOS/Android) needs to use the computer's IP address
      return 'http://192.168.1.190:3000/api/v1';
    }
  }
  
  // Production URL (update when you deploy)
  return 'http://localhost:3000/api/v1';
};

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

export default config; 