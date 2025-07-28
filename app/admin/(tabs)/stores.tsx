import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { storesAPI } from '../../../services/api';

interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  active: boolean;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

interface NewStore {
  name: string;
  address: string;
  phone: string;
  latitude: string;
  longitude: string;
  active: boolean;
}

export default function AdminStoresScreen() {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [newStore, setNewStore] = useState<NewStore>({
    name: '',
    address: '',
    phone: '',
    latitude: '',
    longitude: '',
    active: true,
  });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await storesAPI.getAll();
      if (response.data) {
        setStores(response.data as Store[]);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      Alert.alert('Error', 'Failed to fetch stores');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddStore = () => {
    setEditingStore(null);
    setNewStore({
      name: '',
      address: '',
      phone: '',
      latitude: '',
      longitude: '',
      active: true,
    });
    setModalVisible(true);
  };

  const handleEditStore = (store: Store) => {
    setEditingStore(store);
    setNewStore({
      name: store.name,
      address: store.address,
      phone: store.phone,
      latitude: store.latitude.toString(),
      longitude: store.longitude.toString(),
      active: store.active,
    });
    setModalVisible(true);
  };

  const handleSaveStore = async () => {
    if (!newStore.name || !newStore.address || !newStore.latitude || !newStore.longitude) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    
    try {
      const storeData = {
        ...newStore,
        latitude: parseFloat(newStore.latitude),
        longitude: parseFloat(newStore.longitude),
      };

      if (editingStore) {
        await storesAPI.update(editingStore.id, storeData);
        Alert.alert('Success', 'Store updated successfully');
      } else {
        await storesAPI.create(storeData);
        Alert.alert('Success', 'Store created successfully');
      }

      setModalVisible(false);
      fetchStores();
    } catch (error) {
      console.error('Error saving store:', error);
      Alert.alert('Error', 'Failed to save store');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStore = (store: Store) => {
    Alert.alert(
      'Delete Store',
      `Are you sure you want to delete ${store.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await storesAPI.delete(store.id);
              Alert.alert('Success', 'Store deleted successfully');
              fetchStores();
            } catch (error) {
              console.error('Error deleting store:', error);
              Alert.alert('Error', 'Failed to delete store');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (store: Store) => {
    try {
      await storesAPI.toggleActive(store.id);
      fetchStores();
    } catch (error) {
      console.error('Error toggling store status:', error);
      Alert.alert('Error', 'Failed to update store status');
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingStore(null);
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStoreItem = ({ item }: { item: Store }) => (
    <View style={styles.storeCard}>
      <View style={styles.storeHeader}>
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{item.name}</Text>
          <Text style={styles.storeAddress}>{item.address}</Text>
          {item.phone && <Text style={styles.storePhone}>{item.phone}</Text>}
          <Text style={styles.storeCoords}>
            {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
          </Text>
        </View>
        <View style={styles.storeStatus}>
          <Text style={[
            styles.statusText,
            item.active ? styles.statusActive : styles.statusInactive
          ]}>
            {item.active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      
      <View style={styles.storeActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditStore(item)}
        >
          <Ionicons name="pencil" size={16} color="#0F766E" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.toggleButton]}
          onPress={() => handleToggleActive(item)}
        >
          <Ionicons name={item.active ? "pause" : "play"} size={16} color="#F59E0B" />
          <Text style={styles.actionButtonText}>
            {item.active ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteStore(item)}
        >
          <Ionicons name="trash" size={16} color="#EF4444" />
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!user || user.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Access denied. Admin privileges required.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Store Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddStore}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stores..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Stores List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.loadingText}>Loading stores...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStores}
          keyExtractor={(item) => item.id}
          renderItem={renderStoreItem}
          refreshing={refreshing}
          onRefresh={() => fetchStores(true)}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="storefront-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No stores found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try adjusting your search' : 'Add your first store'}
              </Text>
            </View>
          }
        />
      )}

      {/* Add/Edit Store Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingStore ? 'Edit Store' : 'Add New Store'}
            </Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Store Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Payless Supermarket - Tamuning"
                value={newStore.name}
                onChangeText={(text) => setNewStore({ ...newStore, name: text })}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Address *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Full address including city and postal code"
                value={newStore.address}
                onChangeText={(text) => setNewStore({ ...newStore, address: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="(671) 646-7827"
                value={newStore.phone}
                onChangeText={(text) => setNewStore({ ...newStore, phone: text })}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Latitude *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="13.4985"
                  value={newStore.latitude}
                  onChangeText={(text) => setNewStore({ ...newStore, latitude: text })}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Longitude *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="144.7919"
                  value={newStore.longitude}
                  onChangeText={(text) => setNewStore({ ...newStore, longitude: text })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <View style={styles.switchContainer}>
                <Text style={styles.fieldLabel}>Store Status</Text>
                <TouchableOpacity
                  style={[styles.switch, newStore.active && styles.switchActive]}
                  onPress={() => setNewStore({ ...newStore, active: !newStore.active })}
                >
                  <View style={[styles.switchThumb, newStore.active && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldHelp}>
                {newStore.active ? 'Store is active and available' : 'Store is inactive and hidden'}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveStore}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingStore ? 'Update Store' : 'Create Store'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#0F766E',
    borderRadius: 12,
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  storeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  storePhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  storeCoords: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  storeStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  statusInactive: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
  },
  storeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flex: 1,
    marginHorizontal: 2,
    justifyContent: 'center',
  },
  toggleButton: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 50,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  modalForm: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  fieldHalf: {
    flex: 1,
    marginHorizontal: 4,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  fieldHelp: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: '#0F766E',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
}); 