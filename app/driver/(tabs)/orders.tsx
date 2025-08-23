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
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '../../../context/AuthContext';
import { ordersAPI } from '../../../services/api';

interface AvailableOrder {
  id: string;
  customerName: string;
  itemCount: number;
  estimatedPayout: number;
  deliveryDistance?: number;
  estimatedTime?: number;
  storeName?: string;
  urgency?: string;
  deliveryAddress?: any;
  total: number;
  createdAt: string;
  status?: string;
  driverId?: string;
}

interface ActiveOrder {
  id: string;
  customerName: string;
  status: string;
  progress: number;
  totalItems: number;
  estimatedPayout: number;
  timeElapsed?: number;
  deliveryAddress?: any;
}

interface RecentOrder {
  id: string;
  customerName: string;
  status: string;
  completedAt: string;
  estimatedPayout: number;
  total: number;
}

type SortOption = 'oldest' | 'payout' | 'distance' | 'time' | 'newest';
type FilterOption = 'all' | 'high_pay' | 'nearby' | 'urgent';

export default function DriverOrders() {
  const { user, isOnline } = useAuth();
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [activeOrders, setActiveOrders] = useState<AvailableOrder[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('oldest'); // Default to oldest first
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all order data
  const fetchOrderData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      // Fetch active order
      const activeOrderResponse = await ordersAPI.getActive();
      if (activeOrderResponse.data) {
        const responseData = activeOrderResponse.data as any;
        
        if (responseData.active_order === null) {
          setActiveOrder(null);
        } else {
          const activeOrderData = responseData;
          setActiveOrder({
            id: activeOrderData.id,
            customerName: activeOrderData.customerFirstName || 'Customer',
            status: activeOrderData.status,
            progress: calculateProgress(activeOrderData),
            totalItems: activeOrderData.items?.length || 0,
            estimatedPayout: Number(activeOrderData.estimatedPayout) || 0,
            deliveryAddress: activeOrderData.deliveryAddress,
            timeElapsed: calculateTimeElapsed(activeOrderData.createdAt),
          });
        }
      } else {
        setActiveOrder(null);
      }

      // Fetch orders (could be active orders or available orders based on driver state)
      if (isOnline) {
        const ordersResponse = await ordersAPI.getAvailable();
        
        if (ordersResponse.data) {
          const formattedOrders = (ordersResponse.data as any[]).map((order: any) => ({
            id: order.id,
            customerName: order.customerFirstName || 'Customer',
            itemCount: order.items?.length || 0,
            estimatedPayout: Number(order.estimatedPayout) || 0,
            total: order.total,
            deliveryAddress: order.deliveryAddress,
            createdAt: order.createdAt,
            urgency: getUrgencyFromDate(order.createdAt),
            storeName: order.storeName || 'Store',
            deliveryDistance: order.deliveryDistance || 0,
            estimatedTime: order.estimatedTime || 30,
            status: order.status || 'pending', // Include status to distinguish active vs available
            driverId: order.driverId, // Include driver ID
          }));
          
          // Separate active orders from available orders
          const activeOrdersList = formattedOrders.filter((order: any) => 
            order.driverId && order.status !== 'delivered' && order.status !== 'cancelled'
          );
          const availableOrdersList = formattedOrders.filter((order: any) => 
            !order.driverId && order.status === 'pending'
          );
          
          setActiveOrders(activeOrdersList);
          setAvailableOrders(availableOrdersList);
        }
      } else {
        setAvailableOrders([]);
        setActiveOrders([]);
      }

      // TODO: Fetch recent orders (completed today)
      // For now, setting empty array
      setRecentOrders([]);

    } catch (err) {
      console.error('Failed to fetch order data:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderData();
  }, []);

  // Refresh data when online status changes
  useEffect(() => {
    if (user?.role === 'driver') {
      fetchOrderData(false);
    }
  }, [isOnline]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrderData(false);
    setRefreshing(false);
  };

  // Helper functions
  const getUrgencyFromDate = (createdAt: string): string => {
    const created = new Date(createdAt);
    const now = new Date();
    const hoursSinceCreated = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCreated < 1) return 'ASAP';
    if (hoursSinceCreated < 4) return 'Today';
    return 'Today Evening';
  };

  const calculateProgress = (order: any): number => {
    if (!order.items || order.items.length === 0) return 0;
    
    const processedItems = order.items.filter((item: any) => 
      item.foundQuantity !== null
    ).length;
    
    return Math.min(processedItems, order.items.length);
  };

  const calculateTimeElapsed = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    const minutesElapsed = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    return Math.max(0, minutesElapsed);
  };

  // Sorting and filtering
  const getFilteredOrders = () => {
    let filtered = [...availableOrders];

    // Apply filters
    switch (filterBy) {
      case 'high_pay':
        filtered = filtered.filter(order => order.estimatedPayout >= 15);
        break;
      case 'nearby':
        filtered = filtered.filter(order => (order.deliveryDistance || 0) <= 3);
        break;
      case 'urgent':
        filtered = filtered.filter(order => order.urgency === 'ASAP');
        break;
      default:
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'payout':
        filtered.sort((a, b) => b.estimatedPayout - a.estimatedPayout);
        break;
      case 'distance':
        filtered.sort((a, b) => (a.deliveryDistance || 0) - (b.deliveryDistance || 0));
        break;
      case 'time':
        filtered.sort((a, b) => (a.estimatedTime || 0) - (b.estimatedTime || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        // Default to oldest first if no sort specified
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
    }

    return filtered;
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      if (!isOnline) {
        Alert.alert('Go Online', 'You must be online to accept orders.');
        return;
      }
      
      // Actually accept the order via API
      await ordersAPI.acceptOrder(orderId);
      
      // Refresh the orders list to reflect the change
      await fetchOrderData(false);
      
      // Navigate to the order details
      router.push(`/driver/order/${orderId}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to accept order. Please try again.');
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'ASAP': return '#DC2626';
      case 'Today Evening': return '#EA580C';
      default: return '#059669';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#6B7280';
      case 'shopping': return '#0F766E';
      case 'delivering': return '#7C3AED';
      case 'delivered': return '#059669';
      case 'cancelled': return '#DC2626';
      default: return '#6B7280';
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
      case 'pending': return 'Pending';
      case 'shopping': return 'Shopping';
      case 'delivering': return 'Delivering';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return 'Pending';
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchOrderData()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const filteredOrders = getFilteredOrders();

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Orders</Text>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options" size={20} color="#0F766E" />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Active Order Section */}
          {activeOrder && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🚨 Active Order</Text>
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
                    {activeOrder.progress}/{activeOrder.totalItems} items • {activeOrder.timeElapsed}m elapsed
                  </Text>
                </View>

                <View style={styles.activeOrderFooter}>
                  <View style={styles.earningsInfo}>
                    <Text style={styles.earningsLabel}>Estimated Payout</Text>
                    <Text style={styles.earningsAmount}>${activeOrder.estimatedPayout.toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity style={styles.continueButton}>
                    <Text style={styles.continueButtonText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Active Orders Section - When driver has active orders */}
          {activeOrders.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.activeOrderTitleContainer}>
                  <View style={styles.activeOrderTitleRow}>
                    <Ionicons name="flash" size={20} color="#DC2626" />
                    <Text style={styles.sectionTitle}>Your Active Order</Text>
                  </View>
                  <Text style={styles.activeOrderSubtitle}>Complete to accept more</Text>
                </View>
                <View style={styles.activeOrderBadge}>
                  <Text style={styles.activeOrderBadgeText}>IN PROGRESS</Text>
                </View>
              </View>
              
              {activeOrders.map((order) => (
                <View key={order.id} style={[styles.orderCard, styles.activeOrderCardEnhanced]}>
                  <View style={styles.orderHeader}>
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderId}>#{order.id}</Text>
                      <Text style={styles.customerName}>{order.customerName}</Text>
                    </View>
                    <View style={styles.urgencyBadge}>
                      <View 
                        style={[
                          styles.urgencyDot, 
                          { backgroundColor: getStatusColor(order.status || 'pending') }
                        ]} 
                      />
                      <Text style={styles.urgencyText}>{getStatusText(order.status || 'pending')}</Text>
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
                        {order.deliveryDistance}mi from store to customer
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>~{order.estimatedTime} min total (shop + deliver)</Text>
                    </View>
                  </View>

                  <View style={styles.orderFooter}>
                    <View style={styles.payoutInfo}>
                      <Text style={styles.payoutLabel}>Estimated Payout</Text>
                      <Text style={styles.payoutAmount}>${order.estimatedPayout.toFixed(2)}</Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.continueButton, styles.continueButtonActive]}
                      onPress={() => router.push(`/driver/order/${order.id}`)}
                    >
                      <Text style={[styles.continueButtonText, styles.continueButtonTextActive]}>Continue Order</Text>
                      <Ionicons name="arrow-forward" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Available Orders Section - When driver has no active orders */}
          {activeOrders.length === 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Available Orders ({filteredOrders.length})
                </Text>
                <Text style={styles.sortText}>
                  {sortBy === 'oldest' && 'Oldest First'}
                  {sortBy === 'payout' && 'Highest Pay'}
                  {sortBy === 'distance' && 'Closest'}
                  {sortBy === 'time' && 'Fastest'}
                  {sortBy === 'newest' && 'Newest'}
                </Text>
              </View>
              
              {!isOnline ? (
                <View style={styles.emptyState}>
                  <Ionicons name="power" size={48} color="#6B7280" />
                  <Text style={styles.emptyStateText}>You're Offline</Text>
                  <Text style={styles.emptyStateSubtext}>Go online to see available orders</Text>
                </View>
              ) : filteredOrders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle" size={48} color="#6B7280" />
                  <Text style={styles.emptyStateText}>No orders match your filters</Text>
                  <Text style={styles.emptyStateSubtext}>Try adjusting your filters or check back soon</Text>
                </View>
              ) : (
                filteredOrders.map((order) => (
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
                          { backgroundColor: getUrgencyColor(order.urgency || 'Today') }
                        ]} 
                      />
                      <Text style={styles.urgencyText}>{order.urgency || 'Today'}</Text>
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
                        {order.deliveryDistance}mi from store to customer
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>~{order.estimatedTime} min total (shop + deliver)</Text>
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
          )}

          {/* Recent Orders Section */}
          {recentOrders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Orders (Today)</Text>
              {recentOrders.map((order) => (
                <View key={order.id} style={styles.recentOrderCard}>
                  <View style={styles.recentOrderInfo}>
                    <Text style={styles.recentOrderId}>#{order.id}</Text>
                    <Text style={styles.recentOrderCustomer}>{order.customerName}</Text>
                  </View>
                  <View style={styles.recentOrderStats}>
                    <Text style={styles.recentOrderPayout}>${order.estimatedPayout.toFixed(2)}</Text>
                    <Text style={styles.recentOrderStatus}>Completed</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Filter/Sort Modal */}
        <Modal
          visible={showFilters}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter & Sort Orders</Text>
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Sort By</Text>
                <View style={styles.optionsRow}>
                  {[
                    { key: 'oldest' as SortOption, label: 'Oldest First' },
                    { key: 'payout' as SortOption, label: 'Highest Pay' },
                    { key: 'distance' as SortOption, label: 'Closest' },
                    { key: 'time' as SortOption, label: 'Fastest' },
                    { key: 'newest' as SortOption, label: 'Newest' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.optionButton,
                        sortBy === option.key && styles.optionButtonActive
                      ]}
                      onPress={() => setSortBy(option.key)}
                    >
                      <Text style={[
                        styles.optionText,
                        sortBy === option.key && styles.optionTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Filter By</Text>
                <View style={styles.optionsRow}>
                  {[
                    { key: 'all' as FilterOption, label: 'All Orders' },
                    { key: 'high_pay' as FilterOption, label: 'High Pay ($15+)' },
                    { key: 'nearby' as FilterOption, label: 'Nearby (3mi)' },
                    { key: 'urgent' as FilterOption, label: 'Urgent' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.optionButton,
                        filterBy === option.key && styles.optionButtonActive
                      ]}
                      onPress={() => setFilterBy(option.key)}
                    >
                      <Text style={[
                        styles.optionText,
                        filterBy === option.key && styles.optionTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
        </View>
        </Modal>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingTop: 20,  // Add space from header
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
  },
  // Active Order Title Styles
  activeOrderTitleContainer: {
    flex: 1,
  },
  activeOrderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeOrderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  activeOrderSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
  activeOrderBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  activeOrderBadgeText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  activeOrderCardEnhanced: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    backgroundColor: '#FFFBF0',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 4,
  },
  sortText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Active Order Styles
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
    borderLeftColor: '#DC2626',
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
  continueButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonActive: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonTextActive: {
    fontWeight: 'bold',
  },
  // Available Orders Styles
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
  // Recent Orders Styles
  recentOrderCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recentOrderInfo: {
    flex: 1,
  },
  recentOrderId: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  recentOrderCustomer: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  recentOrderStats: {
    alignItems: 'flex-end',
  },
  recentOrderPayout: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F766E',
    marginBottom: 2,
  },
  recentOrderStatus: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  filterSection: {
    marginBottom: 32,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  optionButtonActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  optionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  optionTextActive: {
    color: 'white',
  },
  applyButton: {
    backgroundColor: '#0F766E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Empty state and loading
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
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 100,
  },
}); 