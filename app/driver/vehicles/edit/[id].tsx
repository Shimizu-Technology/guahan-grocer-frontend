import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,

  SafeAreaView,
  StatusBar,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { vehiclesAPI } from '../../../../services/api';
import { VehicleType, VehicleFormData, Vehicle } from '../../../../types';

const VEHICLE_TYPES: { label: string; value: VehicleType }[] = [
  { label: 'Sedan', value: 'sedan' },
  { label: 'SUV', value: 'suv' },
  { label: 'Truck', value: 'truck' },
  { label: 'Hatchback', value: 'hatchback' },
  { label: 'Coupe', value: 'coupe' },
  { label: 'Convertible', value: 'convertible' },
  { label: 'Van', value: 'van' },
  { label: 'Minivan', value: 'minivan' },
  { label: 'Pickup', value: 'pickup' },
  { label: 'Other', value: 'other' },
];

const VEHICLE_COLORS = [
  'Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Yellow',
  'Orange', 'Purple', 'Brown', 'Gold', 'Maroon', 'Navy', 'Beige', 'Other'
];

export default function EditVehicleScreen() {
  const { id } = useLocalSearchParams();
  const [formData, setFormData] = useState<VehicleFormData>({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    licensePlate: '',
    vehicleType: 'sedan',
  });
  const [loading, setLoading] = useState(false);
  const [fetchingVehicle, setFetchingVehicle] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vehicleTypeDropdownOpen, setVehicleTypeDropdownOpen] = useState(false);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);

  // Fetch vehicle data on component mount
  useEffect(() => {
    if (id) {
      fetchVehicleData();
    }
  }, [id]);

  const fetchVehicleData = async () => {
    try {
      setFetchingVehicle(true);
      const response = await vehiclesAPI.getById(id as string);
      
      if (response.data) {
        const vehicle: Vehicle = response.data;
        setFormData({
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          licensePlate: vehicle.licensePlate,
          vehicleType: vehicle.vehicleType,
        });
      } else {
        Alert.alert('Error', 'Failed to load vehicle data');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      Alert.alert('Error', 'Failed to load vehicle data');
      router.back();
    } finally {
      setFetchingVehicle(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.make.trim()) {
      newErrors.make = 'Make is required';
    }

    if (!formData.model.trim()) {
      newErrors.model = 'Model is required';
    }

    if (!formData.year || formData.year < 1990 || formData.year > new Date().getFullYear() + 1) {
      newErrors.year = 'Please enter a valid year';
    }

    if (!formData.color.trim()) {
      newErrors.color = 'Color is required';
    }

    if (!formData.licensePlate.trim()) {
      newErrors.licensePlate = 'License plate is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await vehiclesAPI.update(id as string, formData);
      
      if (response.data) {
        Alert.alert(
          'Success', 
          'Vehicle updated successfully!', 
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.errors?.[0] || 'Failed to update vehicle');
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      Alert.alert('Error', 'Failed to update vehicle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof VehicleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectVehicleType = (type: VehicleType) => {
    updateFormData('vehicleType', type);
    setVehicleTypeDropdownOpen(false);
  };

  const selectColor = (color: string) => {
    updateFormData('color', color);
    setColorDropdownOpen(false);
  };

  if (fetchingVehicle) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading vehicle data...</Text>
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
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Vehicle</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            disabled={loading}
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
            {/* Form Card */}
            <View style={styles.formCard}>
              {/* Make */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Make *</Text>
                <TextInput
                  style={[styles.input, errors.make && styles.inputError]}
                  value={formData.make}
                  onChangeText={(text) => updateFormData('make', text)}
                  placeholder="e.g., Toyota, Honda, Ford"
                  autoCapitalize="words"
                  maxLength={50}
                />
                {errors.make && <Text style={styles.errorText}>{errors.make}</Text>}
              </View>

              {/* Model */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Model *</Text>
                <TextInput
                  style={[styles.input, errors.model && styles.inputError]}
                  value={formData.model}
                  onChangeText={(text) => updateFormData('model', text)}
                  placeholder="e.g., Camry, Civic, F-150"
                  autoCapitalize="words"
                  maxLength={50}
                />
                {errors.model && <Text style={styles.errorText}>{errors.model}</Text>}
              </View>

              {/* Year */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Year *</Text>
                <TextInput
                  style={[styles.input, errors.year && styles.inputError]}
                  value={formData.year.toString()}
                  onChangeText={(text) => updateFormData('year', parseInt(text) || new Date().getFullYear())}
                  placeholder="e.g., 2020"
                  keyboardType="numeric"
                  maxLength={4}
                />
                {errors.year && <Text style={styles.errorText}>{errors.year}</Text>}
              </View>

              {/* Vehicle Type */}
              <View style={[styles.formGroup, { position: 'relative', zIndex: 2 }]}>
                <Text style={styles.label}>Vehicle Type *</Text>
                <TouchableOpacity
                  style={[styles.input, styles.dropdownButton]}
                  onPress={() => {
                    setVehicleTypeDropdownOpen(!vehicleTypeDropdownOpen);
                    setColorDropdownOpen(false);
                  }}
                >
                  <Text style={styles.dropdownText}>
                    {VEHICLE_TYPES.find(type => type.value === formData.vehicleType)?.label}
                  </Text>
                  <Ionicons 
                    name={vehicleTypeDropdownOpen ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#6B7280" 
                  />
                </TouchableOpacity>
                
                {vehicleTypeDropdownOpen && (
                  <View style={styles.dropdownContainer}>
                    <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                      {VEHICLE_TYPES.map((type) => (
                        <TouchableOpacity
                          key={type.value}
                          style={styles.dropdownOption}
                          onPress={() => selectVehicleType(type.value)}
                        >
                          <Text style={styles.dropdownOptionText}>{type.label}</Text>
                          {formData.vehicleType === type.value && (
                            <Ionicons name="checkmark" size={20} color="#059669" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Color */}
              <View style={[styles.formGroup, { position: 'relative', zIndex: 1 }]}>
                <Text style={styles.label}>Color *</Text>
                <TouchableOpacity
                  style={[styles.input, styles.dropdownButton, errors.color && styles.inputError]}
                  onPress={() => {
                    setColorDropdownOpen(!colorDropdownOpen);
                    setVehicleTypeDropdownOpen(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownText,
                    !formData.color && styles.dropdownPlaceholder
                  ]}>
                    {formData.color || 'Select color'}
                  </Text>
                  <Ionicons 
                    name={colorDropdownOpen ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#6B7280" 
                  />
                </TouchableOpacity>
                
                {colorDropdownOpen && (
                  <View style={styles.dropdownContainer}>
                    <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                      {VEHICLE_COLORS.map((color) => (
                        <TouchableOpacity
                          key={color}
                          style={styles.dropdownOption}
                          onPress={() => selectColor(color)}
                        >
                          <Text style={styles.dropdownOptionText}>{color}</Text>
                          {formData.color === color && (
                            <Ionicons name="checkmark" size={20} color="#059669" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                {errors.color && <Text style={styles.errorText}>{errors.color}</Text>}
              </View>

              {/* License Plate */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>License Plate *</Text>
                <TextInput
                  style={[styles.input, errors.licensePlate && styles.inputError]}
                  value={formData.licensePlate}
                  onChangeText={(text) => updateFormData('licensePlate', text.toUpperCase())}
                  placeholder="e.g., ABC123"
                  autoCapitalize="characters"
                  maxLength={15}
                />
                {errors.licensePlate && <Text style={styles.errorText}>{errors.licensePlate}</Text>}
              </View>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={styles.infoText}>
                Your updated vehicle information will be reviewed by our team before approval for deliveries.
              </Text>
            </View>
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
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  // Dropdown Styles
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#111827',
  },
  dropdownPlaceholder: {
    color: '#9CA3AF',
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#FFFFFF',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownList: {
    maxHeight: 180,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },

});