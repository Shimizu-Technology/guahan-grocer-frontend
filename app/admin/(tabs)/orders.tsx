import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ordersAPI, usersAPI } from '../../../services/api';

interface OrderData {
  id: string; // formatted
  rawId?: string; // numeric id as string
  customer: string;
  driver: string;
  status: string;
  total: string;
  items: number;
  store: string;
  time: string;
  assigned?: boolean; // whether a driver is already assigned
}

export default function AdminOrders() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);
  // Timeline state
  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  // Batch assignment state
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [batchAssignVisible, setBatchAssignVisible] = useState(false);
  const [batchAssigning, setBatchAssigning] = useState(false);
  // Receipt modal state
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [shouldReopenOrderModal, setShouldReopenOrderModal] = useState(false);

  // Fetch orders from API
  const fetchOrders = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await ordersAPI.getAll();
      if (response.data) {
        // Format orders for display
        const formattedOrders: OrderData[] = (response.data as any[]).map((order: any) => ({
          id: `#ORD${order.id.toString().padStart(3, '0')}`,
          rawId: order.id?.toString(),
          customer: 'Customer', // Backend doesn't expose customer names for privacy
          driver: order.driver?.name || 'Unassigned',
          status: order.status,
          total: `$${parseFloat(order.total || 0).toFixed(2)}`,
          items: order.items?.length || 0,
          store: order.storeName || 'Store',
          time: getTimeAgo(order.createdAt),
          assigned: Boolean(order.driver),
        }));

        setOrders(formattedOrders);
      } else {
        setError(response.error || 'Failed to load orders');
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const openOrderDetails = async (order: OrderData) => {
    try {
      const rawId = order.rawId || order.id.replace('#ORD', '');
      setSelectedOrderId(rawId);
      setDetailsLoading(true);
      setTimelineLoading(true);
      setModalVisible(true);
      const [orderResp, driversResp, timelineResp] = await Promise.all([
        ordersAPI.getById(rawId),
        usersAPI.getAvailableDrivers(),
        ordersAPI.getTimeline(rawId),
      ]);
      setOrderDetails(orderResp.data || null);
      setDrivers(Array.isArray(driversResp.data) ? driversResp.data : []);
      setTimeline((timelineResp.data as any)?.timeline || []);
    } catch (e) {
      console.error('Failed to load order details:', e);
    } finally {
      setDetailsLoading(false);
      setTimelineLoading(false);
    }
  };

  const closeOrderDetails = () => {
    setModalVisible(false);
    setOrderDetails(null);
    setSelectedOrderId(null);
    setTimeline([]);
  };

  const updateOrderStatus = async (status: string) => {
    if (!selectedOrderId) return;
    try {
      setAssigning(true);
      const resp = await ordersAPI.updateStatus(selectedOrderId, status);
      if (resp.data) {
        setOrderDetails(resp.data);
        fetchOrders(false);
      }
    } catch (e) {
      console.error('Failed to update status:', e);
    } finally {
      setAssigning(false);
    }
  };

  const assignDriver = async (driverId: string) => {
    if (!selectedOrderId) return;
    try {
      setAssigning(true);
      const resp = await ordersAPI.assignDriver(selectedOrderId, driverId);
      if (resp.data) {
        // Always refetch the assigned order to get canonical state (driver + assigned flag)
        const refreshed = await ordersAPI.getById(selectedOrderId);
        setOrderDetails(refreshed.data || null);
        await fetchOrders(false);
      }
    } catch (e) {
      console.error('Failed to assign driver:', e);
    } finally {
      setAssigning(false);
    }
  };

  // Batch assignment functions
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const clearSelection = () => {
    setSelectedOrders([]);
    setBatchAssignVisible(false);
  };

  const openBatchAssignment = () => {
    if (selectedOrders.length < 2) {
      alert('Please select at least 2 orders for batch assignment');
      return;
    }
    setBatchAssignVisible(true);
  };

  const batchAssignOrders = async (driverId: string) => {
    if (selectedOrders.length < 2) return;
    
    try {
      setBatchAssigning(true);
      const resp = await ordersAPI.batchAssign(selectedOrders, driverId);
      
      if (resp.data) {
        // Show success message
        const responseData = resp.data as any;
        const message = responseData.message || `${selectedOrders.length} orders assigned successfully`;
        alert(`✅ ${message}\nTotal earnings: $${responseData.total_earnings}`);
        
        // Clear selection and refresh
        clearSelection();
        await fetchOrders(false);
      } else {
        alert('Failed to assign orders: ' + (resp.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Batch assignment failed:', error);
      alert('Failed to assign orders: ' + (error.message || 'Network error'));
    } finally {
      setBatchAssigning(false);
    }
  };

  const getSelectedOrdersInfo = () => {
    const selectedOrderData = orders.filter(order => selectedOrders.includes(order.rawId || ''));
    const totalEarnings = selectedOrderData.reduce((sum, order) => {
      const total = parseFloat(order.total.replace('$', ''));
      return sum + (total * 0.15) + 3; // Estimated payout: 15% of total + $3 base
    }, 0);
    
    return {
      orders: selectedOrderData,
      totalEstimatedEarnings: totalEarnings.toFixed(2),
      allPending: selectedOrderData.every(order => order.status === 'pending')
    };
  };

  // Receipt modal functions
  const openReceiptModal = () => {
    setShouldReopenOrderModal(true);
    setModalVisible(false); // Close order details modal
    setTimeout(() => {
      setReceiptModalVisible(true); // Open receipt modal after a brief delay
    }, 300);
  };

  const closeReceiptModal = () => {
    setReceiptModalVisible(false);
    if (shouldReopenOrderModal) {
      setTimeout(() => {
        setModalVisible(true); // Reopen order details modal
        setShouldReopenOrderModal(false);
      }, 300);
    }
  };

  // Calculate time ago
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`;
  };

  // Initial load
  useEffect(() => {
    fetchOrders();
  }, []);

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders(false);
    setRefreshing(false);
  };

  const filters = [
    { key: 'all', label: 'All Orders', count: orders.length },
    { key: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length },
    { key: 'accepted', label: 'Accepted', count: orders.filter(o => o.status === 'accepted').length },
    { key: 'shopping', label: 'Shopping', count: orders.filter(o => o.status === 'shopping').length },
    { key: 'delivering', label: 'Delivering', count: orders.filter(o => o.status === 'delivering').length },
    { key: 'delivered', label: 'Delivered', count: orders.filter(o => o.status === 'delivered').length },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#EA580C';
      case 'accepted': return '#0F766E';
      case 'shopping': return '#0F766E';
      case 'delivering': return '#7C3AED';
      case 'delivered': return '#16A34A';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'shopping': return 'Shopping';
      case 'delivering': return 'Delivering';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusBackground = (status: string) => `${getStatusColor(status)}20`;

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created': return 'add-circle-outline';
      case 'assigned': return 'person-add-outline';
      case 'accepted': return 'checkmark-circle-outline';
      case 'shopping_started': return 'basket-outline';
      case 'shopping_completed': return 'bag-check-outline';
      case 'receipt_uploaded': return 'receipt-outline';
      case 'delivery_started': return 'car-outline';
      case 'delivered': return 'checkmark-done-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'time-outline';
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'created': return '#3B82F6';
      case 'assigned': return '#8B5CF6';
      case 'accepted': return '#10B981';
      case 'shopping_started': return '#F59E0B';
      case 'shopping_completed': return '#F59E0B';
      case 'receipt_uploaded': return '#6B7280';
      case 'delivery_started': return '#3B82F6';
      case 'delivered': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const filteredOrders = selectedFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === selectedFilter);

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

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchOrders()}>
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
          <Text style={styles.headerTitle}>Order Management</Text>
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search-outline" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Batch Controls Bar - Only shown when orders are selected */}
        {selectedOrders.length > 0 && (
          <View style={styles.batchControlsBar}>
            <View style={styles.batchInfo}>
              <Ionicons name="checkmark-circle" size={20} color="#0F766E" />
              <Text style={styles.selectedCountText}>
                {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
            
            <View style={styles.batchActions}>
              <TouchableOpacity 
                style={[
                  styles.batchAssignButton,
                  selectedOrders.length < 2 && styles.batchAssignButtonDisabled
                ]} 
                onPress={openBatchAssignment}
                disabled={selectedOrders.length < 2}
              >
                <Ionicons 
                  name="people-outline" 
                  size={16} 
                  color={selectedOrders.length < 2 ? "#9CA3AF" : "white"} 
                />
                <Text style={[
                  styles.batchAssignButtonText,
                  selectedOrders.length < 2 && styles.batchAssignButtonTextDisabled
                ]}>
                  Batch
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.clearSelectionButton} onPress={clearSelection}>
                <Text style={styles.clearSelectionText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={styles.filtersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            {filters.map((filter, index) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterTab,
                  selectedFilter === filter.key && styles.activeFilterTab
                ]}
                onPress={() => setSelectedFilter(filter.key)}
              >
                <Text style={[
                  styles.filterText,
                  selectedFilter === filter.key && styles.activeFilterText
                ]}>
                  {filter.label}
                </Text>
                <View style={[
                  styles.countBadge,
                  selectedFilter === filter.key && styles.activeCountBadge
                ]}>
                  <Text style={[
                    styles.countText,
                    selectedFilter === filter.key && styles.activeCountText
                  ]}>
                    {filter.count}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Orders List */}
        <ScrollView 
          style={styles.ordersList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptyText}>
                {selectedFilter === 'all' 
                  ? 'No orders have been placed yet.'
                  : `No ${selectedFilter} orders at the moment.`
                }
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderHeaderLeft}>
                    {order.status === 'pending' && !order.assigned && (
                      <TouchableOpacity 
                        style={styles.checkbox}
                        onPress={() => toggleOrderSelection(order.rawId || '')}
                      >
                        <View style={[
                          styles.checkboxInner,
                          selectedOrders.includes(order.rawId || '') && styles.checkboxSelected
                        ]}>
                          {selectedOrders.includes(order.rawId || '') && (
                            <Ionicons name="checkmark" size={16} color="white" />
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    <View>
                      <Text style={styles.orderId}>{order.id}</Text>
                      <Text style={styles.orderTime}>{order.time}</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(order.status) + '20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(order.status) }
                    ]}>
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <View style={styles.orderInfo}>
                    <View style={styles.infoRow}>
                      <Ionicons name="person-outline" size={16} color="#6B7280" />
                      <Text style={styles.infoText}>{order.customer}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="car-outline" size={16} color="#6B7280" />
                      <Text style={styles.infoText}>{order.driver}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="storefront-outline" size={16} color="#6B7280" />
                      <Text style={styles.infoText}>{order.store}</Text>
                    </View>
                  </View>

                  <View style={styles.orderStats}>
                    <Text style={styles.totalText}>{order.total}</Text>
                    <Text style={styles.itemsText}>{order.items} items</Text>
                  </View>
                </View>

                <View style={styles.orderActions}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => openOrderDetails(order)}>
                    <Ionicons name="eye-outline" size={16} color="#0F766E" />
                    <Text style={styles.actionText}>View Details</Text>
                  </TouchableOpacity>
                  {order.status === 'pending' && !order.assigned && (
                    <TouchableOpacity style={[styles.actionButton, styles.primaryAction]} onPress={() => openOrderDetails(order)}>
                      <Ionicons name="person-add-outline" size={16} color="white" />
                      <Text style={[styles.actionText, styles.primaryActionText]}>Assign Driver</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Order Details Modal */}
        <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeOrderDetails}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={closeOrderDetails} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {detailsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0F766E" />
                <Text style={styles.loadingText}>Loading order...</Text>
              </View>
            ) : orderDetails ? (
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>Order</Text>
                    <Text style={styles.summaryValue}>#ORD{orderDetails.id}</Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>Status</Text>
                    <View style={[styles.summaryStatusPill, { backgroundColor: getStatusBackground(orderDetails.status) }]}>
                      <Text style={[styles.summaryStatusText, { color: getStatusColor(orderDetails.status) }]}>
                        {getStatusText(orderDetails.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>Total</Text>
                    <Text style={styles.summaryValue}>${Number(orderDetails.total || 0).toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Items</Text>
                  <View style={styles.itemsList}>
                    {orderDetails.items && orderDetails.items.length > 0 ? (
                      orderDetails.items.map((item: any) => (
                        <View key={item.id} style={styles.itemRow}>
                          <Text style={styles.itemName}>{item.product?.name || 'Item'}</Text>
                          <Text style={styles.itemQty}>x{String(item.quantity || 0)}</Text>
                          <Text style={styles.itemPrice}>${Number(item.price || 0).toFixed(2)}</Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyItemsContainer}>
                        <Text style={styles.emptyItemsText}>No items found for this order</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Delivery</Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoCell}><Text style={styles.infoLabel}>ETA</Text><Text style={styles.infoValue}>{orderDetails.eta || '—'}</Text></View>
                    <View style={styles.infoCell}><Text style={styles.infoLabel}>Delivery Time</Text><Text style={styles.infoValue}>{orderDetails.deliveryTime || 'ASAP'}</Text></View>
                    <View style={styles.infoCell}><Text style={styles.infoLabel}>Delivery Fee</Text><Text style={styles.infoValue}>${Number(orderDetails.deliveryFee || 0).toFixed(2)}</Text></View>
                    <View style={styles.infoCell}><Text style={styles.infoLabel}>Tip</Text><Text style={styles.infoValue}>${Number(orderDetails.tipAmount || 0).toFixed(2)}</Text></View>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Driver</Text>
                  <View style={styles.driverRow}>
                    <Text style={styles.driverName}>{orderDetails.driver?.name || 'Unassigned'}</Text>
                  </View>

                  {orderDetails.status === 'pending' && drivers.length > 0 && (
                    <View style={styles.driverList}>
                      <Text style={styles.subSectionTitle}>Available Drivers</Text>
                      {drivers.map((item: any) => (
                        <View key={item.id} style={styles.driverItem}>
                          <Text style={styles.driverItemName}>{item.name}</Text>
                          <TouchableOpacity style={[styles.smallButton, styles.primaryAction]} disabled={assigning} onPress={() => assignDriver(item.id)}>
                            {assigning ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.actionText, styles.primaryActionText]}>Assign</Text>}
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Actions</Text>
                  <View style={styles.segmentGroup}>
                    {['pending','shopping','delivering'].map((s, index) => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.segmentButton,
                          index === 0 && styles.segmentButtonFirst,
                          index === 2 && styles.segmentButtonLast,
                          orderDetails.status === s && styles.segmentButtonActive,
                        ]}
                        onPress={() => updateOrderStatus(s)}
                      >
                        <Text style={[styles.segmentButtonText, orderDetails.status === s && styles.segmentButtonTextActive]}>
                          {getStatusText(s)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Order Timeline */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Order Timeline</Text>
                  {timelineLoading ? (
                    <View style={styles.timelineLoadingContainer}>
                      <ActivityIndicator size="small" color="#0F766E" />
                      <Text style={styles.timelineLoadingText}>Loading timeline...</Text>
                    </View>
                  ) : timeline.length > 0 ? (
                    <View style={styles.timelineContainer}>
                      {timeline.map((event, index) => (
                        <View key={event.id} style={styles.timelineEventRow}>
                          <View style={styles.timelineLeftColumn}>
                            <View style={[styles.timelineEventIcon, { backgroundColor: getEventColor(event.event_type) + '20' }]}>
                              <Ionicons 
                                name={getEventIcon(event.event_type) as any} 
                                size={16} 
                                color={getEventColor(event.event_type)} 
                              />
                            </View>
                            {index < timeline.length - 1 && <View style={styles.timelineLine} />}
                          </View>
                          <View style={styles.timelineRightColumn}>
                            <View style={styles.timelineEventContent}>
                              <Text style={styles.timelineEventText}>{String(event.description || 'No description')}</Text>
                              <View style={styles.timelineEventMeta}>
                                <Text style={styles.timelineEventTime}>{String(event.time_ago || 'unknown time')}</Text>
                                {event.user && (
                                  <View style={styles.timelineEventUser}>
                                    <View style={[styles.userRoleBadge, { backgroundColor: event.user.role === 'admin' ? '#8B5CF6' : '#0F766E' }]}>
                                      <Text style={styles.userRoleText}>{event.user.role}</Text>
                                    </View>
                                    <Text style={styles.timelineEventUserName}>{String(event.user.name || 'Unknown')}</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyTimelineContainer}>
                      <Ionicons name="time-outline" size={32} color="#9CA3AF" />
                      <Text style={styles.emptyTimelineText}>No timeline events found</Text>
                    </View>
                  )}
                </View>

                {/* Performance Metrics for Completed Orders */}
                {orderDetails.performanceMetrics && orderDetails.status === 'delivered' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Performance Metrics</Text>
                    <View style={styles.metricsGrid}>
                      {(orderDetails.performanceMetrics?.totalProcessingTime ?? 0) > 0 && (
                        <View style={styles.metricCard}>
                          <Ionicons name="time-outline" size={20} color="#6B7280" />
                          <Text style={styles.metricValue}>{String(orderDetails.performanceMetrics?.totalProcessingTime || 0)} min</Text>
                          <Text style={styles.metricLabel}>Total Time</Text>
                        </View>
                      )}
                      {(orderDetails.performanceMetrics?.shoppingDuration ?? 0) > 0 && (
                        <View style={styles.metricCard}>
                          <Ionicons name="basket-outline" size={20} color="#6B7280" />
                          <Text style={styles.metricValue}>{String(orderDetails.performanceMetrics?.shoppingDuration || 0)} min</Text>
                          <Text style={styles.metricLabel}>Shopping</Text>
                        </View>
                      )}
                      {(orderDetails.performanceMetrics?.deliveryDuration ?? 0) > 0 && (
                        <View style={styles.metricCard}>
                          <Ionicons name="car-outline" size={20} color="#6B7280" />
                          <Text style={styles.metricValue}>{String(orderDetails.performanceMetrics?.deliveryDuration || 0)} min</Text>
                          <Text style={styles.metricLabel}>Delivery</Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Enhanced Performance Metrics */}
                    <Text style={styles.sectionTitle}>Milestone Metrics</Text>
                    <View style={styles.metricsGrid}>
                      {(orderDetails.performanceMetrics?.assignmentToAcceptanceTime ?? 0) > 0 && (
                        <View style={styles.metricCard}>
                          <Ionicons name="timer-outline" size={20} color="#8B5CF6" />
                          <Text style={styles.metricValue}>{String(orderDetails.performanceMetrics?.assignmentToAcceptanceTime || 0)} min</Text>
                          <Text style={styles.metricLabel}>Assignment → Acceptance</Text>
                        </View>
                      )}
                      {(orderDetails.performanceMetrics?.acceptanceToShoppingTime ?? 0) > 0 && (
                        <View style={styles.metricCard}>
                          <Ionicons name="play-outline" size={20} color="#F59E0B" />
                          <Text style={styles.metricValue}>{String(orderDetails.performanceMetrics?.acceptanceToShoppingTime || 0)} min</Text>
                          <Text style={styles.metricLabel}>Acceptance → Shopping</Text>
                        </View>
                      )}
                      {(orderDetails.performanceMetrics?.shoppingToDeliveryTime ?? 0) > 0 && (
                        <View style={styles.metricCard}>
                          <Ionicons name="arrow-forward-outline" size={20} color="#3B82F6" />
                          <Text style={styles.metricValue}>{String(orderDetails.performanceMetrics?.shoppingToDeliveryTime || 0)} min</Text>
                          <Text style={styles.metricLabel}>Shopping → Delivery</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Receipt Section - Show if receipt exists */}
                {orderDetails.receiptInfo && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Store Receipt</Text>
                    <View style={styles.receiptContainer}>
                      <View style={styles.receiptHeader}>
                        <View style={styles.receiptInfo}>
                          <Ionicons name="receipt-outline" size={20} color="#0F766E" />
                          <View>
                            <Text style={styles.receiptText}>Receipt uploaded by driver</Text>
                            <Text style={styles.receiptTime}>
                              {orderDetails.receiptInfo?.uploadedAgo || 'Recently uploaded'}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity 
                          style={styles.viewReceiptButton}
                          onPress={openReceiptModal}
                        >
                          <Ionicons name="eye-outline" size={16} color="#0F766E" />
                          <Text style={styles.viewReceiptText}>View Full Size</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity 
                        style={styles.receiptImageContainer}
                        onPress={openReceiptModal}
                        activeOpacity={0.8}
                      >
                        <Image 
                          source={{ uri: orderDetails.receiptInfo?.receiptUrl }} 
                          style={styles.receiptImage}
                          resizeMode="cover"
                        />
                        <View style={styles.receiptOverlay}>
                          <Ionicons name="expand-outline" size={24} color="white" />
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            ) : (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                <Text style={styles.errorText}>Failed to load order.</Text>
              </View>
            )}

          </SafeAreaView>
        </Modal>

        {/* Batch Assignment Modal */}
        <Modal visible={batchAssignVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBatchAssignVisible(false)}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Batch Assignment</Text>
              <TouchableOpacity onPress={() => setBatchAssignVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {(() => {
                const selectedInfo = getSelectedOrdersInfo();
                return (
                  <>
                    {/* Selected Orders Summary */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Selected Orders ({selectedOrders.length})</Text>
                      {selectedInfo.orders.map((order) => (
                        <View key={order.id} style={styles.selectedOrderItem}>
                          <View>
                            <Text style={styles.selectedOrderId}>{order.id}</Text>
                            <Text style={styles.selectedOrderDetails}>{order.items} items • {order.total}</Text>
                          </View>
                          <Text style={styles.selectedOrderCustomer}>{order.customer}</Text>
                        </View>
                      ))}
                      
                      <View style={styles.batchSummary}>
                        <Text style={styles.batchSummaryText}>
                          Total Estimated Earnings: <Text style={styles.batchEarningsText}>${selectedInfo.totalEstimatedEarnings}</Text>
                        </Text>
                        {!selectedInfo.allPending && (
                          <Text style={styles.warningText}>⚠️ Only pending orders can be batch assigned</Text>
                        )}
                      </View>
                    </View>

                    {/* Driver Selection */}
                    {selectedInfo.allPending && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Select Driver</Text>
                        {drivers.map((driver) => (
                          <TouchableOpacity
                            key={driver.id}
                            style={styles.driverItem}
                            onPress={() => batchAssignOrders(driver.id)}
                            disabled={batchAssigning}
                          >
                            <View style={styles.driverInfo}>
                              <Text style={styles.driverItemName}>{driver.name}</Text>
                              <Text style={styles.driverStatus}>
                                {driver.isOnline ? '🟢 Online' : '🔴 Offline'}
                              </Text>
                            </View>
                            {batchAssigning ? (
                              <ActivityIndicator size="small" color="#0F766E" />
                            ) : (
                              <View style={styles.assignBatchButton}>
                                <Text style={styles.assignBatchButtonText}>Assign Batch</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                );
              })()}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>

      {/* Receipt Full Size Modal - Outside of order details modal for proper layering */}
      <Modal 
        visible={receiptModalVisible} 
        animationType="fade" 
        presentationStyle="overFullScreen"
        onRequestClose={closeReceiptModal}
      >
        <View style={styles.receiptModalContainer}>
          <View style={styles.receiptModalHeader}>
            <Text style={styles.receiptModalTitle}>Store Receipt</Text>
            <TouchableOpacity 
              onPress={closeReceiptModal} 
              style={styles.receiptModalCloseButton}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          {orderDetails?.receiptInfo && (
            <View style={styles.receiptModalContent}>
              <Image 
                source={{ uri: orderDetails.receiptInfo?.receiptUrl }} 
                style={styles.receiptModalImage}
                resizeMode="contain"
              />
              <View style={styles.receiptModalInfo}>
                <Text style={styles.receiptModalInfoText}>
                  Uploaded {orderDetails.receiptInfo?.uploadedAgo || 'recently'} by {orderDetails.driver?.name || 'driver'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
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
  searchButton: {
    padding: 8,
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
  ordersList: {
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
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  orderTime: {
    fontSize: 12,
    color: '#9CA3AF',
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
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  orderStats: {
    alignItems: 'flex-end',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F766E',
    marginBottom: 2,
  },
  itemsText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  orderActions: {
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
  primaryAction: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F766E',
  },
  primaryActionText: {
    color: 'white',
  },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: 'white' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB'
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  closeButton: { padding: 4 },
  modalContent: { paddingHorizontal: 20 },
  section: { marginTop: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginTop: 12 },
  summaryCell: { flex: 1 },
  summaryLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#0F766E' },
  itemsList: { backgroundColor: 'white', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemName: { flex: 1, color: '#1F2937' },
  itemQty: { width: 40, textAlign: 'right', color: '#6B7280' },
  itemPrice: { width: 80, textAlign: 'right', color: '#1F2937', fontWeight: '600' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoCell: { width: '48%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12 },
  infoLabel: { color: '#6B7280', fontSize: 12, marginBottom: 4 },
  infoValue: { color: '#1F2937', fontWeight: '600' },
  driverRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverName: { fontSize: 16, color: '#1F2937', fontWeight: '600' },
  driverList: { marginTop: 8, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 8 },
  subSectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4, paddingHorizontal: 4 },
  driverItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  driverItemName: { color: '#1F2937' },
  smallButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'white' },
  statusButtonActive: { borderColor: '#0F766E', backgroundColor: '#ECFDF5' },
  statusButtonText: { color: '#374151', fontWeight: '600' },
  statusButtonTextActive: { color: '#0F766E' },

  // Summary status pill
  summaryStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  summaryStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Segmented control for actions
  segmentGroup: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  segmentButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  segmentButtonFirst: {
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  segmentButtonLast: {
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
  },
  segmentButtonActive: {
    backgroundColor: '#ECFDF5',
  },
  segmentButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  segmentButtonTextActive: {
    color: '#0F766E',
  },
  // Timeline styles
  timelineLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  timelineLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  timelineContainer: {
    paddingVertical: 8,
  },
  timelineEventRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeftColumn: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineEventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
  },
  timelineRightColumn: {
    flex: 1,
    paddingTop: 4,
  },
  timelineEventContent: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#E5E7EB',
  },
  timelineEventText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  timelineEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  timelineEventTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  timelineEventUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userRoleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  userRoleText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineEventUserName: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  emptyTimelineContainer: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTimelineText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  // Metrics styles
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Batch assignment styles
  batchControlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  batchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectedCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  batchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batchAssignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F766E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  batchAssignButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  batchAssignButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  batchAssignButtonTextDisabled: {
    color: '#9CA3AF',
  },
  clearSelectionButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  clearSelectionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    padding: 4,
  },
  checkboxInner: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  // Batch modal styles
  selectedOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedOrderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectedOrderDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  selectedOrderCustomer: {
    fontSize: 14,
    color: '#6B7280',
  },
  batchSummary: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  batchSummaryText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  batchEarningsText: {
    fontWeight: 'bold',
    color: '#0F766E',
  },
  warningText: {
    fontSize: 14,
    color: '#F59E0B',
    textAlign: 'center',
    marginTop: 8,
  },
  driverInfo: {
    flex: 1,
  },
  driverStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  assignBatchButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  assignBatchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // Receipt display styles
  receiptContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  receiptText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  receiptTime: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  viewReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0F766E',
    backgroundColor: '#F0FDF4',
    flexShrink: 0,
  },
  viewReceiptText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
  },
  receiptImageContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  receiptImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F9FAFB',
  },
  receiptOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Receipt modal styles
  receiptModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  receiptModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  receiptModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  receiptModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptModalContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  receiptModalImage: {
    width: '100%',
    height: '80%',
  },
  receiptModalInfo: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  receiptModalInfoText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  // Empty items styles
  emptyItemsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyItemsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
}); 