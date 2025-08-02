import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';

import { addressesAPI } from '../services/api';
import { Address } from '../types';

export default function AddressesScreen() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await addressesAPI.getAll();
      
      if (response.data) {
        setAddresses(response.data as Address[]);
      } else {
        throw new Error(response.error || 'Failed to fetch addresses');
      }
    } catch (err: any) {
      console.error('Failed to fetch addresses:', err);
      setError('Failed to load addresses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = () => {
    router.push('/address-form');
  };

  const handleEditAddress = (address: Address) => {
    router.push(`/address-form?id=${address.id}`);
  };

  const handleMakeDefault = async (address: Address) => {
    if (address.isDefault) return;

    try {
      const response = await addressesAPI.makeDefault(address.id);
      if (response.data) {
        // Update the addresses list to reflect the change
        setAddresses(prev => 
          prev.map(addr => ({
            ...addr,
            isDefault: addr.id === address.id
          }))
        );
      } else {
        throw new Error(response.error || 'Failed to update default address');
      }
    } catch (err: any) {
      console.error('Failed to make address default:', err);
      Alert.alert('Error', 'Failed to update default address. Please try again.');
    }
  };

  const handleDeleteAddress = (address: Address) => {
    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete this address?\n\n${address.fullAddress}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteAddress(address)
        }
      ]
    );
  };

  const deleteAddress = async (address: Address) => {
    try {
      const response = await addressesAPI.delete(address.id);
      if (response.data || response.data === undefined) {
        // Remove from local state
        setAddresses(prev => prev.filter(addr => addr.id !== address.id));
      } else {
        throw new Error(response.error || 'Failed to delete address');
      }
    } catch (err: any) {
      console.error('Failed to delete address:', err);
      Alert.alert('Error', 'Failed to delete address. Please try again.');
    }
  };

  const renderAddressCard = (address: Address) => (
    <View key={address.id} style={styles.addressCard}>
      {/* Header */}
      <View style={styles.addressHeader}>
        <View style={styles.addressTitleContainer}>
          <Text style={styles.addressLabel}>{address.displayLabel}</Text>
          {address.isDefault && (
            <View style={styles.defaultBadge}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => handleEditAddress(address)}
          style={styles.editButton}
        >
          <Ionicons name="pencil" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Address Details */}
      <View style={styles.addressDetails}>
        <View style={styles.addressRow}>
          <Ionicons name="location" size={16} color="#6B7280" />
          <Text style={styles.addressText}>{address.fullAddress}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.addressFooter}>
        <View style={styles.actionsContainer}>
          {!address.isDefault && (
            <TouchableOpacity
              onPress={() => handleMakeDefault(address)}
              style={styles.makeDefaultButton}
            >
              <Ionicons name="star-outline" size={16} color="#0F766E" />
              <Text style={styles.makeDefaultText}>Make Default</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => handleDeleteAddress(address)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={16} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Addresses</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.loadingText}>Loading addresses...</Text>
        </View>
      </SafeAreaView>
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
          <Text style={styles.headerTitle}>Addresses</Text>
          <TouchableOpacity onPress={handleAddAddress} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#0F766E" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
              <Text style={styles.errorTitle}>Error Loading Addresses</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchAddresses}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : addresses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Addresses Yet</Text>
              <Text style={styles.emptyText}>
                Add your first delivery address to get started with ordering groceries.
              </Text>
              <TouchableOpacity style={styles.addFirstButton} onPress={handleAddAddress}>
                <Text style={styles.addFirstText}>Add First Address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.addressList}>
              {addresses.map(renderAddressCard)}
              <View style={styles.bottomSpacing} />
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerRight: {
    width: 32,
  },
  addButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 100,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  addFirstButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  addFirstText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  addressList: {
    padding: 20,
  },
  addressCard: {
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
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressTitleContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  editButton: {
    padding: 4,
  },
  addressDetails: {
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    flex: 1,
  },
  addressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionsContainer: {
    flex: 1,
  },
  makeDefaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  makeDefaultText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F766E',
  },
  deleteButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  bottomSpacing: {
    height: 32,
  },
});
