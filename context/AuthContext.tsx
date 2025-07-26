import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { authAPI } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      setIsLoading(true); // Ensure loading is true at start
      const storedToken = await AsyncStorage.getItem('token');
      
      if (storedToken) {
        // Verify token with backend and get current user
        try {
          const response = await authAPI.getCurrentUser();
          if (response.data && (response.data as any).user) {
            setUser((response.data as any).user);
            setToken(storedToken);
          } else {
            // Token is invalid, remove it
            console.error('Token validation failed: Invalid response from server');
            await clearAuthData();
          }
        } catch (error) {
          console.error('Token validation failed during initial check:', error);
          await clearAuthData();
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      await clearAuthData();
    } finally {
      setIsLoading(false); // Set loading false when done
    }
  };

  const clearAuthData = async () => {
    try {
      await AsyncStorage.removeItem('token');
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      
      if (response.data) {
        const { token: newToken, user: userData } = response.data as any;
        
        if (newToken && userData) {
          await AsyncStorage.setItem('token', newToken);
          setUser(userData);
          setToken(newToken);
        } else {
          throw new Error('Login response missing token or user data');
        }
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, phone: string) => {
    try {
      const response = await authAPI.register(email, password, name, phone);
      
      if (response.data) {
        const { token: newToken, user: userData } = response.data as any;
        
        if (newToken && userData) {
          await AsyncStorage.setItem('token', newToken);
          setUser(userData);
          setToken(newToken);
        } else {
          throw new Error('Registration response missing token or user data');
        }
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint (optional for JWT)
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API call fails
    } finally {
      await clearAuthData();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}; 