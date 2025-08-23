import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';

import { useAuth } from '../context/AuthContext';
import { userPreferencesAPI } from '../services/api';
import { UserPreferences } from '../types';

export default function WeightPreferencesScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    autoApproveVariances: false,
    maxAutoVariancePercentage: 15,
    autoApproveOveragesOnly: false,
    varianceNotificationMethod: 'push',
    approvalTimeoutMinutes: 10,
  });

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await userPreferencesAPI.get(user.id);
      
      if (response.data) {
        // Extract preferences from nested API response structure
        const apiData = response.data;
        const paymentPrefs = apiData.paymentPreferences || {};
        
        const extractedPreferences: UserPreferences = {
          autoApproveVariances: paymentPrefs.autoApproveVariances || false,
          maxAutoVariancePercentage: paymentPrefs.maxAutoVariancePercentage || 15,
          autoApproveOveragesOnly: paymentPrefs.autoApproveOveragesOnly || false,
          varianceNotificationMethod: paymentPrefs.varianceNotificationMethod || 'push',
          approvalTimeoutMinutes: paymentPrefs.approvalTimeoutMinutes || 10,
        };
        
        console.log('🔧 Fetched preferences from API:', apiData);
        console.log('📋 Extracted preferences for UI:', extractedPreferences);
        
        setPreferences(extractedPreferences);
      } else {
        console.error('Failed to fetch preferences:', response.error);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      Alert.alert('Error', 'Failed to load preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      const response = await userPreferencesAPI.update(user.id, preferences);
      
      if (response.data) {
        // Extract updated preferences from API response
        const updatedPrefs = response.data.preferences || {};
        
        const extractedPreferences: UserPreferences = {
          autoApproveVariances: updatedPrefs.autoApproveVariances || false,
          maxAutoVariancePercentage: updatedPrefs.maxAutoVariancePercentage || 15,
          autoApproveOveragesOnly: updatedPrefs.autoApproveOveragesOnly || false,
          varianceNotificationMethod: updatedPrefs.varianceNotificationMethod || 'push',
          approvalTimeoutMinutes: updatedPrefs.approvalTimeoutMinutes || 10,
        };
        
        console.log('✅ Saved preferences response:', response.data);
        console.log('📋 Updated UI preferences:', extractedPreferences);
        
        setPreferences(extractedPreferences);
        Alert.alert('Success', 'Your preferences have been saved successfully.');
      } else {
        throw new Error(response.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const percentageOptions = [5, 10, 15, 20, 25, 30];
  const timeoutOptions = [5, 10, 15, 20, 30];

  if (loading) {
    return (
      <>
        <Stack.Screen 
          options={{
            headerShown: false,
          }}
        />
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Weight Preferences</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={styles.loadingText}>Loading preferences...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Weight Preferences</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Introduction */}
          <View style={styles.section}>
            <View style={styles.introCard}>
              <Ionicons name="scale" size={32} color="#0F766E" />
              <Text style={styles.introTitle}>Weight Variance Settings</Text>
              <Text style={styles.introText}>
                Configure how you want to handle weight differences when your shopper finds 
                items that weigh more or less than you requested.
              </Text>
            </View>
          </View>

          {/* Auto-Approval Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Auto-Approval</Text>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Enable Auto-Approval</Text>
                  <Text style={styles.settingDescription}>
                    Automatically approve weight variances within your tolerance
                  </Text>
                </View>
                <Switch
                  value={preferences.autoApproveVariances}
                  onValueChange={(value) => updatePreference('autoApproveVariances', value)}
                  trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                  thumbColor={preferences.autoApproveVariances ? '#059669' : '#6B7280'}
                />
              </View>

              {preferences.autoApproveVariances && (
                <>
                  <View style={styles.settingDivider} />
                  
                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <Text style={styles.settingLabel}>Maximum Variance</Text>
                      <Text style={styles.settingDescription}>
                        Auto-approve variances up to this percentage
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.optionsGrid}>
                    {percentageOptions.map((percentage) => (
                      <TouchableOpacity
                        key={percentage}
                        style={[
                          styles.optionButton,
                          preferences.maxAutoVariancePercentage === percentage && styles.optionButtonActive
                        ]}
                        onPress={() => updatePreference('maxAutoVariancePercentage', percentage)}
                      >
                        <Text style={[
                          styles.optionButtonText,
                          preferences.maxAutoVariancePercentage === percentage && styles.optionButtonTextActive
                        ]}>
                          {percentage}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.settingDivider} />

                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <Text style={styles.settingLabel}>Only Auto-Approve Overages</Text>
                      <Text style={styles.settingDescription}>
                        Only approve when you get more than requested, not less
                      </Text>
                    </View>
                    <Switch
                      value={preferences.autoApproveOveragesOnly}
                      onValueChange={(value) => updatePreference('autoApproveOveragesOnly', value)}
                      trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                      thumbColor={preferences.autoApproveOveragesOnly ? '#059669' : '#6B7280'}
                    />
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Notification Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Settings</Text>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Approval Timeout</Text>
                  <Text style={styles.settingDescription}>
                    How long to wait for manual approval before auto-rejecting
                  </Text>
                </View>
              </View>
              
              <View style={styles.optionsGrid}>
                {timeoutOptions.map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.optionButton,
                      preferences.approvalTimeoutMinutes === minutes && styles.optionButtonActive
                    ]}
                    onPress={() => updatePreference('approvalTimeoutMinutes', minutes)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      preferences.approvalTimeoutMinutes === minutes && styles.optionButtonTextActive
                    ]}>
                      {minutes}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.settingDivider} />

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Notification Method</Text>
                  <Text style={styles.settingDescription}>
                    How you want to be notified of variances
                  </Text>
                </View>
              </View>
              
              <View style={styles.notificationOptions}>
                <TouchableOpacity
                  style={[
                    styles.notificationOption,
                    preferences.varianceNotificationMethod === 'push' && styles.notificationOptionActive
                  ]}
                  onPress={() => updatePreference('varianceNotificationMethod', 'push')}
                >
                  <Ionicons 
                    name="notifications" 
                    size={20} 
                    color={preferences.varianceNotificationMethod === 'push' ? '#059669' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.notificationOptionText,
                    preferences.varianceNotificationMethod === 'push' && styles.notificationOptionTextActive
                  ]}>
                    Push Notification
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.notificationOption,
                    preferences.varianceNotificationMethod === 'sms' && styles.notificationOptionActive
                  ]}
                  onPress={() => updatePreference('varianceNotificationMethod', 'sms')}
                >
                  <Ionicons 
                    name="chatbubble" 
                    size={20} 
                    color={preferences.varianceNotificationMethod === 'sms' ? '#059669' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.notificationOptionText,
                    preferences.varianceNotificationMethod === 'sms' && styles.notificationOptionTextActive
                  ]}>
                    SMS Message
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Example Scenarios */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How It Works</Text>
            <View style={styles.card}>
              <View style={styles.exampleHeader}>
                <Ionicons name="bulb" size={20} color="#F59E0B" />
                <Text style={styles.exampleTitle}>Example Scenarios</Text>
              </View>
              
              <View style={styles.example}>
                <View style={styles.exampleIcon}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                </View>
                <View style={styles.exampleContent}>
                  <Text style={styles.exampleText}>
                    You request 1 lb of ground beef, driver finds 1.1 lb (+10%)
                  </Text>
                  <Text style={styles.exampleResult}>
                    {preferences.autoApproveVariances && 10 <= preferences.maxAutoVariancePercentage
                      ? '✅ Auto-approved (within your 15% tolerance)'
                      : '⏳ Requires manual approval'
                    }
                  </Text>
                </View>
              </View>
              
              <View style={styles.example}>
                <View style={styles.exampleIcon}>
                  <Ionicons 
                    name={preferences.autoApproveOveragesOnly ? "close-circle" : "checkmark-circle"} 
                    size={16} 
                    color={preferences.autoApproveOveragesOnly ? "#DC2626" : "#059669"} 
                  />
                </View>
                <View style={styles.exampleContent}>
                  <Text style={styles.exampleText}>
                    You request 2 lbs of chicken, driver finds 1.8 lbs (-10%)
                  </Text>
                  <Text style={styles.exampleResult}>
                    {preferences.autoApproveVariances && !preferences.autoApproveOveragesOnly && 10 <= preferences.maxAutoVariancePercentage
                      ? '✅ Auto-approved (within tolerance, underages allowed)'
                      : preferences.autoApproveOveragesOnly
                        ? '⏳ Requires approval (underages not auto-approved)'
                        : '⏳ Requires manual approval'
                    }
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={savePreferences}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="checkmark" size={20} color="white" />
            )}
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </Text>
          </TouchableOpacity>
        </View>
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
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  introCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 8,
  },
  introText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  settingLeft: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
    minWidth: 60,
    alignItems: 'center',
  },
  optionButtonActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  optionButtonTextActive: {
    color: '#059669',
  },
  notificationOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  notificationOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
    gap: 8,
  },
  notificationOptionActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  notificationOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  notificationOptionTextActive: {
    color: '#059669',
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  example: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  exampleIcon: {
    marginTop: 2,
  },
  exampleContent: {
    flex: 1,
  },
  exampleText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  exampleResult: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  saveButton: {
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});