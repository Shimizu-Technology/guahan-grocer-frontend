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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '../../../context/AuthContext';
import { ordersAPI, driverStatsAPI } from '../../../services/api';

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

export default function DriverDashboard() {
  const { user, isOnline, toggleOnline } = useAuth();
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [todayTips, setTodayTips] = useState(0);
  const [todayBasePay, setTodayBasePay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all driver data
  const fetchDriverData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

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
            status: order.status || 'pending',
            driverId: order.driverId,
          }));
          
          // Check if any orders are active orders (assigned to this driver)
          const activeOrdersList = formattedOrders.filter((order: any) => 
            order.driverId && order.status !== 'delivered' && order.status !== 'cancelled'
          );
          const availableOrdersList = formattedOrders.filter((order: any) => 
            !order.driverId && order.status === 'pending'
          );
          
          // Set active order from the list if exists
          if (activeOrdersList.length > 0) {
            const activeOrderData = activeOrdersList[0];
            setActiveOrder({
              id: activeOrderData.id,
              customerName: activeOrderData.customerName,
              status: activeOrderData.status,
              progress: 0, // Will be calculated if needed
              totalItems: activeOrderData.itemCount,
              estimatedPayout: activeOrderData.estimatedPayout,
              deliveryAddress: activeOrderData.deliveryAddress,
              timeElapsed: calculateTimeElapsed(activeOrderData.createdAt),
            });
            setAvailableOrders([]); // Don't show available orders when driver has active order
          } else {
            setActiveOrder(null);
            setAvailableOrders(availableOrdersList);
          }
        }
      } else {
        setAvailableOrders([]);
        setActiveOrder(null);
      }

      // Fetch today's driver stats
      const today = new Date().toISOString().split('T')[0];
      const statsResponse = await driverStatsAPI.getStatsForDate(today);
      if (statsResponse.data) {
        const stats = statsResponse.data as any;
        setTodayEarnings(stats.totalEarnings || 0);
        setTodayDeliveries(stats.totalDeliveries || 0);
        setTodayTips(stats.tips || 0);
        setTodayBasePay(stats.basePay || 0);
      }

    } catch (err) {
      console.error('Failed to fetch driver data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDriverData();
  }, []);

  // Refresh data when online status changes
  useEffect(() => {
    if (user?.role === 'driver') {
      fetchDriverData(false);
    }
  }, [isOnline]);

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDriverData(false);
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
    
    // Count items that have been processed (found, substituted, or unavailable)
    const processedItems = order.items.filter((item: any) => 
      item.status && ['found', 'substituted', 'unavailable'].includes(item.status)
    ).length;
    
    return Math.min(processedItems, order.items.length);
  };

  const calculateTimeElapsed = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    const minutesElapsed = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    return Math.max(0, minutesElapsed);
  };

  const handleToggleOnline = async () => {
    try {
      await toggleOnline();
      // Data will be refreshed automatically by useEffect watching isOnline
    } catch (error) {
      Alert.alert('Error', 'Failed to change online status. Please try again.');
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      if (!isOnline) {
        Alert.alert('Go Online', 'You must be online to accept orders.');
        return;
      }
      // Use the new accept order API
      await ordersAPI.acceptOrder(orderId);
      router.push(`/driver/order/${orderId}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to accept order. Please try again.');
    }
  };

  const handleContinueOrder = () => {
    if (activeOrder) {
      router.push(`/driver/order/${activeOrder.id}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchDriverData()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Ionicons name="cash" size={24} color="#0F766E" />
                <Text style={styles.summaryValue}>${todayBasePay.toFixed(2)}</Text>
                <Text style={styles.summaryLabel}>Base Pay</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="heart" size={24} color="#DC2626" />
                <Text style={styles.summaryValue}>${todayTips.toFixed(2)}</Text>
                <Text style={styles.summaryLabel}>Tips</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="analytics" size={24} color="#7C3AED" />
                <Text style={styles.summaryValue}>
                  ${todayDeliveries > 0 ? (todayEarnings / todayDeliveries).toFixed(2) : '0.00'}
                </Text>
                <Text style={styles.summaryLabel}>Avg per Order</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="bag" size={24} color="#EA580C" />
                <Text style={styles.summaryValue}>{todayDeliveries}</Text>
                <Text style={styles.summaryLabel}>Total Deliveries</Text>
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

          {/* Available Work Summary - Only show when no active order */}
          {!activeOrder && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Work</Text>
            {!isOnline ? (
              <View style={styles.workSummaryCard}>
                <View style={styles.emptyWorkState}>
                  <Ionicons name="power" size={32} color="#6B7280" />
                  <Text style={styles.emptyWorkText}>You're Offline</Text>
                  <Text style={styles.emptyWorkSubtext}>Go online to see available orders</Text>
                  <TouchableOpacity 
                    style={styles.goOnlineButton}
                    onPress={handleToggleOnline}
                  >
                    <Text style={styles.goOnlineButtonText}>Go Online</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : availableOrders.length === 0 ? (
              <View style={styles.workSummaryCard}>
                <View style={styles.emptyWorkState}>
                  <Ionicons name="checkmark-circle" size={32} color="#6B7280" />
                  <Text style={styles.emptyWorkText}>No orders available</Text>
                  <Text style={styles.emptyWorkSubtext}>You're all caught up!</Text>
                </View>
              </View>
            ) : (
              <View style={styles.workSummaryCard}>
                <View style={styles.workStatsRow}>
                  <View style={styles.workStat}>
                    <Text style={styles.workStatValue}>{availableOrders.length}</Text>
                    <Text style={styles.workStatLabel}>Orders Available</Text>
                  </View>
                  <View style={styles.workStat}>
                    <Text style={styles.workStatValue}>
                      ${availableOrders.length > 0 ? Math.max(...availableOrders.map(o => o.estimatedPayout)).toFixed(2) : '0.00'}
                    </Text>
                    <Text style={styles.workStatLabel}>Best Payout</Text>
                  </View>
                  <View style={styles.workStat}>
                    <Text style={styles.workStatValue}>
                      {availableOrders.length > 0 ? 
                        Math.round(availableOrders.reduce((acc, o) => acc + (o.deliveryDistance || 0), 0) / availableOrders.length * 10) / 10 : 0}mi
                    </Text>
                    <Text style={styles.workStatLabel}>Avg Distance</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.viewAllOrdersButton}
                  onPress={() => router.push('/driver/(tabs)/orders')}
                >
                  <Text style={styles.viewAllOrdersText}>View All Orders</Text>
                  <Ionicons name="arrow-forward" size={16} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          )}

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity 
                style={[styles.quickActionButton, isOnline && styles.quickActionButtonOnline]}
                onPress={handleToggleOnline}
              >
                <Ionicons 
                  name={isOnline ? "power" : "power"} 
                  size={24} 
                  color={isOnline ? "#059669" : "#0F766E"} 
                />
                <Text style={[styles.quickActionText, isOnline && styles.quickActionTextOnline]}>
                  {isOnline ? 'Go Offline' : 'Go Online'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => router.push('/driver/(tabs)/earnings')}
              >
                <Ionicons name="analytics" size={24} color="#0F766E" />
                <Text style={styles.quickActionText}>Earnings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionButton}>
                <Ionicons name="help-circle" size={24} color="#0F766E" />
                <Text style={styles.quickActionText}>Support</Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 20,
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
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
  // Available Work Summary Styles
  workSummaryCard: {
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
  emptyWorkState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyWorkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
  },
  emptyWorkSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  workStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  workStat: {
    alignItems: 'center',
    flex: 1,
  },
  workStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F766E',
    marginBottom: 4,
  },
  workStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  viewAllOrdersButton: {
    backgroundColor: '#0F766E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  viewAllOrdersText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Quick Actions Styles
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
    marginTop: 6,
  },
  quickActionButtonOnline: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#059669',
  },
  quickActionTextOnline: {
    color: '#059669',
  },
  goOnlineButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  goOnlineButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 100, // Increased for new tab height
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
}); 