import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

interface RoleSwitcherProps {
  style?: any;
}

export default function RoleSwitcher({ style }: RoleSwitcherProps) {
  const { user, currentViewRole, switchViewRole } = useAuth();

  // Only show for admin users
  if (user?.role !== 'admin') {
    return null;
  }

  const roleOptions = [
    { key: 'admin', label: 'Admin View', icon: 'settings-outline' },
    { key: 'customer', label: 'Customer View', icon: 'person-outline' },
    { key: 'driver', label: 'Driver View', icon: 'car-outline' },
  ] as const;

  const handleRoleSwitch = (role: 'customer' | 'driver' | 'admin') => {
    if (role === currentViewRole) return;

    const roleLabel = roleOptions.find(r => r.key === role)?.label;
    
    Alert.alert(
      'Switch View',
      `Switch to ${roleLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Switch', 
          onPress: () => switchViewRole(role)
        }
      ]
    );
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.sectionTitle}>View As</Text>
      <Text style={styles.description}>
        Switch between different app views to test the user experience
      </Text>
      
      <View style={styles.roleOptions}>
        {roleOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.roleOption,
              currentViewRole === option.key && styles.roleOptionActive
            ]}
            onPress={() => handleRoleSwitch(option.key)}
          >
            <Ionicons 
              name={option.icon as any}
              size={20} 
              color={currentViewRole === option.key ? '#0F766E' : '#6B7280'} 
            />
            <Text style={[
              styles.roleOptionText,
              currentViewRole === option.key && styles.roleOptionTextActive
            ]}>
              {option.label}
            </Text>
            {currentViewRole === option.key && (
              <View style={styles.activeIndicator}>
                <Ionicons name="checkmark-circle" size={16} color="#0F766E" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      {currentViewRole !== 'admin' && (
        <View style={styles.statusBanner}>
          <Ionicons name="eye-outline" size={16} color="#0F766E" />
          <Text style={styles.statusText}>
            Currently viewing as {roleOptions.find(r => r.key === currentViewRole)?.label}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  roleOptions: {
    gap: 8,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleOptionActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#0F766E',
  },
  roleOptionText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 12,
    flex: 1,
  },
  roleOptionTextActive: {
    color: '#0F766E',
    fontWeight: '500',
  },
  activeIndicator: {
    marginLeft: 8,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#0F766E',
    fontWeight: '500',
  },
});
