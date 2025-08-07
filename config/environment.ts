// Environment configuration for Guahan Grocer Frontend
// This provides fallback values and environment variable access

import { Platform } from 'react-native';

// Force production for all builds except local development
const getBaseApiUrl = () => {
  // Only use localhost for local development on web
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3000/api/v1';
  }
  
  // Always use production URL for mobile apps and deployed web
  return 'https://guahan-grocer-backend.onrender.com/api/v1';
};

const isDevelopment = false; // Force production mode for builds

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