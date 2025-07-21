import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Item } from '../types';

interface FavoritesContextType {
  favorites: Item[];
  favoritesCount: number;
  addToFavorites: (item: Item) => void;
  removeFromFavorites: (itemId: string) => void;
  isFavorite: (itemId: string) => boolean;
  clearFavorites: () => void;
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

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    saveFavorites();
  }, [favorites]);

  const loadFavorites = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem('favorites');
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const saveFavorites = async () => {
    try {
      await AsyncStorage.setItem('favorites', JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  const addToFavorites = (item: Item) => {
    setFavorites(currentFavorites => {
      if (!currentFavorites.find(fav => fav.id === item.id)) {
        return [...currentFavorites, item];
      }
      return currentFavorites;
    });
  };

  const removeFromFavorites = (itemId: string) => {
    setFavorites(currentFavorites => 
      currentFavorites.filter(item => item.id !== itemId)
    );
  };

  const isFavorite = (itemId: string): boolean => {
    return favorites.some(item => item.id === itemId);
  };

  const clearFavorites = () => {
    setFavorites([]);
  };

  const favoritesCount = favorites.length;

  return (
    <FavoritesContext.Provider value={{
      favorites,
      favoritesCount,
      addToFavorites,
      removeFromFavorites,
      isFavorite,
      clearFavorites
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}; 