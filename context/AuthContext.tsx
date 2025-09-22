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
  updateUser: (userData: User) => void;
  isLoading: boolean;
  // Online status functions
  isOnline: boolean;
  toggleOnline: () => Promise<void>;
  // Role switching for admins
  currentViewRole: 'customer' | 'driver' | 'admin';
  switchViewRole: (role: 'customer' | 'driver' | 'admin') => void;
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
  const [isOnline, setIsOnline] = useState(false);
  const [currentViewRole, setCurrentViewRole] = useState<'customer' | 'driver' | 'admin'>('customer');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Sync currentViewRole with user's actual role only on initial load
  useEffect(() => {
    if (user) {
      // Only reset currentViewRole on initial load or if currentViewRole is still default
      if (isInitialLoad || currentViewRole === 'customer') {
        setCurrentViewRole(user.role);
        setIsInitialLoad(false);
      }
      // Otherwise preserve the current view role (admin is viewing as different role)
    } else {
      setCurrentViewRole('customer'); // Default for guests
      setIsInitialLoad(true); // Reset for next login
    }
  }, [user]);

  const loadStoredAuth = async () => {
    try {
      setIsLoading(true); // Ensure loading is true at start
      const storedToken = await AsyncStorage.getItem('token');
      
      if (storedToken) {
        // Verify token with backend and get current user
        try {
          const response = await authAPI.getCurrentUser();
          if (response.data && (response.data as any).user) {
            const userData = (response.data as any).user;
            setUser(userData);
            setToken(storedToken);
            setIsOnline(userData.isOnline || false);
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
      setIsOnline(false);
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
          setIsOnline(userData.isOnline || false);
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

  const updateUser = (userData: User) => {
    setUser(userData);
    setIsOnline(userData.isOnline || false);
  };

  // Online status functions
  const toggleOnline = async () => {
    try {
      const response = await authAPI.toggleOnline();
      if (response.data && (response.data as any).user) {
        const userData = (response.data as any).user;
        // Update user state - the useEffect will preserve currentViewRole since it's not initial load
        setUser(userData);
        setIsOnline(userData.isOnline || false);
      }
    } catch (error) {
      console.error('Toggle online error:', error);
      throw error;
    }
  };

  // Role switching function (only for admins)
  const switchViewRole = (role: 'customer' | 'driver' | 'admin') => {
    // Security check: only admins can switch roles
    if (user?.role !== 'admin') {
      console.warn('Only admin users can switch view roles');
      return;
    }
    
    console.log(`Admin switching view role from ${currentViewRole} to ${role}`);
    setCurrentViewRole(role);
  };

  const value = {
    user, 
    token, 
    login, 
    register, 
    logout, 
    updateUser, 
    isLoading,
    isOnline,
    toggleOnline,
    currentViewRole,
    switchViewRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 