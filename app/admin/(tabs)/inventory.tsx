import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productsAPI } from '../../../services/api';

interface Product {
  id: number;
  name: string;
  category: string;
  price: string;
  stock: number;
  lowStock: boolean;
  unit: string;
  status: string;
}

interface Category {
  key: string;
  label: string;
  count: number;
}

export default function AdminInventory() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch products from API
  const fetchProducts = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await productsAPI.getAll();
      if (response.data) {
        // Format products for display
        const formattedProducts: Product[] = (response.data as any[]).map((product: any) => ({
          id: product.id,
          name: product.name,
          category: product.category.toLowerCase(),
          price: `$${parseFloat(product.price).toFixed(2)}`,
          stock: product.stock_quantity || 0,
          lowStock: (product.stock_quantity || 0) <= 10,
          unit: `per ${product.unit}`,
          status: product.in_stock ? 'active' : 'out_of_stock',
        }));

        setProducts(formattedProducts);

        // Calculate categories from actual product data
        const categoryStats = formattedProducts.reduce((acc: Record<string, number>, product) => {
          const category = product.category;
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {});

        // Create categories array
        const categoriesArray: Category[] = [
          { key: 'all', label: 'All Items', count: formattedProducts.length },
          ...Object.entries(categoryStats).map(([key, count]) => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            count,
          }))
        ];

        setCategories(categoriesArray);

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

  // Initial load
  useEffect(() => {
    fetchProducts();
  }, []);

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts(false);
    setRefreshing(false);
  };

  const getStockStatus = (stock: number, lowStock: boolean) => {
    if (stock === 0) return { text: 'Out of Stock', color: '#DC2626' };
    if (lowStock) return { text: 'Low Stock', color: '#EA580C' };
    return { text: 'In Stock', color: '#16A34A' };
  };

  const handleAddProduct = () => {
    Alert.alert('Add Product', 'Product creation form would open here.');
  };

  const handleEditProduct = (product: Product) => {
    Alert.alert('Edit Product', `Edit ${product.name} form would open here.`);
  };

  const handleToggleStock = (product: Product) => {
    Alert.alert(
      'Toggle Stock',
      `Would you like to mark ${product.name} as ${product.status === 'active' ? 'out of stock' : 'in stock'}?`
    );
  };

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(product => product.category === selectedCategory);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.loadingText}>Loading inventory...</Text>
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
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Inventory Management</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Category Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.key}
                style={[
                  styles.filterTab,
                  selectedCategory === category.key && styles.activeFilterTab
                ]}
                onPress={() => setSelectedCategory(category.key)}
              >
                <Text style={[
                  styles.filterText,
                  selectedCategory === category.key && styles.activeFilterText
                ]}>
                  {category.label}
                </Text>
                <View style={[
                  styles.countBadge,
                  selectedCategory === category.key && styles.activeCountBadge
                ]}>
                  <Text style={[
                    styles.countText,
                    selectedCategory === category.key && styles.activeCountText
                  ]}>
                    {category.count}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products List */}
        <ScrollView 
          style={styles.productsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptyText}>
                {selectedCategory === 'all' 
                  ? 'No products in inventory yet.'
                  : `No products in ${selectedCategory} category.`
                }
              </Text>
            </View>
          ) : (
            filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product.stock, product.lowStock);
              
              return (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.productHeader}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productCategory}>{product.category}</Text>
                    </View>
                    <View style={styles.productPrice}>
                      <Text style={styles.priceText}>{product.price}</Text>
                      <Text style={styles.unitText}>{product.unit}</Text>
                    </View>
                  </View>

                  <View style={styles.productDetails}>
                    <View style={styles.stockInfo}>
                      <Text style={styles.stockLabel}>Stock:</Text>
                      <Text style={styles.stockNumber}>{product.stock}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${stockStatus.color}20` }]}>
                        <Text style={[styles.statusText, { color: stockStatus.color }]}>
                          {stockStatus.text}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.productActions}>
                    <TouchableOpacity 
                      style={styles.actionButton} 
                      onPress={() => handleEditProduct(product)}
                    >
                      <Ionicons name="create-outline" size={16} color="#0F766E" />
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.toggleButton]} 
                      onPress={() => handleToggleStock(product)}
                    >
                      <Ionicons 
                        name={product.status === 'active' ? 'eye-off-outline' : 'eye-outline'} 
                        size={16} 
                        color="#7C3AED" 
                      />
                      <Text style={[styles.actionText, { color: '#7C3AED' }]}>
                        {product.status === 'active' ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#0F766E',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    height: 52,
    marginBottom: 8,
  },
  filtersContent: {
    paddingHorizontal: 20,
    paddingRight: 20,
    alignItems: 'center',
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    gap: 4,
  },
  activeFilterTab: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterText: {
    color: 'white',
  },
  countBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  countText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    lineHeight: 12,
  },
  activeCountText: {
    color: 'white',
  },
  productsList: {
    flex: 1,
    paddingHorizontal: 20,
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
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'capitalize',
  },
  productPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F766E',
    marginBottom: 2,
  },
  unitText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  productDetails: {
    marginBottom: 16,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  stockNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  productActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0F766E',
    gap: 4,
  },
  toggleButton: {
    borderColor: '#7C3AED',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F766E',
  },
}); 