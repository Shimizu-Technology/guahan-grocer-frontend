import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Item, CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (item: Item, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateWeight: (itemId: string, weight: number, note?: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    saveCart();
  }, [items]);

  const loadCart = async () => {
    try {
      const storedCart = await AsyncStorage.getItem('cart');
      if (storedCart) {
        setItems(JSON.parse(storedCart));
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const saveCart = async () => {
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addItem = (item: Item, quantity: number = 1) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(cartItem => cartItem.item.id === item.id);
      
      if (existingItem) {
        if (item.weightBased) {
          // For weight-based items, ADD to the existing weight
          const additionalWeight = quantity; // quantity parameter is actually the weight for weight-based items
          const currentWeight = existingItem.selectedWeight || 0;
          const totalWeight = currentWeight + additionalWeight;
          const estimatedPrice = item.pricePerUnit ? item.pricePerUnit * totalWeight : item.price;
          return currentItems.map(cartItem =>
            cartItem.item.id === item.id
              ? { 
                  ...cartItem, 
                  selectedWeight: totalWeight,
                  estimatedPrice,
                  quantity: 1 // Weight-based items always have quantity of 1
                }
              : cartItem
          );
        } else {
          // For unit-based items, add to quantity
          return currentItems.map(cartItem =>
            cartItem.item.id === item.id
              ? { ...cartItem, quantity: cartItem.quantity + quantity }
              : cartItem
          );
        }
      } else {
        if (item.weightBased) {
          // For weight-based items, set the weight and quantity to 1
          const weight = quantity; // quantity parameter is actually the weight
          const estimatedPrice = item.pricePerUnit ? item.pricePerUnit * weight : item.price;
          return [...currentItems, { 
            id: Date.now().toString(), 
            item, 
            quantity: 1, // Always 1 for weight-based items
            selectedWeight: weight,
            estimatedPrice
          }];
        } else {
          // For unit-based items, use quantity normally
          return [...currentItems, { id: Date.now().toString(), item, quantity }];
        }
      }
    });
  };

  const removeItem = (itemId: string) => {
    setItems(currentItems => currentItems.filter(cartItem => cartItem.item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setItems(currentItems =>
      currentItems.map(cartItem =>
        cartItem.item.id === itemId
          ? { ...cartItem, quantity }
          : cartItem
      )
    );
  };

  const updateWeight = (itemId: string, weight: number, note?: string) => {
    setItems(currentItems =>
      currentItems.map(cartItem => {
        if (cartItem.item.id === itemId && cartItem.item.weightBased) {
          const estimatedPrice = cartItem.item.pricePerUnit 
            ? cartItem.item.pricePerUnit * weight
            : cartItem.item.price;
          
          return {
            ...cartItem,
            selectedWeight: weight,
            estimatedPrice,
            weightNote: note
          };
        }
        return cartItem;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  // Count unique items, not total quantity/weight
  const itemCount = items.length;
  
  // Calculate total with weight-based pricing
  const total = items.reduce((sum, cartItem) => {
    if (cartItem.item.weightBased && cartItem.selectedWeight && cartItem.item.pricePerUnit) {
      // Use weight-based pricing
      return sum + (cartItem.item.pricePerUnit * cartItem.selectedWeight * cartItem.quantity);
    } else {
      // Use regular pricing
      return sum + (cartItem.item.price * cartItem.quantity);
    }
  }, 0);

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      total,
      addItem,
      removeItem,
      updateQuantity,
      updateWeight,
      clearCart
    }}>
      {children}
    </CartContext.Provider>
  );
}; 