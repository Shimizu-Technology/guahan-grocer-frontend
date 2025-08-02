import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { addressesAPI } from '../services/api';
import { Address } from '../types';
import { locationService, LocationResult } from '../services/locationService';
import { useAuth } from '../context/AuthContext';

interface FormData {
  label: string;
  streetAddress: string;
  apartmentUnit: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

interface FormErrors {
  label?: string;
  streetAddress?: string;
  apartmentUnit?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export default function AddressFormScreen() {
  const { id } = useLocalSearchParams();
  const isEditing = !!id;
  const { user } = useAuth();

  // User context is available via useAuth hook
  
  const [formData, setFormData] = useState<FormData>({
    label: '',
    streetAddress: '',
    apartmentUnit: '',
    city: 'Tamuning',
    state: 'GU',
    zipCode: '96913',
    isDefault: false,
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [fetchingAddress, setFetchingAddress] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<FormData | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      fetchAddress(id as string);
    }
  }, [isEditing, id]);

  // Track changes to enable/disable save button
  useEffect(() => {
    if (originalData) {
      const hasFormChanges = JSON.stringify(formData) !== JSON.stringify(originalData);
      setHasChanges(hasFormChanges);
    } else if (!isEditing) {
      // For new addresses, check if any required fields are filled
      const hasFormChanges = 
        formData.streetAddress.trim() !== '' ||
        formData.label.trim() !== '' ||
        formData.apartmentUnit.trim() !== '' ||
        formData.city !== 'Tamuning' ||
        formData.zipCode !== '96913';
      setHasChanges(hasFormChanges);
    }
  }, [formData, originalData, isEditing]);

  const fetchAddress = async (addressId: string) => {
    try {
      setFetchingAddress(true);
      const response = await addressesAPI.getById(addressId);
      
      if (response.data) {
        const address = response.data as Address;
        const addressFormData = {
          label: address.label || '',
          streetAddress: address.streetAddress,
          apartmentUnit: address.apartmentUnit || '',
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          isDefault: address.isDefault,
        };
        setFormData(addressFormData);
        setOriginalData(addressFormData);
      } else {
        throw new Error(response.error || 'Failed to fetch address');
      }
    } catch (err: any) {
      console.error('Failed to fetch address:', err);
      Alert.alert('Error', 'Failed to load address. Please try again.');
      router.back();
    } finally {
      setFetchingAddress(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Street address validation
    if (!formData.streetAddress.trim()) {
      newErrors.streetAddress = 'Street address is required';
    } else if (formData.streetAddress.trim().length < 5) {
      newErrors.streetAddress = 'Street address must be at least 5 characters';
    }

    // City validation
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    } else if (formData.city.trim().length < 2) {
      newErrors.city = 'City must be at least 2 characters';
    }

    // State validation
    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    // Zip code validation
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!formData.zipCode.trim()) {
      newErrors.zipCode = 'Zip code is required';
    } else if (!zipRegex.test(formData.zipCode.trim())) {
      newErrors.zipCode = 'Please enter a valid zip code (e.g., 96913)';
    }

    // Label validation (optional but if provided, should be reasonable)
    if (formData.label.trim() && formData.label.trim().length > 50) {
      newErrors.label = 'Label must be 50 characters or less';
    }

    // Apartment unit validation (optional but if provided, should be reasonable)
    if (formData.apartmentUnit.trim() && formData.apartmentUnit.trim().length > 50) {
      newErrors.apartmentUnit = 'Apartment/Unit must be 50 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const addressData = {
        label: formData.label.trim() || null,
        street_address: formData.streetAddress.trim(),
        apartment_unit: formData.apartmentUnit.trim() || null,
        city: formData.city.trim(),
        state: formData.state.trim(),
        zip_code: formData.zipCode.trim(),
        is_default: formData.isDefault,
      };

      let response;
      if (isEditing) {
        response = await addressesAPI.update(id as string, addressData);
      } else {
        response = await addressesAPI.create(addressData);
      }

      if (response.data) {
        // Check if this is a new user's first address
        const isFirstAddress = !isEditing;
        
        if (isFirstAddress) {
          // New user flow - redirect to appropriate dashboard
          Alert.alert(
            'Address Added!',
            'Your address has been added successfully. You\'re all set to start ordering!',
            [
              {
                text: 'Start Shopping',
                onPress: () => {
                  const dashboardRoute = user?.role === 'driver' ? '/driver' : 
                                        user?.role === 'admin' ? '/admin' : '/(tabs)';
                  router.replace(dashboardRoute as any);
                }
              }
            ]
          );
        } else {
          // Regular flow - go back to addresses list
          Alert.alert(
            isEditing ? 'Address Updated' : 'Address Added',
            isEditing ? 'Your address has been updated successfully.' : 'Your address has been added successfully.',
            [
              {
                text: 'OK',
                onPress: () => router.back()
              }
            ]
          );
        }
      } else {
        throw new Error(response.error || `Failed to ${isEditing ? 'update' : 'create'} address`);
      }
    } catch (error: any) {
      console.error('Address save failed:', error);
      
      // Handle server validation errors
      if (error?.response?.data?.errors) {
        const serverErrors = error.response.data.errors;
        const newErrors: FormErrors = {};
        
        serverErrors.forEach((errorMsg: string) => {
          if (errorMsg.toLowerCase().includes('street')) {
            newErrors.streetAddress = errorMsg;
          } else if (errorMsg.toLowerCase().includes('city')) {
            newErrors.city = errorMsg;
          } else if (errorMsg.toLowerCase().includes('state')) {
            newErrors.state = errorMsg;
          } else if (errorMsg.toLowerCase().includes('zip')) {
            newErrors.zipCode = errorMsg;
          } else if (errorMsg.toLowerCase().includes('label')) {
            newErrors.label = errorMsg;
          }
        });
        
        setErrors(newErrors);
      } else {
        Alert.alert('Save Failed', `There was an issue ${isEditing ? 'updating' : 'adding'} your address. Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const isFirstAddress = !isEditing && !router.canGoBack();
    
    if (isFirstAddress) {
      // New user trying to cancel their first address
      Alert.alert(
        'Add Address Required',
        'You need to add at least one delivery address to start using Guahan Grocer. Would you like to continue setting up your address?',
        [
          { text: 'Continue Setup', style: 'cancel' },
          { 
            text: 'Skip for Now', 
            onPress: () => {
              const dashboardRoute = user?.role === 'driver' ? '/driver' : 
                                    user?.role === 'admin' ? '/admin' : '/(tabs)';
              router.replace(dashboardRoute as any);
            }, 
            style: 'destructive' 
          }
        ]
      );
    } else if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to cancel?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard Changes', onPress: () => router.back(), style: 'destructive' }
        ]
      );
    } else {
      router.back();
    }
  };

  const clearField = (field: keyof FormErrors) => {
    setFormData(prev => ({ ...prev, [field]: '' }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    
    try {
      const result: LocationResult = await Promise.race([
        locationService.getCurrentLocationWithAddress(),
        // Add a timeout to prevent indefinite waiting
        new Promise<LocationResult>((_, reject) => 
          setTimeout(() => reject(new Error('Location request timed out')), 15000)
        )
      ]);
      
      if (result.success && result.address) {
        // Update form fields with location data
        setFormData(prev => ({
          ...prev,
          streetAddress: result.address!.streetAddress,
          apartmentUnit: '', // Clear apartment unit
          city: result.address!.city,
          state: result.address!.state,
          zipCode: result.address!.zipCode,
        }));
        
        // Clear any existing errors for these fields
        setErrors(prev => ({
          ...prev,
          streetAddress: undefined,
          city: undefined,
          state: undefined,
          zipCode: undefined,
        }));
        
        // Show success message
        Alert.alert(
          'Location Found!',
          `Address: ${result.address.streetAddress}, ${result.address.city}`,
          [{ text: 'OK' }]
        );
      } else {
        // Show error message
        Alert.alert(
          'Location Error',
          result.error || 'Unable to get your current location. Please enter your address manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please enter your address manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  if (fetchingAddress) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.loadingText}>Loading address...</Text>
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
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Address' : (!router.canGoBack() ? 'Add Your First Address' : 'Add Address')}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[
              styles.saveButton,
              (!hasChanges || loading) && styles.saveButtonDisabled
            ]}
            disabled={!hasChanges || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Address Form */}
            <View style={styles.section}>
              <View style={styles.addressHeaderContainer}>
                <Text style={styles.sectionTitle}>Address Information</Text>
                <TouchableOpacity
                  style={[
                    styles.locationButton,
                    isGettingLocation && styles.locationButtonDisabled
                  ]}
                  onPress={handleUseCurrentLocation}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="location" size={14} color="#FFFFFF" />
                  )}
                  <Text style={styles.locationButtonText}>
                    {isGettingLocation ? 'Finding...' : 'Use Location'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.formCard}>
                {/* Label Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Label (Optional)</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.input, errors.label && styles.inputError]}
                      placeholder="Home, Work, etc."
                      value={formData.label}
                      onChangeText={(text) => {
                        setFormData(prev => ({ ...prev, label: text }));
                        if (errors.label) {
                          setErrors(prev => ({ ...prev, label: undefined }));
                        }
                      }}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                    {formData.label.length > 0 && (
                      <TouchableOpacity 
                        style={styles.clearButton}
                        onPress={() => clearField('label')}
                      >
                        <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {errors.label && (
                    <Text style={styles.errorText}>{errors.label}</Text>
                  )}
                </View>

                {/* Street Address Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Street Address *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.input, errors.streetAddress && styles.inputError]}
                      placeholder="123 Marine Corps Dr"
                      value={formData.streetAddress}
                      onChangeText={(text) => {
                        setFormData(prev => ({ ...prev, streetAddress: text }));
                        if (errors.streetAddress) {
                          setErrors(prev => ({ ...prev, streetAddress: undefined }));
                        }
                      }}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                    {formData.streetAddress.length > 0 && (
                      <TouchableOpacity 
                        style={styles.clearButton}
                        onPress={() => clearField('streetAddress')}
                      >
                        <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {errors.streetAddress && (
                    <Text style={styles.errorText}>{errors.streetAddress}</Text>
                  )}
                </View>

                {/* Apartment/Unit Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Apartment/Unit (Optional)</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.input, errors.apartmentUnit && styles.inputError]}
                      placeholder="Apt 2B, Unit 101, etc."
                      value={formData.apartmentUnit}
                      onChangeText={(text) => {
                        setFormData(prev => ({ ...prev, apartmentUnit: text }));
                        if (errors.apartmentUnit) {
                          setErrors(prev => ({ ...prev, apartmentUnit: undefined }));
                        }
                      }}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                    {formData.apartmentUnit.length > 0 && (
                      <TouchableOpacity 
                        style={styles.clearButton}
                        onPress={() => clearField('apartmentUnit')}
                      >
                        <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {errors.apartmentUnit && (
                    <Text style={styles.errorText}>{errors.apartmentUnit}</Text>
                  )}
                </View>

                {/* City and State Row */}
                <View style={styles.rowContainer}>
                  {/* City Field */}
                  <View style={[styles.inputGroup, styles.cityInput]}>
                    <Text style={styles.inputLabel}>City *</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={[styles.input, errors.city && styles.inputError]}
                        placeholder="Tamuning"
                        value={formData.city}
                        onChangeText={(text) => {
                          setFormData(prev => ({ ...prev, city: text }));
                          if (errors.city) {
                            setErrors(prev => ({ ...prev, city: undefined }));
                          }
                        }}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                      {formData.city.length > 0 && formData.city !== 'Tamuning' && (
                        <TouchableOpacity 
                          style={styles.clearButton}
                          onPress={() => {
                            setFormData(prev => ({ ...prev, city: 'Tamuning' }));
                            if (errors.city) {
                              setErrors(prev => ({ ...prev, city: undefined }));
                            }
                          }}
                        >
                          <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                      )}
                    </View>
                    {errors.city && (
                      <Text style={styles.errorText}>{errors.city}</Text>
                    )}
                  </View>

                  {/* State Field */}
                  <View style={[styles.inputGroup, styles.stateInput]}>
                    <Text style={styles.inputLabel}>State *</Text>
                    <TextInput
                      style={[styles.input, errors.state && styles.inputError]}
                      value={formData.state}
                      onChangeText={(text) => {
                        setFormData(prev => ({ ...prev, state: text.toUpperCase() }));
                        if (errors.state) {
                          setErrors(prev => ({ ...prev, state: undefined }));
                        }
                      }}
                      autoCapitalize="characters"
                      maxLength={2}
                      returnKeyType="next"
                    />
                    {errors.state && (
                      <Text style={styles.errorText}>{errors.state}</Text>
                    )}
                  </View>
                </View>

                {/* Zip Code Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Zip Code *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.input, errors.zipCode && styles.inputError]}
                      placeholder="96913"
                      value={formData.zipCode}
                      onChangeText={(text) => {
                        setFormData(prev => ({ ...prev, zipCode: text }));
                        if (errors.zipCode) {
                          setErrors(prev => ({ ...prev, zipCode: undefined }));
                        }
                      }}
                      returnKeyType="done"
                    />
                    {formData.zipCode.length > 0 && formData.zipCode !== '96913' && (
                      <TouchableOpacity 
                        style={styles.clearButton}
                        onPress={() => {
                          setFormData(prev => ({ ...prev, zipCode: '96913' }));
                          if (errors.zipCode) {
                            setErrors(prev => ({ ...prev, zipCode: undefined }));
                          }
                        }}
                      >
                        <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {errors.zipCode && (
                    <Text style={styles.errorText}>{errors.zipCode}</Text>
                  )}
                </View>

                {/* Default Address Toggle */}
                <View style={styles.inputGroup}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setFormData(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                  >
                    <View style={[styles.checkbox, formData.isDefault && styles.checkboxChecked]}>
                      {formData.isDefault && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>Make this my default address</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Info Section */}
            <View style={styles.section}>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoTitle}>
                      {!isEditing && !router.canGoBack() ? 'Getting Started' : 'Delivery Information'}
                    </Text>
                    <Text style={styles.infoText}>
                      {!isEditing && !router.canGoBack() 
                        ? 'Add your delivery address to start ordering fresh groceries from Guahan Grocer. You can always add more addresses later!'
                        : 'This address will be used for grocery deliveries. Make sure it\'s accurate and easy to find.'
                      }
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        </KeyboardAvoidingView>
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
  cancelButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerRight: {
    width: 60,
  },
  saveButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  saveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    paddingRight: 40, // Space for clear button
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    marginTop: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cityInput: {
    flex: 2,
  },
  stateInput: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#374151',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 32,
  },
  addressHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F766E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
