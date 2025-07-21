import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '../../../context/AuthContext';

// Mock data for demonstration
const mockAvailableOrders = [
  {
    id: 'ORD001',
    customerName: 'Maria Santos',
    itemCount: 12,
    estimatedPayout: 25.50,
    storeDistance: 1.2,
    deliveryDistance: 2.8,
    estimatedTime: 45,
    storeName: 'PayLess Supermarket',
    urgency: 'ASAP',
  },
  {
    id: 'ORD002',
    customerName: 'John Camacho',
    itemCount: 7,
    estimatedPayout: 18.75,
    storeDistance: 0.8,
    deliveryDistance: 1.5,
    estimatedTime: 30,
    storeName: 'Cost-U-Less',
    urgency: 'Today Evening',
  },
  {
    id: 'ORD003',
    customerName: 'Rosa Cruz',
    itemCount: 15,
    estimatedPayout: 32.25,
    storeDistance: 2.1,
    deliveryDistance: 3.2,
    estimatedTime: 60,
    storeName: 'PayLess Supermarket',
    urgency: 'Tomorrow Morning',
  },
];

const mockActiveOrder = {
  id: 'ORD004',
  customerName: 'Ana Perez',
  status: 'shopping',
  progress: 12, // Total quantity found so far
  totalItems: 18, // Total quantity needed
  estimatedPayout: 22.00,
  timeElapsed: 18,
};

export default function DriverDashboard() {
  const { user } = useAuth();
  const [availableOrders, setAvailableOrders] = useState(mockAvailableOrders);
  const [activeOrder, setActiveOrder] = useState(mockActiveOrder);
  const [todayEarnings, setTodayEarnings] = useState(127.50);
  const [todayDeliveries, setTodayDeliveries] = useState(6);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleAcceptOrder = (orderId: string) => {
    Alert.alert(
      'Accept Order',
      'Are you ready to shop for this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => {
            // Remove from available orders
            setAvailableOrders(prev => prev.filter(order => order.id !== orderId));
            // Set as active order
            const acceptedOrder = mockAvailableOrders.find(order => order.id === orderId);
            if (acceptedOrder) {
              setActiveOrder({
                id: acceptedOrder.id,
                customerName: acceptedOrder.customerName,
                status: 'accepted',
                progress: 0,
                totalItems: acceptedOrder.itemCount,
                estimatedPayout: acceptedOrder.estimatedPayout,
                timeElapsed: 0,
              });
              // Navigate to order details
              router.push(`/driver/order/${orderId}`);
            }
          }
        }
      ]
    );
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'ASAP': return '#DC2626';
      case 'Today Evening': return '#EA580C';
      default: return '#059669';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return 'checkmark-circle';
      case 'shopping': return 'storefront';
      case 'checkout': return 'card';
      case 'delivering': return 'car';
      default: return 'time';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted': return 'Ready to Shop';
      case 'shopping': return 'Shopping in Progress';
      case 'checkout': return 'At Store Checkout';
      case 'delivering': return 'Out for Delivery';
      default: return 'Pending';
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.driverName}>{user?.name || 'Driver'}</Text>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Daily Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>${todayEarnings.toFixed(2)}</Text>
                <Text style={styles.summaryLabel}>Earnings</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{todayDeliveries}</Text>
                <Text style={styles.summaryLabel}>Deliveries</Text>
              </View>
            </View>
          </View>

          {/* Active Order */}
          {activeOrder && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active Order</Text>
              <TouchableOpacity 
                style={styles.activeOrderCard}
                onPress={() => router.push(`/driver/order/${activeOrder.id}`)}
              >
                <View style={styles.activeOrderHeader}>
                  <View style={styles.activeOrderInfo}>
                    <Text style={styles.activeOrderId}>#{activeOrder.id}</Text>
                    <Text style={styles.activeOrderCustomer}>{activeOrder.customerName}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Ionicons 
                      name={getStatusIcon(activeOrder.status) as any} 
                      size={16} 
                      color="#0F766E" 
                    />
                    <Text style={styles.statusText}>{getStatusText(activeOrder.status)}</Text>
                  </View>
                </View>
                
                <View style={styles.progressSection}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${(activeOrder.progress / activeOrder.totalItems) * 100}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {activeOrder.progress}/{activeOrder.totalItems} items
                  </Text>
                </View>

                <View style={styles.activeOrderFooter}>
                  <View style={styles.earningsInfo}>
                    <Text style={styles.earningsLabel}>Estimated Payout</Text>
                    <Text style={styles.earningsAmount}>${activeOrder.estimatedPayout.toFixed(2)}</Text>
                  </View>
                  <View style={styles.timeInfo}>
                    <Ionicons name="time" size={16} color="#6B7280" />
                    <Text style={styles.timeText}>{activeOrder.timeElapsed}m</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Available Orders */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Orders</Text>
            {availableOrders.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={48} color="#6B7280" />
                <Text style={styles.emptyStateText}>No orders available</Text>
                <Text style={styles.emptyStateSubtext}>New orders will appear here</Text>
              </View>
            ) : (
              availableOrders.map((order) => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderId}>#{order.id}</Text>
                      <Text style={styles.customerName}>{order.customerName}</Text>
                    </View>
                    <View style={styles.urgencyBadge}>
                      <View 
                        style={[
                          styles.urgencyDot, 
                          { backgroundColor: getUrgencyColor(order.urgency) }
                        ]} 
                      />
                      <Text style={styles.urgencyText}>{order.urgency}</Text>
                    </View>
                  </View>

                  <View style={styles.orderDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="list" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>{order.itemCount} items</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="storefront" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>{order.storeName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="location" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>
                        {order.storeDistance}mi to store, {order.deliveryDistance}mi to customer
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>~{order.estimatedTime} minutes</Text>
                    </View>
                  </View>

                  <View style={styles.orderFooter}>
                    <View style={styles.payoutInfo}>
                      <Text style={styles.payoutLabel}>Estimated Payout</Text>
                      <Text style={styles.payoutAmount}>${order.estimatedPayout.toFixed(2)}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.acceptButton}
                      onPress={() => handleAcceptOrder(order.id)}
                    >
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Bottom Spacing for tabs */}
          <View style={styles.bottomSpacing} />
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
  greeting: {
    fontSize: 16,
    color: '#6B7280',
  },
  driverName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F766E',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  activeOrderCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#0F766E',
  },
  activeOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeOrderInfo: {
    flex: 1,
  },
  activeOrderId: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  activeOrderCustomer: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0F766E',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  activeOrderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsInfo: {
    flex: 1,
  },
  earningsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F766E',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  orderCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  orderDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payoutInfo: {
    flex: 1,
  },
  payoutLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F766E',
  },
  acceptButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  bottomSpacing: {
    height: 100, // Increased for new tab height
  },
}); 