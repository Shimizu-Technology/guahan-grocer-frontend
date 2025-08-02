import React, { useState } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { vehiclesAPI } from '../../../services/api';
import { VehicleType, VehicleFormData } from '../../../types';

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

export default function AddVehicleScreen() {
  const [formData, setFormData] = useState<VehicleFormData>({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    licensePlate: '',
    vehicleType: 'sedan',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vehicleTypeDropdownOpen, setVehicleTypeDropdownOpen] = useState(false);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.make.trim()) {
      newErrors.make = 'Make is required';
    }

    if (!formData.model.trim()) {
      newErrors.model = 'Model is required';
    }

    if (formData.year < 1990 || formData.year > new Date().getFullYear() + 1) {
      newErrors.year = 'Please enter a valid year';
    }

    if (!formData.color.trim()) {
      newErrors.color = 'Color is required';
    }

    if (!formData.licensePlate.trim()) {
      newErrors.licensePlate = 'License plate is required';
    } else if (formData.licensePlate.length > 15) {
      newErrors.licensePlate = 'License plate too long';
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
      const response = await vehiclesAPI.create(formData);
      
      if (response.data) {
        Alert.alert(
          'Success', 
          'Vehicle added successfully!', 
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.errors?.[0] || 'Failed to add vehicle');
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      Alert.alert('Error', 'Failed to add vehicle. Please try again.');
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

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Vehicle</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Make */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Make *</Text>
            <TextInput
              style={[styles.input, errors.make && styles.inputError]}
              value={formData.make}
              onChangeText={(text) => updateFormData('make', text)}
              placeholder="e.g. Toyota, Honda, Ford"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
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
              placeholder="e.g. Camry, Civic, F-150"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
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
              placeholder="e.g. 2020"
              placeholderTextColor="#9CA3AF"
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
                {VEHICLE_TYPES.find(t => t.value === formData.vehicleType)?.label || 'Select vehicle type...'}
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
                {formData.color || 'Select color...'}
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
              placeholder="e.g. ABC123"
              placeholderTextColor="#9CA3AF"
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
            Your vehicle information will be reviewed by our team before approval for deliveries.
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="car" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Add Vehicle</Text>
            </>
          )}
        </TouchableOpacity>
      </View>


    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40, // Same width as back button to center title
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
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
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },

});