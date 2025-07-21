import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { mockUsers } from '../data/mockData';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
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
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        // Decode JWT to get user info (mock implementation)
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]));
          const foundUser = mockUsers.find(u => u.id === payload.userId);
          if (foundUser) {
            setUser(foundUser);
            setToken(storedToken);
          }
        } catch (error) {
          await AsyncStorage.removeItem('token');
        }
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    // Mock login - in real app, this would call POST /api/sessions
    const foundUser = mockUsers.find(u => u.email === email);
    if (foundUser && password === 'password') {
      const mockToken = btoa(JSON.stringify({ userId: foundUser.id, role: foundUser.role })) + '.mocktoken.signature';
      await AsyncStorage.setItem('token', mockToken);
      setUser(foundUser);
      setToken(mockToken);
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}; 