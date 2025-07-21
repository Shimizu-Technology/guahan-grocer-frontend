import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminUsers() {
  const [selectedFilter, setSelectedFilter] = useState('all');

  const users = [
    {
      id: 1,
      name: 'John Customer',
      email: 'john@example.com',
      role: 'customer',
      status: 'active',
      joinDate: '2024-01-15',
      totalOrders: 23,
      lastActivity: '2 hours ago',
    },
    {
      id: 2,
      name: 'Jane Driver',
      email: 'jane@example.com',
      role: 'driver',
      status: 'active',
      joinDate: '2023-12-01',
      completedDeliveries: 156,
      rating: 4.8,
      lastActivity: '15 min ago',
    },
    {
      id: 3,
      name: 'Maria Santos',
      email: 'maria@example.com',
      role: 'customer',
      status: 'active',
      joinDate: '2024-02-10',
      totalOrders: 8,
      lastActivity: '1 day ago',
    },
    {
      id: 4,
      name: 'Mike Wilson',
      email: 'mike@example.com',
      role: 'driver',
      status: 'inactive',
      joinDate: '2023-11-15',
      completedDeliveries: 89,
      rating: 4.6,
      lastActivity: '1 week ago',
    },
    {
      id: 5,
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
      joinDate: '2023-10-01',
      lastActivity: 'Online now',
    },
  ];

  const filters = [
    { key: 'all', label: 'All Users', count: users.length },
    { key: 'customer', label: 'Customers', count: users.filter(u => u.role === 'customer').length },
    { key: 'driver', label: 'Drivers', count: users.filter(u => u.role === 'driver').length },
    { key: 'admin', label: 'Admins', count: users.filter(u => u.role === 'admin').length },
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'customer': return '#0F766E';
      case 'driver': return '#7C3AED';
      case 'admin': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? '#16A34A' : '#6B7280';
  };

  const handleUserAction = (action: string, userName: string) => {
    Alert.alert('User Action', `${action} ${userName} would be performed here.`);
  };

  const filteredUsers = selectedFilter === 'all' 
    ? users 
    : users.filter(user => user.role === selectedFilter);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>User Management</Text>
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

        {/* Users List */}
        <ScrollView 
          style={styles.usersList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 12 }}
        >
          {filteredUsers.map((user) => (
            <TouchableOpacity key={user.id} style={styles.userCard}>
              {/* User Header */}
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View style={styles.badges}>
                  <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(user.role)}15` }]}>
                    <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(user.status)}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(user.status) }]}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* User Stats */}
              <View style={styles.userStats}>
                <View style={styles.statItem}>
                  <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                  <Text style={styles.statText}>Joined {user.joinDate}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                  <Text style={styles.statText}>{user.lastActivity}</Text>
                </View>
              </View>

              {/* Role-specific Stats */}
              {user.role === 'customer' && (
                <View style={styles.roleStats}>
                  <View style={styles.roleStatItem}>
                    <Ionicons name="bag-outline" size={16} color="#0F766E" />
                    <Text style={styles.roleStatText}>{user.totalOrders} orders</Text>
                  </View>
                </View>
              )}

              {user.role === 'driver' && (
                <View style={styles.roleStats}>
                  <View style={styles.roleStatItem}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#7C3AED" />
                    <Text style={styles.roleStatText}>{user.completedDeliveries} deliveries</Text>
                  </View>
                  <View style={styles.roleStatItem}>
                    <Ionicons name="star-outline" size={16} color="#EA580C" />
                    <Text style={styles.roleStatText}>{user.rating} rating</Text>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleUserAction('View Profile', user.name)}
                >
                  <Ionicons name="eye-outline" size={16} color="#0F766E" />
                  <Text style={styles.actionButtonText}>View</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleUserAction('Edit', user.name)}
                >
                  <Ionicons name="create-outline" size={16} color="#7C3AED" />
                  <Text style={[styles.actionButtonText, { color: '#7C3AED' }]}>Edit</Text>
                </TouchableOpacity>
                
                {user.status === 'active' ? (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.suspendButton]}
                    onPress={() => handleUserAction('Suspend', user.name)}
                  >
                    <Ionicons name="pause-circle-outline" size={16} color="#EA580C" />
                    <Text style={[styles.actionButtonText, { color: '#EA580C' }]}>Suspend</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.activateButton]}
                    onPress={() => handleUserAction('Activate', user.name)}
                  >
                    <Ionicons name="play-circle-outline" size={16} color="#16A34A" />
                    <Text style={[styles.actionButtonText, { color: '#16A34A' }]}>Activate</Text>
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
  usersList: {
    // Removed flex: 1 - let ScrollView size naturally
  },
  userCard: {
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
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  badges: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  roleStats: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  roleStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  roleStatText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
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
  editButton: {
    borderColor: '#7C3AED',
  },
  suspendButton: {
    borderColor: '#EA580C',
  },
  activateButton: {
    borderColor: '#16A34A',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
    marginLeft: 4,
  },
  bottomSpacing: {
    height: 100,
  },
}); 