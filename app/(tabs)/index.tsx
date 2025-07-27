import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { productsAPI, categoriesAPI } from '../../services/api';
import { Item } from '../../types';
import SimpleImage from '../../components/shared/SimpleImage';

interface Category {
  name: string;
  icon: string;
  color: string;
  items: number;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { favoritesCount } = useFavorites();
  
  const [products, setProducts] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fallback icons for any categories that might not have icons set
  const fallbackIcons: Record<string, string> = {
    'Fruits': '🍎',
    'Vegetables': '🥬', 
    'Dairy': '🥛',
    'Bakery': '🍞',
    'Meat': '🥩',
    'Beverages': '🥤',
    'Pantry': '🥫',
    'Snacks': '🍪',
    'Frozen': '🧊',
  };

  // Fetch products from API
  const fetchProducts = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await productsAPI.getAllAvailable();
      if (response.data) {
        // Convert backend format to frontend format
        const formattedProducts: Item[] = (response.data as any[]).map((product: any) => ({
          id: product.id.toString(),
          name: product.name,
          category: product.category,
          price: parseFloat(product.price),
          unit: product.unit,
          description: product.description,
          inStock: product.inStock,
          available: product.available,
          trackInventory: product.trackInventory,
          stockStatus: product.stockStatus,
          imageUrl: product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300',
        }));

        setProducts(formattedProducts);

      } else {
        setError(response.error || 'Failed to load products');
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Fetch featured products from API
  const fetchFeaturedProducts = async () => {
    try {
      const response = await productsAPI.getFeatured();
      if (response.data) {
        // Convert backend format to frontend format
        const formattedFeatured: Item[] = (response.data as any[]).map((product: any) => ({
          id: product.id.toString(),
          name: product.name,
          category: product.category,
          price: parseFloat(product.price),
          unit: product.unit,
          description: product.description,
          inStock: product.inStock,
          available: product.available,
          trackInventory: product.trackInventory,
          stockStatus: product.stockStatus,
          imageUrl: product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300',
        }));

        setFeaturedProducts(formattedFeatured);
      }
    } catch (error) {
      console.error('Failed to fetch featured products:', error);
      // Fallback to first 4 available products if featured API fails
      const availableProducts = products.filter(product => 
        product.available !== undefined ? product.available : product.inStock
      );
      setFeaturedProducts(availableProducts.slice(0, 4));
    }
  };

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      if (response.data) {
        // Map backend categories to frontend format with dynamic icons/colors and product counts
        const categoriesWithStats: Category[] = (response.data as any[]).map((cat: any) => {
          // Count products in this category
          const productCount = products.filter(product => 
            product.category === cat.name
          ).length;
          
          return {
            name: cat.name,
            icon: cat.icon || fallbackIcons[cat.name] || '📦',
            color: cat.color || '#6B7280',
            items: productCount,
          };
        });
        
        setCategories(categoriesWithStats);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      // Fallback to deriving from products if API fails
      const categoryStats = products.reduce((acc: Record<string, number>, product) => {
        if (product.category && product.inStock) {
          acc[product.category] = (acc[product.category] || 0) + 1;
        }
        return acc;
      }, {});

      const fallbackCategories: Category[] = Object.entries(categoryStats).map(([name, count]) => ({
        name,
        icon: fallbackIcons[name] || '📦',
        color: '#6B7280',
        items: count,
      }));
      setCategories(fallbackCategories);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProducts();
    fetchFeaturedProducts();
  }, []);

  // Fetch categories when products change
  useEffect(() => {
    if (products.length > 0) {
      fetchCategories();
    }
  }, [products]);

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts(false);
    setRefreshing(false);
  };

  const navigateToCategory = (category: string) => {
    router.push({
      pathname: '/catalog',
      params: { category }
    });
  };

  const navigateToCatalog = () => {
    router.push('/catalog');
  };

  const navigateToProduct = (productId: string) => {
    router.push({
      pathname: '/catalog',
      params: { productId }
    });
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { borderColor: item.color }]}
      onPress={() => navigateToCategory(item.name)}
    >
      <Text style={styles.categoryIcon}>{item.icon}</Text>
      <Text style={styles.categoryName}>{item.name}</Text>
      <Text style={styles.categoryCount}>{item.items} items</Text>
    </TouchableOpacity>
  );

  const renderFeaturedProduct = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigateToProduct(item.id)}
    >
      <SimpleImage 
        src={item.imageUrl} 
        style={styles.productImage}
        accessibilityLabel={`${item.name} featured product`}
      />
      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.loadingText}>Loading fresh groceries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchProducts()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hello, {user?.name?.split(' ')[0] || 'Customer'}! 👋
            </Text>
            <Text style={styles.subtitle}>What would you like to order today?</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/favorites')}>
              <Ionicons name="heart" size={24} color="#0F766E" />
              {favoritesCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{favoritesCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/cart')}>
              <Ionicons name="basket" size={24} color="#0F766E" />
              {itemCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{itemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.primaryAction} onPress={navigateToCatalog}>
              <Ionicons name="storefront" size={24} color="white" />
              <Text style={styles.primaryActionText}>Browse Catalog</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryAction} onPress={() => router.push('/favorites')}>
              <Ionicons name="heart" size={20} color="#0F766E" />
              <Text style={styles.secondaryActionText}>Favorites</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop by Category</Text>
            <FlatList
              data={categories}
              renderItem={renderCategory}
              keyExtractor={(item) => item.name}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
            />
          </View>
        )}

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Products</Text>
              <TouchableOpacity onPress={navigateToCatalog}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={featuredProducts}
              renderItem={renderFeaturedProduct}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
            />
          </View>
        )}

        {/* Empty state */}
        {categories.length === 0 && featuredProducts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Products Available</Text>
            <Text style={styles.emptyText}>Check back later for fresh groceries!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 16,
    color: '#0F766E',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  primaryAction: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  primaryActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#0F766E',
    gap: 6,
  },
  secondaryActionText: {
    color: '#0F766E',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minWidth: 100,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  productsList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F766E',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
