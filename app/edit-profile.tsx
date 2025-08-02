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
import { router, Stack } from 'expo-router';

import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import { User } from '../types';

interface FormData {
  name: string;
  email: string;
  phone: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '+1671',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes to enable/disable save button
  useEffect(() => {
    const hasFormChanges = 
      formData.name !== (user?.name || '') ||
      formData.email !== (user?.email || '') ||
      formData.phone !== (user?.phone || '');
    setHasChanges(hasFormChanges);
  }, [formData, user]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation - flexible for Guam numbers starting with +1671
    const phoneRegex = /^[\+]?[0-9\-\(\)\s]{8,}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.trim() === '+1671') {
      newErrors.phone = 'Please complete your phone number';
    } else if (!phoneRegex.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User information not available. Please try logging in again.');
      return;
    }

    setLoading(true);

    try {
      const response = await usersAPI.update(user.id, {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
      });

      if (response.data) {
        // Extract user data from response and update context
        const userResponse = response.data as UserResponse;
        const updatedUser: User = {
          id: userResponse.id,
          name: userResponse.name,
          email: userResponse.email,
          role: userResponse.role as 'customer' | 'driver' | 'admin',
          phone: userResponse.phone,
        };
        
        updateUser(updatedUser);
        
        Alert.alert(
          'Profile Updated',
          'Your profile has been updated successfully.',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        throw new Error(response.error || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Profile update failed:', error);
      
      // Handle server validation errors
      if (error?.response?.data?.errors) {
        const serverErrors = error.response.data.errors;
        const newErrors: FormErrors = {};
        
        serverErrors.forEach((errorMsg: string) => {
          if (errorMsg.toLowerCase().includes('email')) {
            newErrors.email = errorMsg;
          } else if (errorMsg.toLowerCase().includes('phone')) {
            newErrors.phone = errorMsg;
          } else if (errorMsg.toLowerCase().includes('name')) {
            newErrors.name = errorMsg;
          }
        });
        
        setErrors(newErrors);
      } else {
        Alert.alert('Update Failed', 'There was an issue updating your profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
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
          <Text style={styles.headerTitle}>Edit Profile</Text>
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
            {/* Profile Form */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <View style={styles.formCard}>
                {/* Name Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={[styles.input, errors.name && styles.inputError]}
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, name: text }));
                      if (errors.name) {
                        setErrors(prev => ({ ...prev, name: undefined }));
                      }
                    }}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                  {errors.name && (
                    <Text style={styles.errorText}>{errors.name}</Text>
                  )}
                </View>

                {/* Email Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, email: text }));
                      if (errors.email) {
                        setErrors(prev => ({ ...prev, email: undefined }));
                      }
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                  />
                  {errors.email && (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  )}
                </View>

                {/* Phone Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number *</Text>
                  <TextInput
                    style={[styles.input, errors.phone && styles.inputError]}
                    placeholder="+1671xxxxxxx"
                    value={formData.phone}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, phone: text }));
                      if (errors.phone) {
                        setErrors(prev => ({ ...prev, phone: undefined }));
                      }
                    }}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                  {errors.phone && (
                    <Text style={styles.errorText}>{errors.phone}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Info Section */}
            <View style={styles.section}>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoTitle}>Account Information</Text>
                    <Text style={styles.infoText}>
                      Your email address will be used for account notifications and order updates.
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
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    marginTop: 4,
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
});
