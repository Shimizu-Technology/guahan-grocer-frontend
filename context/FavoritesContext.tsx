import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Item } from '../types';
import { favoritesAPI } from '../services/api';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favorites: Item[];
  favoritesCount: number;
  addToFavorites: (item: Item) => Promise<void>;
  removeFromFavorites: (itemId: string) => Promise<void>;
  isFavorite: (itemId: string) => boolean;
  clearFavorites: () => Promise<void>;
  syncFavorites: () => Promise<void>;
  isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncUserId, setLastSyncUserId] = useState<string | null>(null);
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      // Only sync if the user has actually changed to prevent duplicate calls
      if (user.id !== lastSyncUserId) {
        setLastSyncUserId(user.id);
        syncFavorites();
      }
    } else {
      // For guests, clear favorites instead of loading cached ones
      setLastSyncUserId(null);
      setFavorites([]);
      clearLocalFavorites();
    }
  }, [user, token]);

  const loadLocalFavorites = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem('favorites');
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error('Error loading local favorites:', error);
    }
  };

  const saveLocalFavorites = async (favoritesToSave: Item[]) => {
    try {
      await AsyncStorage.setItem('favorites', JSON.stringify(favoritesToSave));
    } catch (error) {
      console.error('Error saving local favorites:', error);
    }
  };

  const clearLocalFavorites = async () => {
    try {
      await AsyncStorage.removeItem('favorites');
    } catch (error) {
      console.error('Error clearing local favorites:', error);
    }
  };

  const syncFavorites = async () => {
    if (!user || !token) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await favoritesAPI.getAll();
      
      if (response.data) {
        // Backend returns favorite objects with product data
        const backendFavorites = (response.data as any[]).map((favorite: any) => ({
          id: favorite.product.id.toString(),
          name: favorite.product.name,
          category: favorite.product.category,
          price: parseFloat(favorite.product.price),
          unit: favorite.product.unit,
          description: favorite.product.description,
          inStock: favorite.product.inStock,
          imageUrl: favorite.product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300',
        }));
        
        setFavorites(backendFavorites);
        await saveLocalFavorites(backendFavorites);
      }
    } catch (error) {
      console.error('Error syncing favorites:', error);
      // Fall back to local favorites if sync fails
      await loadLocalFavorites();
    } finally {
      setIsLoading(false);
    }
  };

  const addToFavorites = async (item: Item) => {
    // Optimistically update local state
    const updatedFavorites = favorites.find(fav => fav.id === item.id) 
      ? favorites 
      : [...favorites, item];
    
    setFavorites(updatedFavorites);
    await saveLocalFavorites(updatedFavorites);

    // Sync with backend if user is authenticated
    if (user && token) {
      try {
        await favoritesAPI.add(item.id);
      } catch (error) {
        console.error('Error adding favorite to backend:', error);
        // Revert local state on failure
        setFavorites(favorites);
        await saveLocalFavorites(favorites);
      }
    }
  };

  const removeFromFavorites = async (itemId: string) => {
    // Optimistically update local state
    const updatedFavorites = favorites.filter(item => item.id !== itemId);
    setFavorites(updatedFavorites);
    await saveLocalFavorites(updatedFavorites);

    // Sync with backend if user is authenticated
    if (user && token) {
      try {
        await favoritesAPI.remove(itemId);
      } catch (error) {
        console.error('Error removing favorite from backend:', error);
        // Revert local state on failure
        setFavorites(favorites);
        await saveLocalFavorites(favorites);
      }
    }
  };

  const isFavorite = (itemId: string): boolean => {
    return favorites.some(item => item.id === itemId);
  };

  const clearFavorites = async () => {
    setFavorites([]);
    await saveLocalFavorites([]);

    // If authenticated, we could clear backend favorites too
    // For now, we'll just clear local storage
  };

  const favoritesCount = favorites.length;

  return (
    <FavoritesContext.Provider value={{
      favorites,
      favoritesCount,
      addToFavorites,
      removeFromFavorites,
      isFavorite,
      clearFavorites,
      syncFavorites,
      isLoading
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}; 