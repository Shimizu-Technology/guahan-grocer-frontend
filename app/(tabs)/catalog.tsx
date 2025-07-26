import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { productsAPI } from '../../services/api';
import { Item } from '../../types';

export default function CatalogScreen() {
  const { category, productId } = useLocalSearchParams();
  const { addItem } = useCart();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [products, setProducts] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousCategoryParam = useRef<string | null>(null);

  // Fetch products from API
  const fetchProducts = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      
      const response = await productsAPI.getAll();
      if (response.data) {
        // Convert backend format to frontend format
        const formattedProducts = (response.data as any[]).map((product: any) => ({
          id: product.id.toString(),
          name: product.name,
          category: product.category,
          price: parseFloat(product.price),
          unit: product.unit,
          description: product.description,
          inStock: product.inStock,
          imageUrl: product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300', // Fallback image
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

  // Retry handler
  const handleRetry = () => {
    fetchProducts();
  };

  const categories = ['All', ...new Set(products.map(item => item.category))];

  // Handle category parameter from navigation - only when parameter actually changes
  useEffect(() => {
    const currentCategoryParam = category ? (Array.isArray(category) ? category[0] : category) : null;
    
    // Only update if the category parameter has changed from navigation
    if (currentCategoryParam !== previousCategoryParam.current) {
      if (currentCategoryParam && categories.includes(currentCategoryParam)) {
        setSelectedCategory(currentCategoryParam);
      } else if (!currentCategoryParam) {
        setSelectedCategory('All');
      }
      previousCategoryParam.current = currentCategoryParam;
    }
  }, [category, categories]);

  // Handle productId parameter to open specific product modal
  useEffect(() => {
    if (productId && products.length > 0) {
      const productIdString = Array.isArray(productId) ? productId[0] : productId;
      const product = products.find(item => item.id === productIdString);
      
      if (product) {
        openModal(product);
      }
    }
  }, [productId, products]);

  const filteredItems = products.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesStock = item.inStock; // Only show items in stock
    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleAddToCart = (item: Item) => {
    addItem(item, 1);
  };

  const handleToggleFavorite = async (item: Item) => {
    try {
      if (isFavorite(item.id)) {
        await removeFromFavorites(item.id);
      } else {
        await addToFavorites(item);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const openModal = (item: Item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Catalog</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Catalog</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity style={styles.itemCard} onPress={() => openModal(item)}>
      <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
      
      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={() => handleToggleFavorite(item)}
      >
        <Ionicons
          name={isFavorite(item.id) ? 'heart' : 'heart-outline'}
          size={20}
          color={isFavorite(item.id) ? '#E67E52' : '#6B7280'}
        />
      </TouchableOpacity>

      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
        <Text style={styles.itemUnit}>per {item.unit}</Text>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleAddToCart(item)}
        >
          <Ionicons name="add" size={16} color="white" />
          <Text style={styles.addButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryFilter = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryFilter,
        selectedCategory === item && styles.categoryFilterActive
      ]}
      onPress={() => setSelectedCategory(item)}
    >
      <Text 
        style={[
          styles.categoryFilterText,
          selectedCategory === item && styles.categoryFilterTextActive
        ]}
        numberOfLines={1}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Catalog</Text>
        <Text style={styles.headerSubtitle}>
          {filteredItems.length} products available
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Category Filters */}
      <View style={styles.categoryFiltersContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryFilter}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFiltersContent}
          ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
        />
      </View>

      {/* Products Grid */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        style={styles.productsListContainer}
        contentContainerStyle={styles.productsGrid}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search or category filter</Text>
          </View>
        )}
      />

      {/* Product Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
                
                <Image source={{ uri: selectedItem.imageUrl }} style={styles.modalImage} />
                
                <View style={styles.modalInfo}>
                  <Text style={styles.modalTitle}>{selectedItem.name}</Text>
                  
                  <View style={styles.modalPriceRow}>
                    <Text style={styles.modalPrice}>${selectedItem.price.toFixed(2)}</Text>
                    <Text style={styles.modalUnit}>per {selectedItem.unit}</Text>
                  </View>
                  
                  <View style={styles.modalCategory}>
                    <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
                    <Text style={styles.modalCategoryText}>{selectedItem.category}</Text>
                  </View>
                  
                  <Text style={styles.modalDescription}>{selectedItem.description}</Text>
                  
                  <View style={styles.modalStockInfo}>
                    <Ionicons 
                      name={selectedItem.inStock ? "checkmark-circle" : "close-circle"} 
                      size={16} 
                      color={selectedItem.inStock ? "#10B981" : "#EF4444"} 
                    />
                    <Text style={[
                      styles.modalStockText,
                      { color: selectedItem.inStock ? "#10B981" : "#EF4444" }
                    ]}>
                      {selectedItem.inStock ? "In Stock" : "Out of Stock"}
                    </Text>
                  </View>
                  
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalFavoriteButton}
                      onPress={() => handleToggleFavorite(selectedItem)}
                    >
                      <Ionicons
                        name={isFavorite(selectedItem.id) ? 'heart' : 'heart-outline'}
                        size={22}
                        color={isFavorite(selectedItem.id) ? '#E67E52' : '#6B7280'}
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.modalAddButton,
                        !selectedItem.inStock && styles.modalAddButtonDisabled
                      ]}
                      onPress={() => {
                        if (selectedItem.inStock) {
                          handleAddToCart(selectedItem);
                          closeModal();
                        }
                      }}
                      disabled={!selectedItem.inStock}
                    >
                      <Ionicons name="add" size={20} color="white" />
                      <Text style={styles.modalAddButtonText}>Add to Cart</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  categoryFiltersContainer: {
    height: 52,
    marginBottom: 16,
  },
  categoryFiltersContent: {
    paddingHorizontal: 20,
    paddingRight: 20,
    alignItems: 'center',
  },
  categoryFilter: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 80,
    maxWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  categoryFilterActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  categoryFilterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryFilterTextActive: {
    color: 'white',
  },
  productsListContainer: {
    flex: 1,
  },
  productsGrid: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    flexGrow: 1,
  },
  itemCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  itemInfo: {
    padding: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F766E',
  },
  itemUnit: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 8,
    paddingVertical: 8,
    gap: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 6,
  },
  modalImage: {
    width: '100%',
    height: 220,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalInfo: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  modalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F766E',
    marginRight: 8,
  },
  modalUnit: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  modalCategoryText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 16,
  },
  modalStockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 6,
  },
  modalStockText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalFavoriteButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAddButton: {
    flex: 1,
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalAddButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  modalAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 