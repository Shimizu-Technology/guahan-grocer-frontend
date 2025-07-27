import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { itemCount, total } = useCart();
  const { favoritesCount } = useFavorites();

  // Show login prompt for guests
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.guestContainer}>
          <Ionicons name="person-outline" size={64} color="#D1D5DB" />
          <Text style={styles.guestTitle}>Sign in to view profile</Text>
          <Text style={styles.guestSubtitle}>
            Create an account or sign in to manage your profile and view order history
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout }
      ]
    );
  };

  const statsData = [
    {
      icon: 'bag-outline',
      label: 'Items in Cart',
      value: itemCount.toString(),
      color: '#0F766E'
    },
    {
      icon: 'heart-outline',
      label: 'Favorites',
      value: favoritesCount.toString(),
      color: '#E67E52'
    },
    {
      icon: 'card-outline',
      label: 'Cart Total',
      value: `$${total.toFixed(2)}`,
      color: '#8B5CF6'
    }
  ];

  const menuItems = [
    {
      icon: 'person-outline',
      label: 'Edit Profile',
      subtitle: 'Update your personal information',
      onPress: () => Alert.alert('Feature Coming Soon', 'Profile editing will be available soon!')
    },
    {
      icon: 'location-outline',
      label: 'Addresses',
      subtitle: 'Manage delivery addresses',
      onPress: () => Alert.alert('Feature Coming Soon', 'Address management will be available soon!')
    },
    {
      icon: 'card-outline',
      label: 'Payment Methods',
      subtitle: 'Manage payment options',
      onPress: () => Alert.alert('Feature Coming Soon', 'Payment methods will be available soon!')
    },
    {
      icon: 'receipt-outline',
      label: 'Order History',
      subtitle: 'View past orders',
      onPress: () => Alert.alert('Feature Coming Soon', 'Order history will be available soon!')
    },
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      subtitle: 'Notification preferences',
      onPress: () => Alert.alert('Feature Coming Soon', 'Notification settings will be available soon!')
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      subtitle: 'Get help and contact support',
      onPress: () => Alert.alert('Feature Coming Soon', 'Help & support will be available soon!')
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitials}>
                {user?.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <View style={styles.roleTag}>
                <Text style={styles.roleText}>{user?.role.charAt(0).toUpperCase()}{user?.role.slice(1)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsGrid}>
            {statsData.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuItemIcon}>
                  <Ionicons name={item.icon as any} size={24} color="#6B7280" />
                </View>
                <View style={styles.menuItemText}>
                  <Text style={styles.menuItemLabel}>{item.label}</Text>
                  <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoCard}>
            <Text style={styles.appName}>Guahan Grocer</Text>
            <Text style={styles.appVersion}>Version 1.0.0 (React Native)</Text>
            <Text style={styles.appDescription}>
              Fresh groceries delivered to your door. Built with React Native and Expo.
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    backgroundColor: '#14B8A6',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileEmail: {
    color: '#B2F5EA',
    fontSize: 14,
    marginTop: 4,
  },
  roleTag: {
    backgroundColor: '#14B8A6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  menuSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    flex: 1,
    marginLeft: 12,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  appVersion: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  appDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 12,
  },
  logoutSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoutButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 20,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 