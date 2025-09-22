import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

interface ViewRoleIndicatorProps {
  style?: any;
}

export default function ViewRoleIndicator({ style }: ViewRoleIndicatorProps) {
  const { user, currentViewRole, switchViewRole } = useAuth();

  // Only show for admins who are viewing as a different role
  if (user?.role !== 'admin' || currentViewRole === 'admin') {
    return null;
  }

  const roleLabels = {
    customer: 'Customer',
    driver: 'Driver',
    admin: 'Admin',
  };

  const roleColors = {
    customer: '#0F766E',
    driver: '#7C3AED',
    admin: '#DC2626',
  };

  const handleQuickSwitch = () => {
    // Quick switch back to admin view
    switchViewRole('admin');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, style]}>
        <View style={styles.content}>
          <Ionicons 
            name="eye-outline" 
            size={16} 
            color={roleColors[currentViewRole]} 
          />
          <Text style={[styles.text, { color: roleColors[currentViewRole] }]}>
            Viewing as {roleLabels[currentViewRole]}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.switchButton}
          onPress={handleQuickSwitch}
        >
          <Text style={styles.switchButtonText}>Back to Admin</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FEF3C7',
  },
  container: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44, // Ensure it's tall enough to be easily tappable
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  switchButtonText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
});
