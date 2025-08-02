import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { vehiclesAPI } from '../../../services/api';
import { Vehicle, VehicleType, VerificationStatus } from '../../../types';

export default function VehicleInformationScreen() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchVehicle();
  }, []);

  const fetchVehicle = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await vehiclesAPI.get();
      
      if (response.data) {
        setVehicle(response.data);
      } else {
        setVehicle(null);
      }
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      setVehicle(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!vehicle) return;

    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete your ${vehicle.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await vehiclesAPI.delete(vehicle.id);
              if (response.data) {
                Alert.alert('Success', 'Vehicle deleted successfully');
                setVehicle(null);
              } else {
                Alert.alert('Error', response.errors?.[0] || 'Failed to delete vehicle');
              }
            } catch (error) {
              console.error('Error deleting vehicle:', error);
              Alert.alert('Error', 'Failed to delete vehicle. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getVerificationStatusColor = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return '#059669';
      case 'pending':
        return '#D97706';
      case 'under_review':
        return '#3B82F6';
      case 'rejected':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  const getVerificationStatusText = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'pending':
        return 'Pending';
      case 'under_review':
        return 'Under Review';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const getVehicleTypeIcon = (type: VehicleType) => {
    switch (type) {
      case 'sedan':
        return 'car';
      case 'suv':
        return 'car-sport';
      case 'truck':
      case 'pickup':
        return 'car';
      case 'van':
      case 'minivan':
        return 'bus';
      default:
        return 'car';
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading vehicle information...</Text>
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
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Vehicle Information</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchVehicle(true)}
            colors={['#059669']}
            tintColor="#059669"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {!vehicle ? (
          // No Vehicle State
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="car-outline" size={64} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No Vehicle Registered</Text>
            <Text style={styles.emptySubtitle}>
              Add your vehicle information to start accepting delivery orders
            </Text>
            <TouchableOpacity 
              style={styles.addVehicleButton}
              onPress={() => router.push('/driver/vehicles/add')}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addVehicleButtonText}>Add Vehicle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Vehicle Information Display
          <View style={styles.vehicleContainer}>
            
            {/* Vehicle Status Card */}
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <View style={styles.statusIcon}>
                  <Ionicons 
                    name={vehicle.verificationStatus === 'verified' ? 'checkmark-circle' : 'time'} 
                    size={24} 
                    color={getVerificationStatusColor(vehicle.verificationStatus)} 
                  />
                </View>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusTitle}>Verification Status</Text>
                  <Text 
                    style={[
                      styles.statusValue, 
                      { color: getVerificationStatusColor(vehicle.verificationStatus) }
                    ]}
                  >
                    {getVerificationStatusText(vehicle.verificationStatus)}
                  </Text>
                </View>
              </View>
              
              {vehicle.verificationStatus !== 'verified' && (
                <Text style={styles.statusDescription}>
                  {vehicle.verificationStatus === 'pending' 
                    ? 'Your vehicle is being reviewed by our team.'
                    : vehicle.verificationStatus === 'rejected'
                    ? 'Please update your vehicle information and try again.'
                    : 'Your vehicle verification is under review.'
                  }
                </Text>
              )}
            </View>

            {/* Vehicle Details Card */}
            <View style={styles.detailsCard}>
              <View style={styles.cardHeader}>
                <View style={styles.vehicleIcon}>
                  <Ionicons 
                    name={getVehicleTypeIcon(vehicle.vehicleType)} 
                    size={24} 
                    color="#059669" 
                  />
                </View>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>{vehicle.displayName}</Text>
                  <Text style={styles.vehicleDetails}>{vehicle.color} • {vehicle.licensePlate}</Text>
                </View>
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>{vehicle.vehicleType.charAt(0).toUpperCase() + vehicle.vehicleType.slice(1)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Year</Text>
                  <Text style={styles.detailValue}>{vehicle.year}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Color</Text>
                  <Text style={styles.detailValue}>{vehicle.color}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>License Plate</Text>
                  <Text style={styles.detailValue}>{vehicle.licensePlate}</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsCard}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push(`/driver/vehicles/edit/${vehicle.id}`)}
              >
                <Ionicons name="create-outline" size={20} color="#059669" />
                <Text style={styles.actionButtonText}>Edit Vehicle</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleDeleteVehicle}
              >
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
                <Text style={[styles.actionButtonText, { color: '#DC2626' }]}>Delete Vehicle</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Information Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
                <Text style={styles.infoTitle}>Important</Text>
              </View>
              <Text style={styles.infoText}>
                Your vehicle must be verified before you can accept delivery orders. 
                Please ensure all information is accurate and up to date.
              </Text>
            </View>

          </View>
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    backgroundColor: '#F3F4F6',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  addVehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addVehicleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Vehicle Display
  vehicleContainer: {
    padding: 16,
    gap: 16,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailsGrid: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },

  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 48,
  },

  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});