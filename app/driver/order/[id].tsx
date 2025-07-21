import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { useAuth } from '../../../context/AuthContext';
import { mockItems } from '../../../data/mockData';
import { Item } from '../../../types';

// Extended item type for shopping
interface OrderItem extends Item {
  quantity: number;
  foundQuantity: number | null; // null = not checked yet, 0 = none found, 1+ = partial/full found
  notes: string;
}

// Order type
interface OrderData {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryInstructions: string;
  storeName: string;
  storeAddress: string;
  estimatedPayout: number;
  deliveryFee: number;
  urgency: string;
  status: string;
  acceptedAt: string;
  items: OrderItem[];
}

// Mock order data based on ID
const getOrderById = (id: string): OrderData => {
  const baseOrder = {
    id,
    customerName: 'Maria Santos',
    customerPhone: '(671) 555-0123',
    customerAddress: '123 Chalan San Antonio, Tamuning, GU 96913',
    deliveryInstructions: 'Leave at front door, ring doorbell',
    storeName: 'PayLess Supermarket',
    storeAddress: '1210 Pale San Vitores Rd, Tumon, GU 96913',
    estimatedPayout: 25.50,
    deliveryFee: 2.99,
    urgency: 'ASAP',
    status: 'accepted',
    acceptedAt: new Date().toISOString(),
  };

  // Mock items for this order
  const orderItems: OrderItem[] = mockItems.slice(0, 5).map((item, index) => ({
    ...item,
    quantity: [2, 1, 3, 1, 2][index] || 1,
    foundQuantity: null,
    notes: ''
  }));

  return { ...baseOrder, items: orderItems };
};

export default function DriverOrderDetails() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<OrderData>(getOrderById(id as string));
  const [currentStep, setCurrentStep] = useState<'details' | 'shopping' | 'checkout' | 'delivering'>('details');

  const handleStartShopping = () => {
    Alert.alert(
      'Start Shopping',
      'Ready to head to the store and start shopping?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Start Shopping',
          onPress: () => {
            setCurrentStep('shopping');
            setOrder(prev => ({ ...prev, status: 'shopping' }));
          }
        }
      ]
    );
  };

  const handleItemStatus = (itemId: string, foundQuantity: number, notes?: string) => {
    setOrder(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId
          ? { ...item, foundQuantity, notes: notes || '' }
          : item
      )
    }));
  };

  const handleCompleteItem = (itemId: string) => {
    // Prevent interaction if shopping hasn't started
    if (currentStep === 'details') {
      Alert.alert(
        'Start Shopping First',
        'Please tap "Start Shopping" to begin marking items as found or not found.',
        [{ text: 'OK' }]
      );
      return;
    }

    const item = order.items.find(i => i.id === itemId);
    if (!item) return;
    
    if (item.quantity === 1) {
      // Simple case: single item
      if (item.foundQuantity === null) {
        Alert.alert(
          'Mark Item Status',
          `Did you find ${item.name}?`,
          [
            {
              text: 'Not Found',
              style: 'destructive',
              onPress: () => handleItemStatus(itemId, 0)
            },
            {
              text: 'Found It',
              onPress: () => handleItemStatus(itemId, 1)
            }
          ]
        );
      } else {
        // Toggle between found and not found
        handleItemStatus(itemId, item.foundQuantity === 0 ? 1 : 0);
      }
    } else {
      // Multiple items: show quantity picker
      showQuantityPicker(item);
    }
  };

  const showQuantityPicker = (item: OrderItem) => {
    const buttons = [];
    
    // Add "None Found" option
    buttons.push({
      text: 'None Found (0)',
      style: 'destructive' as const,
      onPress: () => handleItemStatus(item.id, 0)
    });

    // Add quantity options (1 to item.quantity)
    for (let i = 1; i <= item.quantity; i++) {
      buttons.push({
        text: i === item.quantity ? `All Found (${i})` : `Found ${i}`,
        onPress: () => handleItemStatus(item.id, i)
      });
    }

    // Add cancel option
    buttons.push({
      text: 'Cancel',
      style: 'cancel' as const
    });

    Alert.alert(
      'How many did you find?',
      `${item.name} (Need ${item.quantity})`,
      buttons
    );
  };

  const handleSubstitution = (itemId: string) => {
    // Prevent interaction if shopping hasn't started
    if (currentStep === 'details') {
      Alert.alert(
        'Start Shopping First',
        'Please tap "Start Shopping" to begin shopping and handle substitutions.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Substitution Needed',
      'This feature will allow communication with customer for substitutions.',
      [{ text: 'OK' }]
    );
  };

  const getItemStatusIcon = (item: OrderItem) => {
    if (item.foundQuantity === null) return { name: 'ellipse-outline', color: '#6B7280' };
    if (item.foundQuantity === 0) return { name: 'close-circle', color: '#DC2626' };
    if (item.foundQuantity === item.quantity) return { name: 'checkmark-circle', color: '#059669' };
    return { name: 'checkmark-circle', color: '#EA580C' }; // Partial found (orange)
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted': return 'Order Accepted';
      case 'shopping': return 'Shopping in Progress';
      case 'checkout': return 'At Store Checkout';
      case 'delivering': return 'Out for Delivery';
      default: return 'Pending';
    }
  };

  const completedItems = order.items.filter(item => item.foundQuantity !== null).length;
  
  // Calculate actual quantities found vs needed
  const totalQuantityNeeded = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalQuantityFound = order.items.reduce((sum, item) => {
    return sum + (item.foundQuantity || 0);
  }, 0);
  
  const foundItems = order.items.filter(item => item.foundQuantity !== null && item.foundQuantity > 0).length;
  const totalItems = order.items.length;

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.orderTitle}>Order #{order.id}</Text>
            <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
          </View>
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons name="help-circle" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Progress Card */}
          {currentStep === 'shopping' && (
            <View style={styles.section}>
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Shopping Progress</Text>
                  <Text style={styles.progressText}>{totalQuantityFound}/{totalQuantityNeeded} items found</Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${totalQuantityNeeded > 0 ? (totalQuantityFound / totalQuantityNeeded) * 100 : 0}%` }
                    ]} 
                  />
                </View>
              </View>
            </View>
          )}

          {/* Customer Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            <View style={styles.customerCard}>
              <View style={styles.customerHeader}>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{order.customerName}</Text>
                  <Text style={styles.customerPhone}>{order.customerPhone}</Text>
                </View>
                <TouchableOpacity style={styles.callButton}>
                  <Ionicons name="call" size={20} color="white" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.addressSection}>
                <View style={styles.addressRow}>
                  <Ionicons name="location" size={16} color="#6B7280" />
                  <Text style={styles.addressText}>{order.customerAddress}</Text>
                </View>
                {order.deliveryInstructions && (
                  <View style={styles.instructionsRow}>
                    <Ionicons name="information-circle" size={16} color="#6B7280" />
                    <Text style={styles.instructionsText}>{order.deliveryInstructions}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Store Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Store Information</Text>
            <View style={styles.storeCard}>
              <View style={styles.storeHeader}>
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{order.storeName}</Text>
                  <Text style={styles.storeAddress}>{order.storeAddress}</Text>
                </View>
                <TouchableOpacity style={styles.directionsButton}>
                  <Ionicons name="navigate" size={20} color="#0F766E" />
                  <Text style={styles.directionsText}>Directions</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Shopping List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shopping List</Text>
            {order.items.map((item) => {
              const statusIcon = getItemStatusIcon(item);
              const isFullyFound = item.foundQuantity === item.quantity;
              const isNotFound = item.foundQuantity === 0;
              const isPartiallyFound = item.foundQuantity !== null && item.foundQuantity > 0 && item.foundQuantity < item.quantity;
              
              const isShoppingStarted = currentStep !== 'details';
              
              return (
                <View key={item.id} style={[
                  styles.itemCard,
                  !isShoppingStarted && styles.itemCardDisabled
                ]}>
                  <Image source={{ uri: item.imageUrl }} style={[
                    styles.itemImage,
                    !isShoppingStarted && styles.itemImageDisabled
                  ]} />
                  
                  <View style={styles.itemDetails}>
                    <Text style={[
                      styles.itemName,
                      !isShoppingStarted && styles.itemTextDisabled
                    ]}>{item.name}</Text>
                    <Text style={[
                      styles.itemCategory,
                      !isShoppingStarted && styles.itemTextDisabled
                    ]}>{item.category}</Text>
                    <Text style={[
                      styles.itemPrice,
                      !isShoppingStarted && styles.itemTextDisabled
                    ]}>
                      ${item.price} • Qty: {item.quantity}
                      {item.foundQuantity !== null && (
                        <Text style={{ color: isNotFound ? '#DC2626' : isPartiallyFound ? '#EA580C' : '#059669' }}>
                          {' '}• Found: {item.foundQuantity}
                        </Text>
                      )}
                    </Text>
                  </View>

                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        isFullyFound && styles.statusButtonFound,
                        isNotFound && styles.statusButtonNotFound,
                        isPartiallyFound && styles.statusButtonPartial,
                        !isShoppingStarted && styles.statusButtonDisabled,
                      ]}
                      onPress={() => handleCompleteItem(item.id)}
                    >
                      <Ionicons 
                        name={statusIcon.name as any} 
                        size={24} 
                        color={!isShoppingStarted ? '#D1D5DB' : statusIcon.color} 
                      />
                    </TouchableOpacity>

                    {currentStep === 'shopping' && (
                      <TouchableOpacity
                        style={styles.substitutionButton}
                        onPress={() => handleSubstitution(item.id)}
                      >
                        <Ionicons name="swap-horizontal" size={16} color="#0F766E" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Earnings Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
            <View style={styles.earningsCard}>
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Base Pay</Text>
                <Text style={styles.earningsAmount}>${(order.estimatedPayout - order.deliveryFee).toFixed(2)}</Text>
              </View>
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Delivery Fee</Text>
                <Text style={styles.earningsAmount}>${order.deliveryFee.toFixed(2)}</Text>
              </View>
              <View style={styles.earningsDivider} />
              <View style={styles.earningsRow}>
                <Text style={styles.totalLabel}>Total Estimated</Text>
                <Text style={styles.totalAmount}>${order.estimatedPayout.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Action Button */}
        <View style={styles.actionFooter}>
          {currentStep === 'details' && (
            <View>
              <View style={styles.startShoppingInfo}>
                <Text style={styles.startShoppingTitle}>Ready to Shop?</Text>
                <Text style={styles.startShoppingText}>
                  Review the order details above, then tap "Start Shopping" to head to the store and begin marking items as found.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleStartShopping}
              >
                <Ionicons name="storefront" size={20} color="white" style={styles.buttonIcon} />
                <Text style={styles.actionButtonText}>Start Shopping</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentStep === 'shopping' && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => Alert.alert('Contact Customer', 'Customer communication feature coming next!')}
              >
                <Ionicons name="chatbubbles" size={20} color="#0F766E" style={styles.buttonIcon} />
                <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Contact Customer</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.primaryButton,
                  completedItems < totalItems && styles.actionButtonDisabled
                ]}
                onPress={() => {
                  if (completedItems < totalItems) {
                    Alert.alert('Shopping Incomplete', 'Please check all items before proceeding to checkout.');
                  } else {
                    const itemsSummary = order.items.map(item => 
                      `${item.name}: ${item.foundQuantity}/${item.quantity}`
                    ).join('\n');
                    
                    Alert.alert(
                      'Proceed to Checkout', 
                      `Ready to checkout with:\n\n${itemsSummary}\n\nContinue to store checkout?`,
                      [
                        { text: 'Review Items', style: 'cancel' },
                        { text: 'Proceed to Checkout', onPress: () => Alert.alert('Checkout', 'Checkout flow coming next!') }
                      ]
                    );
                  }
                }}
                disabled={completedItems < totalItems}
                              >
                  <Ionicons name="card" size={20} color="white" style={styles.buttonIcon} />
                  <Text style={styles.actionButtonText}>Proceed to Checkout</Text>
                </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusText: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '600',
  },
  helpButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  progressCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0F766E',
    borderRadius: 4,
  },
  customerCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  callButton: {
    backgroundColor: '#0F766E',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressSection: {
    gap: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    lineHeight: 20,
  },
  instructionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  storeCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 14,
    color: '#6B7280',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  directionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F766E',
  },
  itemCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  itemCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  itemImageDisabled: {
    opacity: 0.7,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#0F766E',
    fontWeight: '600',
  },
  itemTextDisabled: {
    color: '#9CA3AF',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  statusButtonFound: {
    backgroundColor: '#F0FDF4',
  },
  statusButtonNotFound: {
    backgroundColor: '#FEF2F2',
  },
  statusButtonPartial: {
    backgroundColor: '#FEF3E6',
  },
  statusButtonDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.5,
  },
  substitutionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
  },
  earningsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningsLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  earningsAmount: {
    fontSize: 14,
    color: '#1F2937',
  },
  earningsDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F766E',
  },
  bottomSpacing: {
    height: 100,
  },
  actionFooter: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  startShoppingInfo: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  startShoppingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  startShoppingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    minHeight: 52,
  },
  buttonIcon: {
    marginRight: 8,
  },
  secondaryButton: {
    backgroundColor: '#F0FDFA',
    borderWidth: 2,
    borderColor: '#0F766E',
    paddingVertical: 14, // Adjust for border
  },
  primaryButton: {
    flex: 2,
  },
  actionButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#0F766E',
  },
}); 