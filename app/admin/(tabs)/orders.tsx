import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminOrders() {
  const [selectedFilter, setSelectedFilter] = useState('all');

  const orders = [
    {
      id: '#ORD005',
      customer: 'Maria Santos',
      driver: 'Jane Driver',
      status: 'in_progress',
      total: '$45.80',
      items: 12,
      store: 'PayLess Supermarket',
      time: '15 min ago',
    },
    {
      id: '#ORD004',
      customer: 'John Doe',
      driver: 'Mike Wilson',
      status: 'completed',
      total: '$38.50',
      items: 8,
      store: 'Island Fresh Market',
      time: '1 hour ago',
    },
    {
      id: '#ORD003',
      customer: 'Sarah Johnson',
      driver: 'Unassigned',
      status: 'pending',
      total: '$67.20',
      items: 15,
      store: 'PayLess Supermarket',
      time: '2 hours ago',
    },
    {
      id: '#ORD002',
      customer: 'Ana Perez',
      driver: 'Carlos Rodriguez',
      status: 'delivered',
      total: '$28.90',
      items: 6,
      store: 'Island Fresh Market',
      time: '3 hours ago',
    },
  ];

  const filters = [
    { key: 'all', label: 'All Orders', count: orders.length },
    { key: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length },
    { key: 'in_progress', label: 'In Progress', count: orders.filter(o => o.status === 'in_progress').length },
    { key: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed').length },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#EA580C';
      case 'in_progress': return '#0F766E';
      case 'completed': return '#7C3AED';
      case 'delivered': return '#16A34A';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'Shopping';
      case 'completed': return 'Ready';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  const filteredOrders = selectedFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === selectedFilter);

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

        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map((filter) => (
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
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Orders List */}
        <ScrollView 
          style={styles.ordersList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 12 }}
        >
          {filteredOrders.map((order) => (
            <TouchableOpacity key={order.id} style={styles.orderCard}>
              {/* Order Header */}
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>{order.id}</Text>
                  <Text style={styles.orderTime}>{order.time}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}15` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                    {getStatusText(order.status)}
                  </Text>
                </View>
              </View>

              {/* Customer & Driver Info */}
              <View style={styles.participantsRow}>
                <View style={styles.participant}>
                  <Ionicons name="person-outline" size={16} color="#6B7280" />
                  <Text style={styles.participantText}>{order.customer}</Text>
                </View>
                <View style={styles.participant}>
                  <Ionicons name="car-outline" size={16} color="#6B7280" />
                  <Text style={[
                    styles.participantText,
                    order.driver === 'Unassigned' && styles.unassignedText
                  ]}>
                    {order.driver}
                  </Text>
                </View>
              </View>

              {/* Order Details */}
              <View style={styles.orderDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="storefront-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{order.store}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="list-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{order.items} items</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="cash-outline" size={16} color="#6B7280" />
                  <Text style={styles.totalText}>{order.total}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="eye-outline" size={16} color="#0F766E" />
                  <Text style={styles.actionButtonText}>View Details</Text>
                </TouchableOpacity>
                {order.driver === 'Unassigned' && (
                  <TouchableOpacity style={[styles.actionButton, styles.assignButton]}>
                    <Ionicons name="person-add-outline" size={16} color="#7C3AED" />
                    <Text style={[styles.actionButtonText, { color: '#7C3AED' }]}>Assign Driver</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
          
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  searchButton: {
    padding: 8,
  },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 8, // Minimal padding for clean look
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6, // Reduced padding for cleaner look
    marginRight: 10,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    height: 32, // Fixed height for consistency
    justifyContent: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#0F766E',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  activeFilterText: {
    color: 'white',
  },
  ordersList: {
    // Removed flex: 1 - let ScrollView size naturally
  },
  orderCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
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
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  orderTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  participantsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  participant: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantText: {
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 6,
  },
  unassignedText: {
    color: '#DC2626',
    fontStyle: 'italic',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  totalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F766E',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0F766E',
  },
  assignButton: {
    borderColor: '#7C3AED',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F766E',
    marginLeft: 4,
  },
  bottomSpacing: {
    height: 100,
  },
}); 