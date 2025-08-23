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
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { Item } from '../../types';
import SimpleImage from '../../components/shared/SimpleImage';

export default function FavoritesScreen() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { favorites, removeFromFavorites, syncFavorites } = useFavorites();
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal state for weight/quantity selection
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedWeight, setSelectedWeight] = useState(0.5);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

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
    
    // For weight-based items, open modal for weight selection
    if (item.weightBased) {
      openModal(item);
      return;
    }
    
    // For unit-based items, add directly with quantity 1
    addItem(item, 1);
  };

  const handleModalAddToCart = (item: Item) => {
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
    } else {
      // Add unit-based item with selected quantity
      addItem(item, selectedQuantity);
    }
    
    closeModal();
  };

  const openModal = (item: Item) => {
    setSelectedItem(item);
    setModalVisible(true);
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
      <SimpleImage 
        src={item.imageUrl} 
        style={styles.itemImage}
        accessibilityLabel={`${item.name} favorite item image`}
      />
      
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>
          ${(item.pricePerUnit || item.price).toFixed(2)} per {item.weightUnit || item.unit}
        </Text>
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

      {/* Weight/Quantity Selection Modal - Using Catalog Design */}
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
                
                <SimpleImage 
                  src={selectedItem.imageUrl} 
                  style={styles.modalImage}
                  accessibilityLabel={`${selectedItem.name} detailed image`}
                />
                
                <View style={styles.modalInfo}>
                  <Text style={styles.modalTitle}>{selectedItem.name}</Text>
                  
                  {/* Simplified pricing display */}
                  <View style={styles.modalPriceRow}>
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
                  
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[
                        styles.modalAddButton,
                        !selectedItem.inStock && styles.modalAddButtonDisabled
                      ]}
                      onPress={() => {
                        if (selectedItem.inStock) {
                          handleModalAddToCart(selectedItem);
                        }
                      }}
                      disabled={!selectedItem.inStock}
                    >
                      <Ionicons name="add" size={20} color="white" />
                      <Text style={styles.modalAddButtonText}>
                        {selectedItem.weightBased 
                          ? `Add ${selectedWeight.toFixed(1)} ${selectedItem.weightUnit || 'lbs'}`
                          : `Add ${selectedQuantity} to Cart`
                        }
                      </Text>
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
  // Modal styles - Copied from catalog for consistency
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
  // Weight stepper styles
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
}); 