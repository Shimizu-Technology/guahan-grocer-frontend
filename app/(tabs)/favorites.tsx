import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { Item } from '../../types';

export default function FavoritesScreen() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { favorites, removeFromFavorites, syncFavorites } = useFavorites();
  const [refreshing, setRefreshing] = useState(false);

  // Show login prompt for guests
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.guestContainer}>
          <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
          <Text style={styles.guestTitle}>Sign in to view favorites</Text>
          <Text style={styles.guestSubtitle}>
            Create an account or sign in to save your favorite products
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleAddToCart = (item: Item) => {
    if (!user) {
      Alert.alert(
        'Sign In Required', 
        'Please sign in to add items to your cart.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    
    addItem(item, 1);
  };

  const handleRemoveFavorite = async (itemId: string) => {
    try {
      await removeFromFavorites(itemId);
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncFavorites();
    } catch (error) {
      console.error('Error refreshing favorites:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: Item }) => (
    <View style={styles.itemCard}>
      <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
      
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${item.price.toFixed(2)} per {item.unit}</Text>
                 <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
        
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveFavorite(item.id)}
          >
            <Ionicons name="heart-dislike" size={16} color="#EF4444" />
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddToCart(item)}
          >
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.addButtonText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (favorites.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Favorites</Text>
          <Text style={styles.headerSubtitle}>Your saved products</Text>
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyDescription}>
            Start adding products to your favorites to see them here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
        <Text style={styles.headerSubtitle}>
          {favorites.length} saved product{favorites.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={favorites}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
    padding: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F766E',
    marginTop: 4,
  },
     itemDescription: {
     fontSize: 12,
     color: '#6B7280',
     marginTop: 4,
   },
  itemActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  removeButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F766E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 20,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 