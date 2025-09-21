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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';

import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useToast } from '../../context/ToastContext';
import { productsAPI, categoriesAPI } from '../../services/api';
import { Item } from '../../types';
import SimpleImage from '../../components/shared/SimpleImage';
import ImageCarousel from '../../components/shared/ImageCarousel';
import EnhancedProductInfo from '../../components/shared/EnhancedProductInfo';

export default function CatalogScreen() {
  const { category, productId } = useLocalSearchParams();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { showAddToCartToast } = useToast();
  const posthog = usePostHog();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [products, setProducts] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousCategoryParam = useRef<string | null>(null);
  
  // Quantity selection state
  const [selectedWeight, setSelectedWeight] = useState(0.5); // Start at 0.5 lb
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // Fetch products from API
  const fetchProducts = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      
      const response = await productsAPI.getAllAvailable();
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
          available: product.available, // New field for proper availability checking
          trackInventory: product.trackInventory,
          stockStatus: product.stockStatus,
          imageUrl: product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300', // Fallback image
          // Weight-based fields
          weightBased: product.weightBased,
          pricePerUnit: product.pricePerUnit ? parseFloat(product.pricePerUnit) : undefined,
          weightUnit: product.weightUnit,
          minWeight: product.minWeight ? parseFloat(product.minWeight) : undefined,
          maxWeight: product.maxWeight ? parseFloat(product.maxWeight) : undefined,
          weightRange: product.weightRange,
          // Enhanced Open Food Facts data
          enhanced: product.enhanced,
          priceInfo: product.priceInfo,
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
    fetchCategories();
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

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      if (response.data) {
        const categoryNames = (response.data as any[]).map((cat: any) => cat.name);
        setCategories(['All', ...categoryNames]);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      // Fallback to deriving from products if API fails
      const fallbackCategories = ['All', ...new Set(products.map(item => item.category))];
      setCategories(fallbackCategories);
    }
  };

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
    // No need to filter by availability since API already returns only available products
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (item: Item) => {
    if (!user) {
      Alert.alert(
        'Sign In Required', 
        'Please sign in to add items to your cart.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => {
            setModalVisible(false); // Close any open modals
            router.push('/login');
          }}
        ]
      );
      return;
    }
    
    // Validate input based on item type
    if (item.weightBased) {
      const weight = selectedWeight;
      if (weight <= 0) {
        Alert.alert('Invalid Weight', 'Please select a valid weight amount.');
        return;
      }
      
      // Check weight range if specified
      if (item.minWeight && weight < item.minWeight) {
        Alert.alert('Weight Too Low', `Minimum weight is ${item.minWeight} ${item.weightUnit}.`);
        return;
      }
      if (item.maxWeight && weight > item.maxWeight) {
        Alert.alert('Weight Too High', `Maximum weight is ${item.maxWeight} ${item.weightUnit}.`);
        return;
      }
      
      // Add weight-based item with selected weight as quantity
      addItem(item, weight);
      
      // Show success feedback
      showAddToCartToast(item.name, weight, item.weightUnit || 'lbs');
      
      // Track add to cart event
      posthog?.capture('Product Added to Cart', {
        product_id: item.id,
        product_name: item.name,
        category: item.category,
        price: item.pricePerUnit || item.price,
        quantity: weight,
        weight_based: true,
        weight_unit: item.weightUnit || null,
        source: 'catalog'
      });
    } else {
      // Add unit-based item with selected quantity
      addItem(item, selectedQuantity);
      
      // Show success feedback
      showAddToCartToast(item.name, selectedQuantity);
      
      // Track add to cart event
      posthog?.capture('Product Added to Cart', {
        product_id: item.id,
        product_name: item.name,
        category: item.category,
        price: item.price,
        quantity: selectedQuantity,
        weight_based: false,
        source: 'catalog'
      });
    }
  };

  const handleToggleFavorite = async (item: Item) => {
    if (!user) {
      Alert.alert(
        'Sign In Required', 
        'Please sign in to add items to your favorites.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => {
            setModalVisible(false); // Close any open modals
            router.push('/login');
          }}
        ]
      );
      return;
    }
    
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
    
    // Track product view
    posthog?.capture('Product Viewed', {
      product_id: item.id,
      product_name: item.name,
      category: item.category,
      price: item.price,
      weight_based: item.weightBased || false,
      has_enhanced_data: item.enhanced ? true : false,
      source: 'catalog'
    });
    
    // Reset quantity/weight when opening modal
    if (item.weightBased) {
      setSelectedWeight(0.5); // Start at 0.5 lb
    } else {
      setSelectedQuantity(1);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
    setSelectedWeight(0.5);
    setSelectedQuantity(1);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    
    // Track category selection
    posthog?.capture('Category Selected', {
      category: category,
      previous_category: selectedCategory,
      source: 'catalog'
    });
  };

  const handleSearch = (text: string) => {
    setSearchTerm(text);
    
    // Track search if text is meaningful (3+ characters)
    if (text.length >= 3) {
      posthog?.capture('Product Search', {
        search_term: text,
        category: selectedCategory,
        results_count: products.filter(item => 
          item.name.toLowerCase().includes(text.toLowerCase()) &&
          (selectedCategory === 'All' || item.category === selectedCategory)
        ).length,
        source: 'catalog'
      });
    }
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
        {/* Enhanced image display with carousel for multiple images */}
        {item.enhanced?.hasMultipleImages ? (
        <ImageCarousel
          images={item.enhanced.imageUrls || [item.imageUrl].filter(Boolean) as string[]}
          style={styles.itemImage}
          imageStyle={{ height: 120, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
          accessibilityLabel={`${item.name} product images`}
          showIndicators={true}
          showNavigation={false}
        />
      ) : (
        <SimpleImage 
          src={item.imageUrl} 
          style={styles.itemImage}
          accessibilityLabel={`${item.name} product image`}
        />
      )}
      
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
        <View style={styles.itemTextContent}>
          <Text style={styles.itemName} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
          
          {/* Enhanced product info (minimal - only brand and size) */}
          {item.enhanced && (
            <EnhancedProductInfo item={item} minimal={true} />
          )}
          
          {/* Simplified pricing display */}
          <View style={styles.pricingContainer}>
            <Text style={styles.itemPrice}>
              ${item.weightBased 
                ? (item.pricePerUnit?.toFixed(2) || item.price.toFixed(2))
                : item.price.toFixed(2)
              }
            </Text>
            <Text style={styles.itemUnit}>
              per {item.weightBased 
                ? (item.weightUnit || item.unit)
                : item.unit
              }
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[
            styles.addButton,
            item.weightBased && styles.addButtonWeightBased
          ]}
          onPress={() => {
            if (item.weightBased) {
              openModal(item); // Open modal for weight selection
            } else {
              handleAddToCart(item); // Direct add for unit items
            }
          }}
        >
          <Ionicons 
            name={item.weightBased ? "scale" : "add"} 
            size={16} 
            color="white" 
          />
          <Text style={styles.addButtonText}>
            {item.weightBased ? "Select Weight" : "Add to Cart"}
          </Text>
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
      onPress={() => handleCategoryChange(item)}
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
          onChangeText={handleSearch}
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
        columnWrapperStyle={styles.row}
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
                
                <ScrollView 
                  style={styles.modalScrollView}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                  contentContainerStyle={styles.modalScrollContent}
                >
                
                {/* Enhanced image display with carousel */}
                {selectedItem.enhanced?.hasMultipleImages ? (
                  <ImageCarousel
                    images={selectedItem.enhanced.imageUrls || [selectedItem.imageUrl].filter(Boolean) as string[]}
                    style={styles.modalImage}
                    imageStyle={{ height: 220, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
                    accessibilityLabel={`${selectedItem.name} detailed images`}
                    showIndicators={true}
                    showNavigation={true}
                  />
                ) : (
                  <SimpleImage 
                    src={selectedItem.imageUrl} 
                    style={styles.modalImage}
                    accessibilityLabel={`${selectedItem.name} detailed image`}
                  />
                )}
                
                <View style={styles.modalInfo}>
                  {/* Product Header - Cleaner, more focused */}
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{selectedItem.name}</Text>
                    
                    {/* Brand and Size in a cleaner row */}
                    {selectedItem.enhanced && (selectedItem.enhanced.brand || selectedItem.enhanced.size) && (
                      <View style={styles.modalBrandSizeRow}>
                        {selectedItem.enhanced.brand && (
                          <Text style={styles.modalBrand}>{selectedItem.enhanced.brand}</Text>
                        )}
                        {selectedItem.enhanced.brand && selectedItem.enhanced.size && (
                          <Text style={styles.modalSeparator}>•</Text>
                        )}
                        {selectedItem.enhanced.size && (
                          <Text style={styles.modalSize}>{selectedItem.enhanced.size}</Text>
                        )}
                      </View>
                    )}
                  </View>
                  
                  {/* Price and Stock - Combined for better visual balance */}
                  <View style={styles.modalPriceStockRow}>
                    <View style={styles.modalPriceContainer}>
                      <Text style={styles.modalPrice}>
                        ${selectedItem.weightBased 
                          ? (selectedItem.pricePerUnit?.toFixed(2) || selectedItem.price.toFixed(2))
                          : selectedItem.price.toFixed(2)
                        }
                      </Text>
                      <Text style={styles.modalUnit}>
                        per {selectedItem.weightBased 
                          ? (selectedItem.weightUnit || selectedItem.unit)
                          : selectedItem.unit
                        }
                      </Text>
                    </View>
                    
                    <View style={styles.modalStockContainer}>
                      <View style={[
                        styles.modalStockBadge,
                        { backgroundColor: selectedItem.inStock ? '#DCFCE7' : '#FEE2E2' }
                      ]}>
                        <Ionicons 
                          name={selectedItem.inStock ? "checkmark-circle" : "close-circle"} 
                          size={14} 
                          color={selectedItem.inStock ? "#16A34A" : "#DC2626"} 
                        />
                        <Text style={[
                          styles.modalStockText,
                          { color: selectedItem.inStock ? "#16A34A" : "#DC2626" }
                        ]}>
                          {selectedItem.inStock ? "In Stock" : "Out of Stock"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Category - Simplified */}
                  <View style={styles.modalCategoryRow}>
                    <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
                    <Text style={styles.modalCategoryText}>{selectedItem.category}</Text>
                  </View>
                  
                  {/* Enhanced product information */}
                  {selectedItem.enhanced && (
                    <View style={styles.modalEnhancedSection}>
                      <EnhancedProductInfo item={selectedItem} compact={false} hideBrandSize={true} />
                    </View>
                  )}
                  
                  {/* Description */}
                  {selectedItem.description && (
                    <View style={styles.modalDescriptionSection}>
                      <Text style={styles.modalDescriptionTitle}>Description</Text>
                      <Text style={styles.modalDescription}>{selectedItem.description}</Text>
                    </View>
                  )}
                  
                  {/* Quantity Selection */}
                  {selectedItem.inStock && (
                    <View style={styles.quantitySection}>
                      {selectedItem.weightBased ? (
                        // Weight stepper for weight-based items (0.5 lb intervals)
                        <View style={styles.weightStepperContainer}>
                          <Text style={styles.quantityLabel}>
                            Weight ({selectedItem.weightUnit || 'lbs'})
                          </Text>
                          <View style={styles.quantityControls}>
                            <TouchableOpacity
                              style={[styles.quantityButton, selectedWeight <= 0.5 && styles.quantityButtonDisabled]}
                              onPress={() => setSelectedWeight(Math.max(0.5, selectedWeight - 0.5))}
                              disabled={selectedWeight <= 0.5}
                            >
                              <Ionicons name="remove" size={18} color={selectedWeight <= 0.5 ? "#9CA3AF" : "#0F766E"} />
                            </TouchableOpacity>
                            
                            <View style={styles.quantityDisplay}>
                              <Text style={styles.quantityText}>{selectedWeight.toFixed(1)}</Text>
                              <Text style={styles.quantityUnit}>{selectedItem.weightUnit || 'lbs'}</Text>
                            </View>
                            
                            <TouchableOpacity
                              style={[styles.quantityButton, selectedWeight >= 10 && styles.quantityButtonDisabled]}
                              onPress={() => setSelectedWeight(Math.min(10, selectedWeight + 0.5))}
                              disabled={selectedWeight >= 10}
                            >
                              <Ionicons name="add" size={18} color={selectedWeight >= 10 ? "#9CA3AF" : "#0F766E"} />
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.estimatedPrice}>
                            Estimated: ${((selectedItem.pricePerUnit || 0) * selectedWeight).toFixed(2)}
                          </Text>
                        </View>
                      ) : (
                        // Quantity stepper for unit-based items
                        <View style={styles.quantityContainer}>
                          <Text style={styles.quantityLabel}>
                            Quantity
                          </Text>
                          <View style={styles.quantityControls}>
                            <TouchableOpacity
                              style={[styles.quantityButton, selectedQuantity <= 1 && styles.quantityButtonDisabled]}
                              onPress={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                              disabled={selectedQuantity <= 1}
                            >
                              <Ionicons name="remove" size={18} color={selectedQuantity <= 1 ? "#9CA3AF" : "#0F766E"} />
                            </TouchableOpacity>
                            
                            <View style={styles.quantityDisplay}>
                              <Text style={styles.quantityText}>{selectedQuantity}</Text>
                              <Text style={styles.quantityUnit}>{selectedItem.unit}</Text>
                            </View>
                            
                            <TouchableOpacity
                              style={styles.quantityButton}
                              onPress={() => setSelectedQuantity(selectedQuantity + 1)}
                            >
                              <Ionicons name="add" size={18} color="#0F766E" />
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.totalPrice}>
                            Total: ${(selectedItem.price * selectedQuantity).toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  
                  {/* Enhanced Action Section */}
                  <View style={styles.modalActionSection}>
                    {selectedItem.inStock ? (
                      <>
                        {/* Total Price Display */}
                        <View style={styles.modalTotalRow}>
                          <Text style={styles.modalTotalLabel}>Total:</Text>
                          <Text style={styles.modalTotalPrice}>
                            ${selectedItem.weightBased 
                              ? ((selectedItem.pricePerUnit || selectedItem.price) * selectedWeight).toFixed(2)
                              : (selectedItem.price * selectedQuantity).toFixed(2)
                            }
                          </Text>
                        </View>
                        
                        {/* Action Buttons Row */}
                        <View style={styles.modalActionsRow}>
                          <TouchableOpacity
                            style={styles.modalFavoriteButton}
                            onPress={() => handleToggleFavorite(selectedItem)}
                          >
                            <Ionicons
                              name={isFavorite(selectedItem.id) ? 'heart' : 'heart-outline'}
                              size={20}
                              color={isFavorite(selectedItem.id) ? '#E67E52' : '#6B7280'}
                            />
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={styles.modalAddButton}
                            onPress={() => {
                              handleAddToCart(selectedItem);
                              closeModal();
                            }}
                          >
                            <Ionicons name="add" size={18} color="white" />
                            <Text style={styles.modalAddButtonText}>
                              Add {selectedItem.weightBased 
                                ? `${selectedWeight.toFixed(1)}${selectedItem.weightUnit || 'lbs'}` 
                                : `${selectedQuantity} ${selectedQuantity === 1 ? 'item' : 'items'}`
                              } to Cart
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <View style={styles.modalOutOfStockSection}>
                        <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                        <Text style={styles.modalOutOfStockText}>This item is currently out of stock</Text>
                      </View>
                    )}
                  </View>
                </View>
                </ScrollView>
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
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
  },
  itemCard: {
    width: '47%',
    height: 300, // Increased from 260 to give more space
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
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
    flex: 1,
    padding: 12, // Increased padding
    justifyContent: 'space-between',
  },
  itemTextContent: {
    flex: 1,
    marginBottom: 8, // Add space before add to cart button
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    height: 34,
    lineHeight: 17,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F766E',
  },
  itemUnit: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 8,
    paddingVertical: 6,
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
    minHeight: 400, // Add minimum height to ensure visibility
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden', // Ensure content doesn't overflow rounded corners
  },
  modalScrollView: {
    // Remove flex: 1 to allow content to determine size
  },
  modalScrollContent: {
    paddingBottom: 20, // Add padding at bottom
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalBrandSize: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  modalBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modalSize: {
    fontSize: 14,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalEnhancedSection: {
    marginBottom: 16,
  },
  modalDescriptionSection: {
    marginBottom: 16,
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
  modalAddButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  // Simplified pricing styles
  pricingContainer: {
    alignItems: 'flex-start',
  },
  weightRange: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontStyle: 'italic',
  },
  weightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    gap: 3,
  },
  weightBadgeText: {
    fontSize: 10,
    color: '#0F766E',
    fontWeight: '500',
  },
  addButtonWeightBased: {
    backgroundColor: '#0F766E',
  },
  // Modal weight-based pricing styles
  modalWeightBasedPricing: {
    marginBottom: 16,
  },
  modalWeightRange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  modalWeightRangeText: {
    fontSize: 14,
    color: '#0F766E',
    fontWeight: '500',
  },
  modalWeightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  modalWeightBadgeText: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '600',
  },
  modalWeightExplanation: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#0284C7',
  },
  modalWeightExplanationText: {
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  // Quantity selection styles
  quantitySection: {
    marginTop: 16,
    marginBottom: 16,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  // Weight stepper styles (replaces weight input)
  weightStepperContainer: {
    gap: 8,
  },
  estimatedPrice: {
    fontSize: 14,
    color: '#0F766E',
    fontWeight: '600',
    textAlign: 'center',
  },
  // Quantity stepper styles
  quantityContainer: {
    gap: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  quantityButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quantityButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  quantityDisplay: {
    alignItems: 'center',
    minWidth: 80,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  quantityUnit: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F766E',
    textAlign: 'center',
  },
  
  // Enhanced Modal Styles
  modalBrandSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  modalSeparator: {
    fontSize: 14,
    color: '#9CA3AF',
    marginHorizontal: 8,
  },
  modalPriceStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  modalStockContainer: {
    alignItems: 'flex-end',
  },
  modalStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  modalCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  modalDescriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalActionSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  modalTotalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  modalTotalPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F766E',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  modalFavoriteButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAddButton: {
    flex: 1,
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOutOfStockSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  modalOutOfStockText: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '500',
  },
}); 