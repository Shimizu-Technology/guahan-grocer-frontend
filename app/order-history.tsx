import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';

import { useAuth } from '../context/AuthContext';
import { ordersAPI } from '../services/api';

interface OrderItem {
  id: string;
  itemId: string;
  item: {
    id: string;
    name: string;
    price: number;
    unit: string;
  };
  quantity: number;
  price: number;
  status: string;
}

interface Order {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  tipAmount: number;
  createdAt: string;
  deliveryAddress: any;
  deliveryTime: string;
  deliveryInstructions?: string;
  eta: number;
  items: OrderItem[];
}

export default function OrderHistoryScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's orders
  const fetchOrders = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await ordersAPI.getAll();
      
      if (response.data) {
        const formattedOrders: Order[] = (response.data as any[]).map((order: any) => ({
          id: order.id,
          status: order.status,
          total: parseFloat(order.total || 0),
          subtotal: parseFloat(order.subtotal || 0),
          deliveryFee: parseFloat(order.deliveryFee || 0),
          tipAmount: parseFloat(order.tipAmount || 0),
          createdAt: order.createdAt,
          deliveryAddress: order.deliveryAddress,
          deliveryTime: order.deliveryTime || 'ASAP',
          deliveryInstructions: order.deliveryInstructions,
          eta: order.eta || 45,
          items: order.items || []
        }));

        // Sort by newest first
        formattedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(formattedOrders);
      } else {
        setError(response.error || 'Failed to load orders');
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatAddress = (address: any) => {
    if (!address) return 'No address';
    
    const parts = [
      address.streetAddress,
      address.city,
      address.state,
      address.zipCode
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Order Placed',
          color: '#3B82F6',
          bgColor: '#EFF6FF',
          icon: 'time-outline'
        };
      case 'shopping':
        return {
          label: 'Shopping',
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          icon: 'basket-outline'
        };
      case 'delivering':
        return {
          label: 'Out for Delivery',
          color: '#8B5CF6',
          bgColor: '#F3E8FF',
          icon: 'car-outline'
        };
      case 'delivered':
        return {
          label: 'Delivered',
          color: '#059669',
          bgColor: '#ECFDF5',
          icon: 'checkmark-circle-outline'
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          color: '#DC2626',
          bgColor: '#FEF2F2',
          icon: 'close-circle-outline'
        };
      default:
        return {
          label: status,
          color: '#6B7280',
          bgColor: '#F3F4F6',
          icon: 'help-circle-outline'
        };
    }
  };

  const handleOrderPress = (order: Order) => {
    router.push(`/order-detail/${order.id}`);
  };

  const renderOrderCard = (order: Order) => {
    const statusInfo = getStatusInfo(order.status);
    const itemCount = order.items.length;

    return (
      <TouchableOpacity
        key={order.id}
        style={styles.orderCard}
        onPress={() => handleOrderPress(order)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderTitleContainer}>
            <Text style={styles.orderId}>Order #{order.id}</Text>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Ionicons name={statusInfo.icon as any} size={16} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.orderDetails}>
          <View style={styles.orderInfo}>
            <Text style={styles.itemCount}>
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.deliveryTime}>
              Delivery: {order.deliveryTime}
            </Text>
          </View>
          <Text style={styles.deliveryAddress}>
            📍 {formatAddress(order.deliveryAddress)}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.orderFooter}>
          <View style={styles.priceBreakdown}>
            <Text style={styles.priceLabel}>Total</Text>
            <Text style={styles.totalPrice}>${order.total.toFixed(2)}</Text>
          </View>
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order History</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={styles.loadingText}>Loading your orders...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order History</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchOrders()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order History</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptySubtitle}>
              When you place your first order, it will appear here.
            </Text>
            <TouchableOpacity
              style={styles.startShoppingButton}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.startShoppingText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View style={styles.ordersContainer}>
              {orders.map(renderOrderCard)}
            </View>
            <View style={styles.bottomSpacing} />
          </ScrollView>
        )}
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  ordersContainer: {
    padding: 20,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderTitleContainer: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    marginBottom: 12,
  },
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemCount: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  deliveryTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  deliveryAddress: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceBreakdown: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F766E',
  },
  arrowContainer: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
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
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  startShoppingButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  startShoppingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 32,
  },
}); 