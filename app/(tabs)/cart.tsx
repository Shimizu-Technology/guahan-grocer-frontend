import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { CartItem } from '../../types';
import SimpleImage from '../../components/shared/SimpleImage';

export default function CartScreen() {
  const { user } = useAuth();
  const { items, total, updateQuantity, removeItem, clearCart, updateWeight } = useCart();
  
  // No longer need weight modal state - using inline steppers

  const handleQuantityChange = (itemId: string, change: number) => {
    const item = items.find(item => item.item.id === itemId);
    if (item) {
      const newQuantity = item.quantity + change;
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleWeightChange = (itemId: string, change: number) => {
    const item = items.find(item => item.item.id === itemId);
    if (item && item.item.weightBased) {
      const currentWeight = item.selectedWeight || 0.5; // Default to 0.5 if no weight selected
      const newWeight = Math.max(0.5, currentWeight + change); // Minimum 0.5 lb
      
      // Check weight limits
      if (item.item.minWeight && newWeight < item.item.minWeight) {
        Alert.alert('Weight Too Low', `Minimum weight is ${item.item.minWeight} ${item.item.weightUnit}`);
        return;
      }
      if (item.item.maxWeight && newWeight > item.item.maxWeight) {
        Alert.alert('Weight Too High', `Maximum weight is ${item.item.maxWeight} ${item.item.weightUnit}`);
        return;
      }
      
      updateWeight(itemId, newWeight);
    }
  };

  const handleRemoveItem = (itemId: string, itemName: string) => {
    Alert.alert(
      'Remove Item',
      `Remove ${itemName} from your cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeItem(itemId) }
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearCart }
      ]
    );
  };

  // Weight modal functions removed - using inline steppers now

  const calculateEstimatedPrice = (item: CartItem): number => {
    if (!item.item.weightBased) {
      return item.item.price * item.quantity;
    }
    
    if (item.selectedWeight && item.item.pricePerUnit) {
      return item.item.pricePerUnit * item.selectedWeight * item.quantity;
    }
    
    // Fallback to base price if weight not selected
    return item.item.price * item.quantity;
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Cart Empty', 'Add some items to your cart before checking out.');
      return;
    }
    
    if (!user) {
      Alert.alert(
        'Sign In Required', 
        'Please sign in to continue with your order.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    
    router.push('/checkout');
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.itemCard}>
      <SimpleImage 
        src={item.item.imageUrl} 
        style={styles.itemImage}
        accessibilityLabel={`${item.item.name} cart item image`}
      />
      
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.item.name}</Text>
        
        {/* Weight-based pricing display */}
        {item.item.weightBased ? (
          <View style={styles.weightBasedInfo}>
            <View style={styles.priceRow}>
              <Text style={styles.itemPrice}>
                ${item.item.pricePerUnit?.toFixed(2) || item.item.price.toFixed(2)} per {item.item.weightUnit || item.item.unit}
              </Text>
              <View style={styles.weightBadge}>
                <Ionicons name="scale-outline" size={10} color="#0F766E" />
                <Text style={styles.weightBadgeText}>Weight-based</Text>
              </View>
            </View>
            
            <View style={styles.selectedWeightInfo}>
              <Text style={styles.selectedWeightText}>
                Weight: {item.selectedWeight || 0.5} {item.item.weightUnit}
              </Text>
              <Text style={styles.estimatedPriceText}>
                Estimated: ${item.estimatedPrice?.toFixed(2) || (item.item.pricePerUnit! * (item.selectedWeight || 0.5)).toFixed(2)}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.itemPrice}>${item.item.price.toFixed(2)} per {item.item.unit}</Text>
        )}
        
        {/* Quantity/Weight Controls */}
        {item.item.weightBased ? (
          <View style={styles.weightContainer}>
            <Text style={styles.weightLabel}>Weight ({item.item.weightUnit})</Text>
            <View style={styles.weightStepperContainer}>
              <TouchableOpacity
                style={styles.weightStepperButton}
                onPress={() => handleWeightChange(item.item.id, -0.5)}
              >
                <Ionicons name="remove" size={16} color="#0F766E" />
              </TouchableOpacity>
              
              <Text style={styles.weightValue}>
                {(item.selectedWeight || 0.5).toFixed(1)}
              </Text>
              
              <TouchableOpacity
                style={styles.weightStepperButton}
                onPress={() => handleWeightChange(item.item.id, 0.5)}
              >
                <Ionicons name="add" size={16} color="#0F766E" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleQuantityChange(item.item.id, -1)}
            >
              <Ionicons name="remove" size={16} color="#0F766E" />
            </TouchableOpacity>
            
            <Text style={styles.quantity}>{item.quantity}</Text>
            
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleQuantityChange(item.item.id, 1)}
            >
              <Ionicons name="add" size={16} color="#0F766E" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <View style={styles.itemRight}>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveItem(item.item.id, item.item.name)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
        
        <Text style={styles.itemTotal}>
          ${calculateEstimatedPrice(item).toFixed(2)}
        </Text>
      </View>
    </View>
  );

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <Text style={styles.headerSubtitle}>Your cart is empty</Text>
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="bag-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyDescription}>
            Add some products to get started
          </Text>
          
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/catalog')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        <Text style={styles.headerSubtitle}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </Text>
        
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearButton}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Cart Summary */}
      <View style={styles.cartSummary}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
        >
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Weight modal removed - using inline steppers */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  clearButton: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
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
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemPrice: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityButton: {
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#0F766E',
  },
  quantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  // Weight stepper styles
  weightContainer: {
    marginTop: 8,
  },
  weightLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  weightStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  weightStepperButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0F766E',
  },
  weightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginHorizontal: 12,
    minWidth: 40,
    textAlign: 'center',
  },
  itemRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 60,
  },
  removeButton: {
    padding: 4,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F766E',
  },
  cartSummary: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F766E',
  },
  checkoutButton: {
    backgroundColor: '#0F766E',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 18,
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
    marginBottom: 32,
  },
  shopButton: {
    backgroundColor: '#0F766E',
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  shopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Weight-based cart item styles
  weightBasedInfo: {
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  weightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  weightBadgeText: {
    fontSize: 9,
    color: '#0F766E',
    fontWeight: '500',
  },
  selectedWeightInfo: {
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  selectedWeightText: {
    fontSize: 13,
    color: '#0369A1',
    fontWeight: '600',
  },
  estimatedPriceText: {
    fontSize: 12,
    color: '#0284C7',
    marginTop: 2,
  },
  // Removed modal-related styles - using inline steppers now
}); 