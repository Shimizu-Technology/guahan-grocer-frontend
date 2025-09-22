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
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { useAuth } from '../../context/AuthContext';
import { ordersAPI, weightVarianceAPI } from '../../services/api';

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
  foundQuantity?: number;
  notes?: string;
  // Weight variance properties
  product?: {
    weightBased?: boolean;
    weightUnit?: string;
    pricePerUnit?: number;
  };
  weightInfo?: {
    estimatedWeight?: number;
    actualWeight?: number;
    weightUnit?: string;
    estimatedPrice?: number;
    actualPrice?: number;
    variancePercentage?: number;
    varianceApproved?: boolean;
    weightVerified?: boolean;
    needsApproval?: boolean;
    weightVariance?: number;
    priceVariance?: number;
    varianceApprovalMethod?: string;
    weightVerifiedAt?: string;
    substitutionReason?: string;
  };
  finalPrice?: number;
  lineTotal?: number;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  vehicleType: string;
  displayName: string;
  fullDescription: string;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  description: string;
  user: {
    id: string;
    name: string;
    role: string;
  } | null;
  user_name: string;
  occurred_at: string;
  formatted_time: string;
  time_ago: string;
  data: any;
}

interface PerformanceMetrics {
  total_processing_time?: number;
  shopping_duration?: number;
  delivery_duration?: number;
  accepted_at?: string;
  shopping_started_at?: string;
  delivery_started_at?: string;
  delivered_at?: string;
}

interface Order {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  actualDeliveryFee?: number;
  tipAmount: number;
  tipPercentage: number;
  finalTotal?: number;
  createdAt: string;
  deliveryAddress: any;
  deliveryTime: string;
  deliveryInstructions?: string;
  eta: number;
  items: OrderItem[];
  driver?: Driver;
  vehicle?: Vehicle;
  // New timeline fields
  lastEvent?: {
    event_type: string;
    description: string;
    occurred_at: string;
    time_ago: string;
    user_name: string;
  };
  acceptedAt?: string;
  shoppingStartedAt?: string;
  deliveryStartedAt?: string;
  deliveredAt?: string;
  performanceMetrics?: PerformanceMetrics;
}

export default function OrderDetailScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Timeline state
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  // Variance approval modal state
  const [varianceModalVisible, setVarianceModalVisible] = useState(false);
  const [selectedVarianceItem, setSelectedVarianceItem] = useState<OrderItem | null>(null);
  const [approvingVariance, setApprovingVariance] = useState(false);

  // Add safety check for user
  console.log('🔍 OrderDetailScreen - User:', user);
  console.log('🔍 OrderDetailScreen - Auth Loading:', authLoading);
  console.log('🔍 OrderDetailScreen - Order ID:', id);

  // Fetch order details
  const fetchOrder = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      console.log('🔍 Fetching order with ID:', id);
      const response = await ordersAPI.getById(id as string);
      
      if (response.data) {
        const orderData = response.data as any;
        console.log('📦 Raw order data:', JSON.stringify(orderData, null, 2));
        
        if (!orderData || typeof orderData !== 'object') {
          throw new Error('Invalid order data received from server');
        }

        const formattedOrder: Order = {
          id: String(orderData.id || 'unknown'),
          status: orderData.status || 'pending',
          total: parseFloat(orderData.total || 0),
          subtotal: parseFloat(orderData.subtotal || 0),
          deliveryFee: parseFloat(orderData.deliveryFee || 0),
          serviceFee: parseFloat(orderData.serviceFee || 0),
          actualDeliveryFee: orderData.actualDeliveryFee ? parseFloat(orderData.actualDeliveryFee) : undefined,
          tipAmount: parseFloat(orderData.tipAmount || 0),
          tipPercentage: parseFloat(orderData.tipPercentage || 0),
          finalTotal: orderData.finalTotal ? parseFloat(orderData.finalTotal) : undefined,
          createdAt: orderData.createdAt || new Date().toISOString(),
          deliveryAddress: orderData.deliveryAddress || {},
          deliveryTime: orderData.deliveryTime || 'ASAP',
          deliveryInstructions: orderData.deliveryInstructions || '',
          eta: orderData.eta || 45,
          items: (orderData.order_items || orderData.items || []).map((orderItem: any, index: number) => {
            console.log(`📦 Processing order item ${index}:`, orderItem);
            console.log(`📦 Item has weightInfo:`, !!orderItem.weightInfo);
            console.log(`📦 Item has product:`, !!orderItem.product);
            if (orderItem.product?.name?.includes('Cucumber')) {
              console.log(`🥒 CUCUMBER DEBUG:`, JSON.stringify(orderItem, null, 2));
            }
            
            if (!orderItem) {
              console.warn(`⚠️ Order item ${index} is null or undefined`);
              return null;
            }

            const product = orderItem.product || orderItem.item;
            if (!product) {
              console.warn(`⚠️ No product data found for order item ${index}:`, orderItem);
              return {
                id: orderItem.id || `temp-${index}`,
                itemId: orderItem.product_id || orderItem.itemId || `temp-${index}`,
                item: {
                  id: `unknown-${index}`,
                  name: 'Unknown Item',
                  price: 0,
                  unit: 'each',
                },
                quantity: orderItem.quantity || 1,
                price: parseFloat(orderItem.price || 0),
                status: orderItem.status || 'pending',
                foundQuantity: orderItem.found_quantity || orderItem.foundQuantity,
                notes: orderItem.notes,
              };
            }

            const formattedItem: OrderItem = {
              id: orderItem.id,
              itemId: orderItem.product_id || orderItem.itemId,
              item: {
                id: product.id || `unknown-${index}`,
                name: product.name || 'Unknown Item',
                price: parseFloat(product.price || 0),
                unit: product.unit || 'each',
              },
              quantity: orderItem.quantity || 1,
              price: parseFloat(orderItem.price || 0),
              status: orderItem.status || 'pending',
              foundQuantity: orderItem.found_quantity || orderItem.foundQuantity,
              notes: orderItem.notes,
              finalPrice: orderItem.finalPrice ? parseFloat(orderItem.finalPrice) : undefined,
              lineTotal: orderItem.lineTotal ? parseFloat(orderItem.lineTotal) : undefined,
            };

            // Add weight-based product info if available
            if (orderItem.product || product.weightBased) {
              formattedItem.product = {
                weightBased: orderItem.product?.weightBased || product.weightBased || false,
                weightUnit: orderItem.product?.weightUnit || product.weightUnit,
                pricePerUnit: orderItem.product?.pricePerUnit ? parseFloat(orderItem.product.pricePerUnit) : undefined,
              };
            }

            // Add weight info if available
            if (orderItem.weightInfo) {
              formattedItem.weightInfo = {
                estimatedWeight: orderItem.weightInfo.estimatedWeight,
                actualWeight: orderItem.weightInfo.actualWeight,
                weightUnit: orderItem.weightInfo.weightUnit,
                estimatedPrice: orderItem.weightInfo.estimatedPrice,
                actualPrice: orderItem.weightInfo.actualPrice,
                variancePercentage: orderItem.weightInfo.variancePercentage,
                varianceApproved: orderItem.weightInfo.varianceApproved,
                weightVerified: orderItem.weightInfo.weightVerified,
                needsApproval: orderItem.weightInfo.needsApproval,
                weightVariance: orderItem.weightInfo.weightVariance,
                priceVariance: orderItem.weightInfo.priceVariance,
                varianceApprovalMethod: orderItem.weightInfo.varianceApprovalMethod,
                weightVerifiedAt: orderItem.weightInfo.weightVerifiedAt,
                substitutionReason: orderItem.weightInfo.substitutionReason,
              };
            }

            console.log(`📦 Formatted item ${index} (${product.name}):`, formattedItem);
            return formattedItem;
          }).filter(Boolean),
          driver: orderData.driver ? {
            id: String(orderData.driver.id),
            name: orderData.driver.name,
            phone: orderData.driver.phone
          } : undefined,
          vehicle: orderData.vehicle ? {
            id: String(orderData.vehicle.id),
            make: orderData.vehicle.make,
            model: orderData.vehicle.model,
            year: orderData.vehicle.year,
            color: orderData.vehicle.color,
            licensePlate: orderData.vehicle.licensePlate,
            vehicleType: orderData.vehicle.vehicleType,
            displayName: orderData.vehicle.displayName,
            fullDescription: orderData.vehicle.fullDescription
          } : undefined
        };

        console.log('✅ Order formatted successfully:', formattedOrder);
        console.log('🚗 Driver data:', formattedOrder.driver);
        console.log('🚙 Vehicle data:', formattedOrder.vehicle);
        setOrder(formattedOrder);
      } else {
        setError(response.error || 'Failed to load order details');
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch order:', err);
      console.error('❌ Error details:', {
        message: err?.message,
        stack: err?.stack,
        name: err?.name
      });
      setError(`Failed to load order details: ${err?.message || 'Unknown error'}`);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch timeline data
  const fetchTimeline = async () => {
    if (!id) return;
    
    try {
      setTimelineLoading(true);
      console.log('🔍 Fetching timeline for order:', id);
      
      const response = await ordersAPI.getTimeline(id as string);
      
      if (response.data) {
        const timelineData = response.data as any;
        console.log('✅ Timeline data received:', timelineData);
        
        setTimeline(timelineData.timeline || []);
        setMetrics(timelineData.metrics || null);
      } else {
        console.error('❌ Failed to fetch timeline:', response.error);
      }
    } catch (err: any) {
      console.error('❌ Timeline fetch error:', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  // Variance approval handlers
  const openVarianceModal = (item: OrderItem) => {
    if (!item.weightInfo?.needsApproval) return;
    setSelectedVarianceItem(item);
    setVarianceModalVisible(true);
  };

  const closeVarianceModal = () => {
    setVarianceModalVisible(false);
    setSelectedVarianceItem(null);
  };

  const handleApproveVariance = async () => {
    if (!selectedVarianceItem || !order) return;

    try {
      setApprovingVariance(true);
      
      const response = await weightVarianceAPI.approveVariance(
        order.id,
        selectedVarianceItem.id
      );

      if (response.data) {
        // Update the local order state
        const updatedOrder = { ...order };
        const itemIndex = updatedOrder.items.findIndex(item => item.id === selectedVarianceItem.id);
        
        if (itemIndex >= 0) {
          updatedOrder.items[itemIndex] = {
            ...updatedOrder.items[itemIndex],
            weightInfo: {
              ...updatedOrder.items[itemIndex].weightInfo!,
              varianceApproved: true,
              needsApproval: false,
              varianceApprovalMethod: 'manual'
            }
          };
          setOrder(updatedOrder);
        }

        closeVarianceModal();
        Alert.alert(
          'Variance Approved',
          'The weight variance has been approved. The final price will reflect the actual weight.',
          [{ text: 'OK' }]
        );

      } else {
        throw new Error(response.error || 'Failed to approve variance');
      }
    } catch (error) {
      console.error('Error approving variance:', error);
      Alert.alert(
        'Error',
        'Failed to approve variance. Please try again.'
      );
    } finally {
      setApprovingVariance(false);
    }
  };

  const handleRejectVariance = async () => {
    if (!selectedVarianceItem || !order) return;

    Alert.alert(
      'Reject Weight Variance',
      'Are you sure you want to reject this weight variance? The item may be removed from your order or you may be contacted for alternatives.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: async () => {
            try {
              setApprovingVariance(true);
              
              const response = await weightVarianceAPI.rejectVariance(
                order.id,
                selectedVarianceItem.id
              );

              if (response.data) {
                // Update the local order state
                const updatedOrder = { ...order };
                const itemIndex = updatedOrder.items.findIndex(item => item.id === selectedVarianceItem.id);
                
                if (itemIndex >= 0) {
                  updatedOrder.items[itemIndex] = {
                    ...updatedOrder.items[itemIndex],
                    weightInfo: {
                      ...updatedOrder.items[itemIndex].weightInfo!,
                      varianceApproved: false,
                      needsApproval: false,
                      varianceApprovalMethod: 'manual'
                    }
                  };
                  setOrder(updatedOrder);
                }

                closeVarianceModal();
                Alert.alert(
                  'Variance Rejected',
                  'The weight variance has been rejected. Your order may be updated accordingly.',
                  [{ text: 'OK' }]
                );

              } else {
                throw new Error(response.error || 'Failed to reject variance');
              }
            } catch (error) {
              console.error('Error rejecting variance:', error);
              Alert.alert(
                'Error',
                'Failed to reject variance. Please try again.'
              );
            } finally {
              setApprovingVariance(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrder(false);
    if (showTimeline) {
      fetchTimeline();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatAddress = (address: any) => {
    if (!address) return 'No address';
    
    const parts = [
      address.streetAddress,
      address.apartmentUnit,
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
          description: 'Your order has been placed and is being prepared.',
          color: '#3B82F6',
          bgColor: '#EFF6FF',
          icon: 'time-outline',
          step: 1
        };
      case 'shopping':
        return {
          label: 'Shopping in Progress',
          description: 'Our shopper is gathering your items.',
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          icon: 'basket-outline',
          step: 2
        };
      case 'delivering':
        return {
          label: 'Out for Delivery',
          description: 'Your order is on the way!',
          color: '#8B5CF6',
          bgColor: '#F3E8FF',
          icon: 'car-outline',
          step: 3
        };
      case 'delivered':
        return {
          label: 'Delivered',
          description: 'Your order has been delivered.',
          color: '#059669',
          bgColor: '#ECFDF5',
          icon: 'checkmark-circle-outline',
          step: 4
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          description: 'This order has been cancelled.',
          color: '#DC2626',
          bgColor: '#FEF2F2',
          icon: 'close-circle-outline',
          step: 0
        };
      default:
        return {
          label: status,
          description: 'Order status update',
          color: '#6B7280',
          bgColor: '#F3F4F6',
          icon: 'help-circle-outline',
          step: 1
        };
    }
  };

  const renderProgressSteps = () => {
    const statusInfo = getStatusInfo(order!.status);
    const currentStep = statusInfo.step;
    
    const steps = [
      { label: 'Placed', icon: 'checkmark-circle' },
      { label: 'Shopping', icon: 'basket' },
      { label: 'Delivery', icon: 'car' },
      { label: 'Done', icon: 'home' }
    ];

    return (
      <View style={styles.progressContainer}>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber <= currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <React.Fragment key={index}>
              <View style={styles.stepContainer}>
                <View style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  isCurrent && styles.stepCircleCurrent
                ]}>
                  <Ionicons 
                    name={step.icon as any} 
                    size={16} 
                    color={isActive ? 'white' : '#9CA3AF'} 
                  />
                </View>
                <Text 
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive
                  ]}
                >
                  {step.label}
                </Text>
              </View>
              {index < steps.length - 1 && (
                <View style={[
                  styles.stepLine,
                  isActive && stepNumber < currentStep && styles.stepLineActive
                ]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return 'receipt-outline';
      case 'assigned':
        return 'person-add-outline';
      case 'accepted':
        return 'checkmark-circle-outline';
      case 'shopping_started':
        return 'basket-outline';
      case 'item_found':
        return 'search-outline';
      case 'item_substituted':
        return 'swap-horizontal-outline';
      case 'item_unavailable':
        return 'close-circle-outline';
      case 'shopping_completed':
        return 'bag-check-outline';
      case 'delivery_started':
        return 'car-outline';
      case 'delivered':
        return 'home-outline';
      case 'cancelled':
        return 'ban-outline';
      default:
        return 'ellipsis-horizontal-outline';
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return '#3B82F6';
      case 'assigned':
      case 'accepted':
        return '#059669';
      case 'shopping_started':
      case 'item_found':
        return '#F59E0B';
      case 'item_substituted':
        return '#8B5CF6';
      case 'item_unavailable':
        return '#DC2626';
      case 'shopping_completed':
      case 'delivery_started':
        return '#0F766E';
      case 'delivered':
        return '#059669';
      case 'cancelled':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  const renderTimeline = () => {
    if (timeline.length === 0) {
      return (
        <View style={styles.timelineEmpty}>
          <Ionicons name="time-outline" size={24} color="#9CA3AF" />
          <Text style={styles.timelineEmptyText}>No timeline events available</Text>
        </View>
      );
    }

    return (
      <View style={styles.timelineContainer}>
        {timeline.map((event, index) => {
          const isLast = index === timeline.length - 1;
          const eventColor = getEventColor(event.event_type);
          
          return (
            <View key={event.id} style={styles.timelineEvent}>
              <View style={styles.timelineEventLeft}>
                <View style={[styles.timelineIcon, { backgroundColor: eventColor }]}>
                  <Ionicons 
                    name={getEventIcon(event.event_type) as any} 
                    size={16} 
                    color="white" 
                  />
                </View>
                {!isLast && <View style={styles.timelineLine} />}
              </View>
              
              <View style={styles.timelineEventContent}>
                <View style={styles.timelineEventHeader}>
                  <Text style={styles.timelineEventTitle}>{event.description}</Text>
                  <Text style={styles.timelineEventTime}>{event.time_ago}</Text>
                </View>
                
                <View style={styles.timelineEventMeta}>
                  <Text style={styles.timelineEventUser}>by {event.user_name}</Text>
                  <Text style={styles.timelineEventDate}>{event.formatted_time}</Text>
                </View>
              </View>
            </View>
          );
        })}
        
        {/* Performance Metrics */}
        {metrics && Object.keys(metrics).length > 0 && (
          <View style={styles.metricsContainer}>
            <Text style={styles.metricsTitle}>Performance Metrics</Text>
            
            {metrics.total_processing_time && (
              <View style={styles.metricRow}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text style={styles.metricLabel}>Total Time:</Text>
                <Text style={styles.metricValue}>{metrics.total_processing_time} min</Text>
              </View>
            )}
            
            {metrics.shopping_duration && (
              <View style={styles.metricRow}>
                <Ionicons name="basket-outline" size={16} color="#6B7280" />
                <Text style={styles.metricLabel}>Shopping:</Text>
                <Text style={styles.metricValue}>{metrics.shopping_duration} min</Text>
              </View>
            )}
            
            {metrics.delivery_duration && (
              <View style={styles.metricRow}>
                <Ionicons name="car-outline" size={16} color="#6B7280" />
                <Text style={styles.metricLabel}>Delivery:</Text>
                <Text style={styles.metricValue}>{metrics.delivery_duration} min</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderOrderItem = (item: OrderItem) => {
    // Safety check for item structure
    if (!item || !item.item) {
      console.warn('Invalid order item structure:', item);
      return null;
    }

    // Only show found quantity if order is being shopped and foundQuantity is set
    const shouldShowFound = order && 
                           (order.status === 'shopping' || order.status === 'delivering' || order.status === 'delivered') &&
                           item.foundQuantity !== null && 
                           item.foundQuantity !== undefined;

    const isWeightBased = item.product?.weightBased;
    const hasVarianceInfo = item.weightInfo && item.weightInfo.actualWeight;
    const needsApproval = item.weightInfo?.needsApproval;
    const varianceApproved = item.weightInfo?.varianceApproved;
    
    return (
      <View key={item.id} style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemName}>{item.item.name || 'Unknown Item'}</Text>
            {isWeightBased && (
              <View style={styles.weightBadge}>
                <Ionicons name="scale-outline" size={12} color="#0F766E" />
                <Text style={styles.weightBadgeText}>Weight-based</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemPrice}>
            ${(item.finalPrice || item.price).toFixed(2)}
          </Text>
        </View>

        <View style={styles.itemDetails}>
          {/* Regular quantity display */}
          <Text style={styles.itemQuantity}>
            Qty: {item.quantity} {item.item.unit || 'unit'}
          </Text>

          {/* Weight-based pricing info */}
          {isWeightBased && (
            <View style={styles.weightBasedDetails}>
              <Text style={styles.pricePerUnitText}>
                ${item.product?.pricePerUnit?.toFixed(2) || item.price.toFixed(2)} per {item.product?.weightUnit}
              </Text>
              
              {item.weightInfo?.estimatedWeight && (
                <Text style={styles.estimatedWeightText}>
                  Customer requested: {item.weightInfo.estimatedWeight} {item.product?.weightUnit} (${item.weightInfo.estimatedPrice?.toFixed(2)})
                </Text>
              )}

              {hasVarianceInfo && (
                <View style={styles.actualWeightInfo}>
                  <Text style={styles.actualWeightText}>
                    Actual weight: {item.weightInfo?.actualWeight} {item.product?.weightUnit} (${item.weightInfo?.actualPrice?.toFixed(2)})
                  </Text>
                  
                  {item.weightInfo?.variancePercentage !== undefined && item.weightInfo.variancePercentage !== 0 && (
                    <View style={styles.varianceDisplayInfo}>
                      <Text style={[
                        styles.varianceText,
                        { color: item.weightInfo.variancePercentage > 0 ? '#EA580C' : '#059669' }
                      ]}>
                        {item.weightInfo.variancePercentage > 0 ? '+' : ''}{item.weightInfo.variancePercentage.toFixed(1)}% variance
                      </Text>
                      
                      {needsApproval && (
                        <TouchableOpacity
                          style={styles.approvalNeededButton}
                          onPress={() => openVarianceModal(item)}
                        >
                          <Ionicons name="alert-circle" size={16} color="#EA580C" />
                          <Text style={styles.approvalNeededText}>Approval Needed</Text>
                        </TouchableOpacity>
                      )}
                      
                      {varianceApproved === true && (
                        <View style={styles.approvedBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="#059669" />
                          <Text style={styles.approvedText}>Approved</Text>
                        </View>
                      )}
                      
                      {varianceApproved === false && (
                        <View style={styles.rejectedBadge}>
                          <Ionicons name="close-circle" size={16} color="#DC2626" />
                          <Text style={styles.rejectedText}>Rejected</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
              
              {item.weightInfo?.substitutionReason && (
                <Text style={styles.weightNotes}>
                  Note: {item.weightInfo.substitutionReason}
                </Text>
              )}
            </View>
          )}

          {/* Found quantity info */}
          {shouldShowFound && (
            <View style={styles.foundQuantityContainer}>
              <Text style={styles.foundQuantity}>
                {isWeightBased && item.weightInfo?.actualWeight ? (
                  // For weight-based items, show actual weight instead of foundQuantity
                  <>Found: {item.weightInfo.actualWeight} {item.product?.weightUnit}</>
                ) : (
                  // For unit-based items, show foundQuantity
                  <>Found: {item.foundQuantity} {item.item.unit || 'unit'}</>
                )}
              </Text>
              
              {/* Show variance info for weight-based items in found section */}
              {isWeightBased && item.weightInfo?.actualWeight && item.weightInfo?.estimatedWeight && 
               item.weightInfo.actualWeight !== item.weightInfo.estimatedWeight && (
                <Text style={[
                  styles.foundVarianceText,
                  { color: item.weightInfo.actualWeight > item.weightInfo.estimatedWeight ? '#059669' : '#EA580C' }
                ]}>
                  {item.weightInfo.actualWeight > item.weightInfo.estimatedWeight ? 
                    `+${(item.weightInfo.actualWeight - item.weightInfo.estimatedWeight).toFixed(1)} ${item.product?.weightUnit} more` :
                    `${(item.weightInfo.actualWeight - item.weightInfo.estimatedWeight).toFixed(1)} ${item.product?.weightUnit} less`
                  }
                </Text>
              )}
            </View>
          )}

          {/* Regular item notes */}
          {item.notes && (
            <Text style={styles.itemNotes}>Note: {item.notes}</Text>
          )}
        </View>
      </View>
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
            <Text style={styles.headerTitle}>Order Details</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={styles.loadingText}>Loading order details...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Details</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
            <Text style={styles.errorText}>{error || 'Order not found'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchOrder()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const statusInfo = getStatusInfo(order?.status || 'pending');

  // Additional safety check before rendering
  if (!order || !order.id) {
    console.warn('⚠️ Order is missing or incomplete:', order);
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Details</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
            <Text style={styles.errorText}>Order data is incomplete</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchOrder()}>
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
          <Text style={styles.headerTitle}>Order #{order.id}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Status Section */}
          <View style={styles.section}>
            <View style={[styles.statusCard, { backgroundColor: statusInfo.bgColor }]}>
              <View style={styles.statusHeader}>
                <Ionicons name={statusInfo.icon as any} size={24} color={statusInfo.color} />
                <Text style={[styles.statusTitle, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
              <Text style={[styles.statusDescription, { color: statusInfo.color }]}>
                {statusInfo.description}
              </Text>
              <Text style={styles.orderDate}>
                Placed on {formatDate(order.createdAt)}
              </Text>
            </View>
          </View>

          {/* Progress Tracking */}
          {order.status !== 'cancelled' && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Order Progress</Text>
                <TouchableOpacity 
                  style={styles.timelineToggle}
                  onPress={() => {
                    if (!showTimeline && timeline.length === 0) {
                      fetchTimeline();
                    }
                    setShowTimeline(!showTimeline);
                  }}
                >
                  <Ionicons 
                    name={showTimeline ? "list-outline" : "time-outline"} 
                    size={20} 
                    color="#0F766E" 
                  />
                  <Text style={styles.timelineToggleText}>
                    {showTimeline ? "Simple View" : "Timeline"}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.progressCard}>
                {showTimeline ? (
                  timelineLoading ? (
                    <View style={styles.timelineLoading}>
                      <ActivityIndicator size="small" color="#0F766E" />
                      <Text style={styles.timelineLoadingText}>Loading timeline...</Text>
                    </View>
                  ) : (
                    renderTimeline()
                  )
                ) : (
                  renderProgressSteps()
                )}
              </View>
            </View>
          )}

          {/* Delivery Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Information</Text>
            <View style={styles.card}>
              <View style={styles.deliveryInfo}>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={20} color="#6B7280" />
                  <Text style={styles.infoLabel}>Address</Text>
                </View>
                <Text style={styles.infoValue}>{formatAddress(order.deliveryAddress)}</Text>
              </View>
              
              <View style={styles.deliveryInfo}>
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={20} color="#6B7280" />
                  <Text style={styles.infoLabel}>Delivery Time</Text>
                </View>
                <Text style={styles.infoValue}>{order.deliveryTime}</Text>
              </View>

              {order.deliveryInstructions && (
                <View style={styles.deliveryInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="document-text-outline" size={20} color="#6B7280" />
                    <Text style={styles.infoLabel}>Instructions</Text>
                  </View>
                  <Text style={styles.infoValue}>{order.deliveryInstructions}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Driver Information */}
          {order.driver && order.status !== 'pending' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Driver</Text>
              <View style={styles.card}>
                <View style={styles.driverInfo}>
                  <View style={styles.driverHeader}>
                    <View style={styles.driverAvatar}>
                      <Ionicons name="person" size={24} color="#0F766E" />
                    </View>
                    <View style={styles.driverDetails}>
                      <Text style={styles.driverName}>{order.driver.name}</Text>
                      <Text style={styles.driverRole}>Your Delivery Driver</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.callButton}
                      onPress={() => {
                        // Handle call driver
                        Alert.alert(
                          'Call Driver',
                          `Call ${order.driver?.name} at ${order.driver?.phone}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Call', onPress: () => {
                              if (order.driver?.phone) {
                                Linking.openURL(`tel:${order.driver.phone}`);
                              }
                            }}
                          ]
                        );
                      }}
                    >
                      <Ionicons name="call" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  
                  {order.vehicle && (
                    <View style={styles.vehicleInfo}>
                      <View style={styles.vehicleHeader}>
                        <Ionicons name="car" size={20} color="#6B7280" />
                        <Text style={styles.vehicleLabel}>Vehicle Information</Text>
                      </View>
                      <View style={styles.vehicleDetails}>
                        <Text style={styles.vehicleName}>{order.vehicle.displayName}</Text>
                        <Text style={styles.vehicleSpecs}>
                          {order.vehicle.color} • {order.vehicle.vehicleType.charAt(0).toUpperCase() + order.vehicle.vehicleType.slice(1)}
                        </Text>
                        <View style={styles.licensePlateContainer}>
                          <Text style={styles.licensePlateLabel}>License Plate:</Text>
                          <Text style={styles.licensePlate}>{order.vehicle.licensePlate}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Order Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
            <View style={styles.card}>
              {order.items.map(renderOrderItem)}
            </View>
          </View>

          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.card}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Subtotal {order.finalTotal ? '(actual)' : '(estimated)'}
                </Text>
                <Text style={styles.summaryValue}>
                  ${order.finalTotal ? 
                    order.items.reduce((sum, item) => {
                      if (item.product?.weightBased && item.weightInfo?.actualPrice) {
                        return sum + item.weightInfo.actualPrice;
                      } else {
                        return sum + (item.finalPrice || item.price) * (item.foundQuantity || item.quantity);
                      }
                    }, 0).toFixed(2) : 
                    order.subtotal.toFixed(2)
                  }
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Delivery Fee {order.actualDeliveryFee ? '(final)' : '(estimated)'}
                </Text>
                <Text style={styles.summaryValue}>
                  ${(order.actualDeliveryFee || order.deliveryFee).toFixed(2)}
                </Text>
              </View>

              {order.serviceFee > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Service Fee (5%)</Text>
                  <Text style={styles.summaryValue}>${order.serviceFee.toFixed(2)}</Text>
                </View>
              )}

              {order.tipAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Tip ({order.tipPercentage}%)
                  </Text>
                  <Text style={styles.summaryValue}>${order.tipAmount.toFixed(2)}</Text>
                </View>
              )}

              <View style={styles.summaryDivider} />
              
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  ${(order.finalTotal || order.total).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Savings Summary (for delivered orders with variances) */}
          {order.finalTotal && order.finalTotal < order.total && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Savings</Text>
              <View style={styles.card}>
                <View style={styles.savingsHeader}>
                  <Ionicons name="pricetag" size={24} color="#059669" />
                  <View style={styles.savingsInfo}>
                    <Text style={styles.savingsAmount}>
                      You saved ${(order.total - order.finalTotal).toFixed(2)}
                    </Text>
                    <Text style={styles.savingsDescription}>
                      Due to weight variances on your order
                    </Text>
                  </View>
                </View>
                
                {/* Show variance breakdown */}
                <View style={styles.savingsBreakdown}>
                  {order.items
                    .filter(item => 
                      item.product?.weightBased && 
                      item.weightInfo?.actualWeight && 
                      item.weightInfo?.estimatedWeight &&
                      item.weightInfo.actualWeight !== item.weightInfo.estimatedWeight
                    )
                    .map((item, index) => {
                      const savings = (item.weightInfo?.estimatedPrice || 0) - (item.weightInfo?.actualPrice || 0);
                      if (Math.abs(savings) < 0.01) return null;
                      
                      return (
                        <View key={item.id} style={styles.savingsItem}>
                          <Text style={styles.savingsItemName}>{item.item.name}</Text>
                          <View style={styles.savingsItemDetails}>
                            <Text style={styles.savingsItemText}>
                              {item.weightInfo?.actualWeight} {item.product?.weightUnit} vs {item.weightInfo?.estimatedWeight} {item.product?.weightUnit}
                            </Text>
                            <Text style={[
                              styles.savingsItemAmount,
                              { color: savings > 0 ? '#059669' : '#EA580C' }
                            ]}>
                              {savings > 0 ? '+' : ''}${savings.toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                </View>
                
                <View style={styles.savingsFooter}>
                  <Text style={styles.savingsFooterText}>
                    💡 Weight variances happen naturally - you only pay for what you actually receive!
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Variance Approval Modal */}
        {selectedVarianceItem && (
          <Modal
            visible={varianceModalVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={closeVarianceModal}
          >
            <SafeAreaView style={styles.varianceModalContainer}>
              <View style={styles.varianceModalHeader}>
                <TouchableOpacity onPress={closeVarianceModal} style={styles.varianceModalCloseButton}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.varianceModalTitle}>Weight Variance Approval</Text>
                <View style={styles.varianceModalCloseButton} />
              </View>

              <ScrollView style={styles.varianceModalContent} showsVerticalScrollIndicator={false}>
                {/* Product Info */}
                <View style={styles.varianceProductInfo}>
                  <Text style={styles.varianceProductName}>{selectedVarianceItem.item.name}</Text>
                  <Text style={styles.varianceProductPrice}>
                    ${selectedVarianceItem.product?.pricePerUnit?.toFixed(2)} per {selectedVarianceItem.product?.weightUnit}
                  </Text>
                </View>

                {/* Weight Comparison */}
                <View style={styles.varianceComparisonSection}>
                  <Text style={styles.varianceSectionTitle}>Weight Comparison</Text>
                  <View style={styles.varianceComparisonCard}>
                    <View style={styles.varianceComparisonRow}>
                      <View style={styles.varianceComparisonLeft}>
                        <Text style={styles.varianceLabel}>You Requested:</Text>
                        <Text style={styles.varianceEstimatedValue}>
                          {selectedVarianceItem.weightInfo?.estimatedWeight} {selectedVarianceItem.product?.weightUnit}
                        </Text>
                      </View>
                      <View style={styles.varianceComparisonRight}>
                        <Text style={styles.varianceEstimatedPrice}>
                          ${selectedVarianceItem.weightInfo?.estimatedPrice?.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.varianceComparisonDivider} />

                    <View style={styles.varianceComparisonRow}>
                      <View style={styles.varianceComparisonLeft}>
                        <Text style={styles.varianceLabel}>Actual Weight:</Text>
                        <Text style={styles.varianceActualValue}>
                          {selectedVarianceItem.weightInfo?.actualWeight} {selectedVarianceItem.product?.weightUnit}
                        </Text>
                      </View>
                      <View style={styles.varianceComparisonRight}>
                        <Text style={styles.varianceActualPrice}>
                          ${selectedVarianceItem.weightInfo?.actualPrice?.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Variance Summary */}
                <View style={styles.varianceSummarySection}>
                  <Text style={styles.varianceSectionTitle}>Variance Summary</Text>
                  <View style={styles.varianceSummaryCard}>
                    <View style={styles.varianceSummaryRow}>
                      <Text style={styles.varianceSummaryLabel}>Weight Difference:</Text>
                      <Text style={[
                        styles.varianceSummaryValue,
                        { color: (selectedVarianceItem.weightInfo?.variancePercentage || 0) > 0 ? '#EA580C' : '#059669' }
                      ]}>
                        {(selectedVarianceItem.weightInfo?.variancePercentage || 0) > 0 ? '+' : ''}
                        {selectedVarianceItem.weightInfo?.variancePercentage?.toFixed(1)}%
                      </Text>
                    </View>

                    <View style={styles.varianceSummaryRow}>
                      <Text style={styles.varianceSummaryLabel}>Price Difference:</Text>
                      <Text style={[
                        styles.varianceSummaryValue,
                        { color: (selectedVarianceItem.weightInfo?.priceVariance || 0) > 0 ? '#EA580C' : '#059669' }
                      ]}>
                        {(selectedVarianceItem.weightInfo?.priceVariance || 0) > 0 ? '+' : ''}
                        ${Math.abs(selectedVarianceItem.weightInfo?.priceVariance || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Driver Note */}
                {selectedVarianceItem.weightInfo?.substitutionReason && (
                  <View style={styles.varianceNoteSection}>
                    <Text style={styles.varianceSectionTitle}>Driver's Note</Text>
                    <View style={styles.varianceNoteCard}>
                      <Text style={styles.varianceNoteText}>
                        {selectedVarianceItem.weightInfo.substitutionReason}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Explanation */}
                <View style={styles.varianceExplanationSection}>
                  <View style={styles.varianceExplanationCard}>
                    <Ionicons name="information-circle" size={20} color="#0369A1" />
                    <Text style={styles.varianceExplanationText}>
                      Your shopper found a different weight than requested. You can approve this variance 
                      to proceed with the actual weight, or reject it if you prefer the original amount.
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.varianceModalActions}>
                <TouchableOpacity
                  style={styles.varianceRejectButton}
                  onPress={handleRejectVariance}
                  disabled={approvingVariance}
                >
                  <Ionicons name="close-circle" size={20} color="#DC2626" />
                  <Text style={styles.varianceRejectButtonText}>Reject</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.varianceApproveButton,
                    approvingVariance && styles.varianceApproveButtonDisabled
                  ]}
                  onPress={handleApproveVariance}
                  disabled={approvingVariance}
                >
                  {approvingVariance ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                  )}
                  <Text style={styles.varianceApproveButtonText}>
                    {approvingVariance ? 'Processing...' : 'Approve Variance'}
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>
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
  section: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusCard: {
    borderRadius: 16,
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusDescription: {
    fontSize: 16,
    marginBottom: 8,
  },
  orderDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 70,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#0F766E',
  },
  stepCircleCurrent: {
    backgroundColor: '#059669',
  },
  stepLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  stepLabelActive: {
    color: '#1F2937',
    fontWeight: '600',
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginTop: 16,
    marginHorizontal: 2,
  },
  stepLineActive: {
    backgroundColor: '#0F766E',
  },
  deliveryInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  infoValue: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  itemCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F766E',
  },
  itemDetails: {
    gap: 2,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#6B7280',
  },
  foundQuantity: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  foundQuantityContainer: {
    gap: 2,
  },
  foundVarianceText: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  itemNotes: {
    fontSize: 14,
    color: '#8B5CF6',
    fontStyle: 'italic',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 16,
    color: '#1F2937',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F766E',
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
  bottomSpacing: {
    height: 32,
  },
  // Driver Information Styles
  driverInfo: {
    gap: 16,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFCCB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  driverRole: {
    fontSize: 14,
    color: '#6B7280',
  },
  callButton: {
    backgroundColor: '#0F766E',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleInfo: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  vehicleDetails: {
    gap: 8,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  vehicleSpecs: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  licensePlateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  licensePlateLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  licensePlate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  // Timeline styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timelineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  timelineToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F766E',
  },
  timelineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  timelineLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  timelineContainer: {
    gap: 0,
  },
  timelineEvent: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 16,
  },
  timelineEventLeft: {
    alignItems: 'center',
    width: 32,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
  },
  timelineEventContent: {
    flex: 1,
    paddingBottom: 4,
  },
  timelineEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  timelineEventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  timelineEventTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  timelineEventMeta: {
    gap: 2,
  },
  timelineEventUser: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  timelineEventDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  timelineEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  timelineEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  metricsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  // Weight-based item styles
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  weightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  weightBadgeText: {
    fontSize: 10,
    color: '#0F766E',
    fontWeight: '500',
  },
  weightBasedDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  pricePerUnitText: {
    fontSize: 13,
    color: '#0F766E',
    fontWeight: '600',
    marginBottom: 4,
  },
  estimatedWeightText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  actualWeightInfo: {
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  actualWeightText: {
    fontSize: 13,
    color: '#0369A1',
    fontWeight: '600',
    marginBottom: 4,
  },
  varianceDisplayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  varianceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  approvalNeededButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  approvalNeededText: {
    fontSize: 11,
    color: '#EA580C',
    fontWeight: '600',
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  approvedText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  rejectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  rejectedText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  weightNotes: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Savings section styles
  savingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  savingsInfo: {
    flex: 1,
  },
  savingsAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 2,
  },
  savingsDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  savingsBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
    gap: 12,
  },
  savingsItem: {
    gap: 4,
  },
  savingsItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  savingsItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savingsItemText: {
    fontSize: 13,
    color: '#6B7280',
  },
  savingsItemAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  savingsFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  savingsFooterText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Variance approval modal styles
  varianceModalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  varianceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  varianceModalCloseButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  varianceModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  varianceModalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  varianceProductInfo: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  varianceProductName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  varianceProductPrice: {
    fontSize: 16,
    color: '#0F766E',
    fontWeight: '600',
  },
  varianceComparisonSection: {
    marginTop: 16,
  },
  varianceSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  varianceComparisonCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  varianceComparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  varianceComparisonLeft: {
    flex: 1,
  },
  varianceComparisonRight: {
    alignItems: 'flex-end',
  },
  varianceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  varianceEstimatedValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  varianceActualValue: {
    fontSize: 16,
    color: '#0F766E',
    fontWeight: '600',
  },
  varianceEstimatedPrice: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  varianceActualPrice: {
    fontSize: 16,
    color: '#0F766E',
    fontWeight: '600',
  },
  varianceComparisonDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  varianceSummarySection: {
    marginTop: 16,
  },
  varianceSummaryCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  varianceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  varianceSummaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  varianceSummaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  varianceNoteSection: {
    marginTop: 16,
  },
  varianceNoteCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6B7280',
  },
  varianceNoteText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  varianceExplanationSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  varianceExplanationCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0369A1',
    gap: 12,
  },
  varianceExplanationText: {
    flex: 1,
    fontSize: 14,
    color: '#0369A1',
    lineHeight: 20,
  },
  varianceModalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  varianceRejectButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DC2626',
    backgroundColor: 'white',
    gap: 8,
  },
  varianceRejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  varianceApproveButton: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0F766E',
    gap: 8,
  },
  varianceApproveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  varianceApproveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
}); 