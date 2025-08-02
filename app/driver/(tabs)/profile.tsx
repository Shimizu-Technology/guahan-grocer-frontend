import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '../../../context/AuthContext';
import { driverStatsAPI, vehiclesAPI } from '../../../services/api';
import { Vehicle } from '../../../types';

interface DriverStats {
  totalDeliveries: number;
  memberSince: string;
  verificationStatus: 'verified' | 'pending' | 'incomplete';
}

export default function DriverProfile() {
  const { user, logout, isOnline, toggleOnline } = useAuth();
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);
  const [driverStats, setDriverStats] = useState<DriverStats>({
    totalDeliveries: 0,
    memberSince: user?.createdAt || new Date().toISOString(),
    verificationStatus: 'verified',
  });
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  // Fetch real driver stats
  useEffect(() => {
    const fetchDriverStats = async () => {
      try {
        // Get all-time stats by getting the last 30 days and summing up
        const statsResponse = await driverStatsAPI.getStats();
        if (statsResponse.data && Array.isArray(statsResponse.data)) {
          const allStats = statsResponse.data as any[];
          const totalDeliveries = allStats.reduce((sum, stat) => sum + (stat.totalDeliveries || 0), 0);
          
          setDriverStats({
            totalDeliveries: totalDeliveries,
            memberSince: user?.createdAt || new Date().toISOString(),
            verificationStatus: 'verified',
          });
        } else {
          // Fallback to today's stats if all-time stats not available
          const today = new Date().toISOString().split('T')[0];
          const todayStatsResponse = await driverStatsAPI.getStatsForDate(today);
          if (todayStatsResponse.data) {
            const stats = todayStatsResponse.data as any;
            setDriverStats({
              totalDeliveries: stats.totalDeliveries || 0,
              memberSince: user?.createdAt || new Date().toISOString(),
              verificationStatus: 'verified',
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch driver stats:', error);
      }
    };

    fetchDriverStats();
  }, [user]);

  // Fetch vehicle
  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const response = await vehiclesAPI.get();
        if (response.data) {
          setVehicle(response.data as Vehicle);
        }
      } catch (error) {
        console.error('Failed to fetch vehicle:', error);
      }
    };

    fetchVehicle();
  }, []);

  const getVehicleStatus = () => {
    if (!vehicle) {
      return { status: 'incomplete', text: 'Action Required', color: '#DC2626' };
    }
    
    if (vehicle.verificationStatus === 'verified') {
      return { status: 'complete', text: 'Complete', color: '#059669' };
    }
    
    if (vehicle.verificationStatus === 'pending' || vehicle.verificationStatus === 'under_review') {
      return { status: 'pending', text: 'Under Review', color: '#D97706' };
    }
    
    return { status: 'incomplete', text: 'Action Required', color: '#DC2626' };
  };

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

  const handleEmergencyContact = () => {
    Alert.alert(
      'Emergency Contact',
      'Call emergency services?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 911', style: 'destructive', onPress: () => {} }
      ]
    );
  };

  const getVerificationIcon = () => {
    switch (driverStats.verificationStatus) {
      case 'verified':
        return <Ionicons name="checkmark-circle" size={20} color="#059669" />;
      case 'pending':
        return <Ionicons name="time" size={20} color="#D97706" />;
      default:
        return <Ionicons name="alert-circle" size={20} color="#DC2626" />;
    }
  };

  const getVerificationText = () => {
    switch (driverStats.verificationStatus) {
      case 'verified':
        return 'Verified Driver';
      case 'pending':
        return 'Verification Pending';
      default:
        return 'Incomplete Verification';
    }
  };



  const formatMemberSince = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setSettingsModalVisible(true)}
          >
            <Ionicons name="settings" size={20} color="#0F766E" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Driver Profile Card */}
          <View style={styles.profileCard}>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={32} color="#6B7280" />
                </View>
                <TouchableOpacity style={styles.editAvatarButton}>
                  <Ionicons name="camera" size={12} color="white" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{user?.name || 'Driver'}</Text>
                  {getVerificationIcon()}
                </View>
                <Text style={styles.userEmail}>{user?.email}</Text>
                <View style={styles.badgeRow}>
                  <Text style={styles.verificationText}>{getVerificationText()}</Text>
                </View>
              </View>
            </View>

            {/* Driver Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{driverStats.totalDeliveries}</Text>
                <Text style={styles.statLabel}>Deliveries</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatMemberSince(driverStats.memberSince)}</Text>
                <Text style={styles.statLabel}>Member Since</Text>
              </View>
            </View>

            {/* Online Status Toggle */}
            <View style={styles.onlineSection}>
              <View style={styles.onlineInfo}>
                <Text style={styles.onlineLabel}>Driver Status</Text>
                <Text style={[styles.onlineStatus, { color: isOnline ? '#059669' : '#6B7280' }]}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
              <Switch
                value={isOnline}
                onValueChange={toggleOnline}
                trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
                thumbColor={isOnline ? '#0F766E' : '#9CA3AF'}
              />
            </View>
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.menuSection}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/edit-profile')}
              >
                <Ionicons name="person-outline" size={24} color="#6B7280" />
                <Text style={styles.menuText}>Edit Profile</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>


            </View>
          </View>

          {/* Driver Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Driver</Text>
            <View style={styles.menuSection}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/driver/vehicles')}
              >
                <Ionicons name="car-outline" size={24} color="#6B7280" />
                <Text style={styles.menuText}>Vehicle Information</Text>
                <View 
                  style={[
                    styles.menuBadge, 
                    { backgroundColor: getVehicleStatus().status === 'complete' ? '#D1FAE5' : 
                      getVehicleStatus().status === 'pending' ? '#FEF3C7' : '#FEE2E2' }
                  ]}
                >
                  <Text 
                    style={[
                      styles.menuBadgeText, 
                      { color: getVehicleStatus().color }
                    ]}
                  >
                    {getVehicleStatus().text}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Commented out until implemented
              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="document-text-outline" size={24} color="#6B7280" />
                <Text style={styles.menuText}>Documents</Text>
                {driverStats.verificationStatus !== 'verified' && (
                  <View style={[styles.menuBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.menuBadgeText, { color: '#92400E' }]}>Action Required</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="time-outline" size={24} color="#6B7280" />
                <Text style={styles.menuText}>Work Schedule</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="location-outline" size={24} color="#6B7280" />
                <Text style={styles.menuText}>Delivery Preferences</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              */}
            </View>
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support & Safety</Text>
            <View style={styles.menuSection}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={handleEmergencyContact}
              >
                <Ionicons name="call" size={24} color="#DC2626" />
                <Text style={[styles.menuText, { color: '#DC2626', fontWeight: '600' }]}>Emergency Contact</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="chatbubble-outline" size={24} color="#6B7280" />
                <Text style={styles.menuText}>Chat with Support</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="help-circle-outline" size={24} color="#6B7280" />
                <Text style={styles.menuText}>Help Center</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="flag-outline" size={24} color="#6B7280" />
                <Text style={styles.menuText}>Report an Issue</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Legal Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Legal</Text>
            <View style={styles.menuSection}>
              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="document-outline" size={24} color="#6B7280" />
                <Text style={styles.menuText}>Terms of Service</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="lock-closed-outline" size={24} color="#6B7280" />
                <Text style={styles.menuText}>Privacy Policy</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="calculator-outline" size={24} color="#6B7280" />
                <Text style={styles.menuText}>Tax Information</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Out */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#DC2626" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Settings Modal */}
        <Modal
          visible={settingsModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSettingsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Driver Settings</Text>
                <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.settingSection}>
                <Text style={styles.settingTitle}>Notifications</Text>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
                    thumbColor={notificationsEnabled ? '#0F766E' : '#9CA3AF'}
                  />
                </View>
              </View>

              <View style={styles.settingSection}>
                <Text style={styles.settingTitle}>Order Preferences</Text>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Auto-Accept High Value Orders</Text>
                  <Switch
                    value={autoAcceptOrders}
                    onValueChange={setAutoAcceptOrders}
                    trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
                    thumbColor={autoAcceptOrders ? '#0F766E' : '#9CA3AF'}
                  />
                </View>
                <Text style={styles.settingDescription}>
                  Automatically accept orders over $20 when you're online
                </Text>
              </View>

              <View style={styles.settingSection}>
                <Text style={styles.settingTitle}>Distance Preferences</Text>
                <TouchableOpacity style={styles.preferenceButton}>
                  <Text style={styles.preferenceLabel}>Maximum Distance</Text>
                  <View style={styles.preferenceValue}>
                    <Text style={styles.preferenceValueText}>15 miles</Text>
                    <Ionicons name="chevron-forward" size={16} color="#6B7280" />
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.saveButton}
                onPress={() => setSettingsModalVisible(false)}
              >
                <Text style={styles.saveButtonText}>Save Settings</Text>
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
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  // Profile Card
  profileCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0F766E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  verificationText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },

  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F766E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Online Status
  onlineSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
  },
  onlineInfo: {
    flex: 1,
  },
  onlineLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  onlineStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Menu Sections
  menuSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  menuBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#166534',
  },
  // Sign Out Button
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
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
  settingSection: {
    marginBottom: 32,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 14,
    color: '#374151',
  },
  settingDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  preferenceButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  preferenceLabel: {
    fontSize: 14,
    color: '#374151',
  },
  preferenceValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  preferenceValueText: {
    fontSize: 14,
    color: '#0F766E',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#0F766E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 100,
  },
});