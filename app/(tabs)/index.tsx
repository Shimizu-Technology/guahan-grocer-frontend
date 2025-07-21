import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { mockItems } from '../../data/mockData';
import { Item } from '../../types';

export default function HomeScreen() {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { favoritesCount } = useFavorites();

  const categories = [
    { name: 'Fruits', icon: '🍎', color: '#EF4444', items: mockItems.filter(item => item.category === 'Fruits').length },
    { name: 'Vegetables', icon: '🥬', color: '#10B981', items: mockItems.filter(item => item.category === 'Vegetables').length },
    { name: 'Dairy', icon: '🥛', color: '#3B82F6', items: mockItems.filter(item => item.category === 'Dairy').length },
    { name: 'Bakery', icon: '🍞', color: '#F59E0B', items: mockItems.filter(item => item.category === 'Bakery').length },
    { name: 'Meat', icon: '🥩', color: '#DC2626', items: mockItems.filter(item => item.category === 'Meat').length },
    { name: 'Beverages', icon: '🥤', color: '#8B5CF6', items: mockItems.filter(item => item.category === 'Beverages').length },
  ];

  const featuredProducts = mockItems.slice(0, 4);

  const navigateToCategory = (category: string) => {
    router.push({
      pathname: '/catalog',
      params: { category }
    });
  };

  const renderCategoryItem = ({ item }: { item: typeof categories[0] }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { backgroundColor: item.color + '20' }]}
      onPress={() => navigateToCategory(item.name)}
    >
      <Text style={styles.categoryIcon}>{item.icon}</Text>
      <Text style={styles.categoryName}>{item.name}</Text>
      <Text style={styles.categoryCount}>{item.items} items</Text>
    </TouchableOpacity>
  );

  const renderFeaturedItem = ({ item }: { item: Item }) => (
    <TouchableOpacity style={styles.featuredCard}>
      <Image source={{ uri: item.imageUrl }} style={styles.featuredImage} />
      <View style={styles.featuredInfo}>
        <Text style={styles.featuredName}>{item.name}</Text>
        <Text style={styles.featuredPrice}>${item.price.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name.split(' ')[0]}!</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitials}>
                {user?.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Fresh Groceries</Text>
          <Text style={styles.heroSubtitle}>Delivered to Your Door</Text>
          <Text style={styles.heroDescription}>
            Discover premium quality groceries from local farms and trusted suppliers
          </Text>
          
          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push('/catalog')}
            >
              <Ionicons name="search" size={20} color="white" />
              <Text style={styles.quickActionText}>Browse Catalog</Text>
            </TouchableOpacity>
            
            <View style={styles.quickStats}>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => router.push('/favorites')}
              >
                <Ionicons name="heart" size={16} color="#0F766E" />
                <Text style={styles.statText}>{favoritesCount} Favorites</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => router.push('/cart')}
              >
                <Ionicons name="bag" size={16} color="#0F766E" />
                <Text style={styles.statText}>{itemCount} In Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shop by Category</Text>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.name}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.categoriesGrid}
          />
        </View>

        {/* Featured Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <TouchableOpacity onPress={() => router.push('/catalog')}>
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={featuredProducts}
            renderItem={renderFeaturedItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredList}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#0F766E',
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: '#B2F5EA',
    fontSize: 16,
  },
  userName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileButton: {
    padding: 4,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#14B8A6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: 'white',
    fontSize: 20,
    marginBottom: 8,
  },
  heroDescription: {
    color: '#B2F5EA',
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  quickActions: {
    gap: 16,
  },
  quickActionButton: {
    backgroundColor: '#E67E52',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  quickActionText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  statText: {
    color: '#0F766E',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  seeAllButton: {
    color: '#0F766E',
    fontSize: 16,
    fontWeight: '600',
  },
  categoriesGrid: {
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    aspectRatio: 1,
    margin: 6,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  categoryCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  featuredList: {
    paddingRight: 20,
  },
  featuredCard: {
    width: 160,
    backgroundColor: 'white',
    borderRadius: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featuredImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  featuredInfo: {
    padding: 12,
  },
  featuredName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  featuredPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F766E',
  },
});
