import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MaintenanceBannerProps {
  variant?: 'full' | 'compact';
}

const BANNER_DISMISSED_KEY = 'maintenanceBannerDismissed';

export default function MaintenanceBanner({ variant = 'full' }: MaintenanceBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    checkDismissed();
  }, []);

  const checkDismissed = async () => {
    try {
      const dismissed = await AsyncStorage.getItem(BANNER_DISMISSED_KEY);
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    } catch (error) {
      console.error('Error checking banner dismissed status:', error);
    }
  };

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(BANNER_DISMISSED_KEY, 'true');
      setIsDismissed(true);
    } catch (error) {
      console.error('Error dismissing banner:', error);
    }
  };

  const handleContactPress = () => {
    Linking.openURL('mailto:shimizutechnology@gmail.com?subject=Guahan Grocer Inquiry');
  };

  const handleWebsitePress = () => {
    Linking.openURL('https://shimizu-technology.com');
  };

  if (isDismissed) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactContent}>
          <Ionicons name="pause-circle" size={20} color="#0F766E" />
          <Text style={styles.compactText}>
            Service temporarily paused - Browse in demo mode
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="pause-circle" size={32} color="#0F766E" />
        </View>
        <TouchableOpacity 
          onPress={handleDismiss}
          style={styles.dismissButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>🏝️ Taking a Short Break</Text>
      
      <Text style={styles.message}>
        We're temporarily pausing development to focus on other projects. 
        You can still browse our catalog in demo mode!
      </Text>

      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={18} color="#0F766E" />
          <Text style={styles.infoText}>
            Expected Return: <Text style={styles.infoBold}>Mid-Late 2026</Text>
          </Text>
        </View>
      </View>

      <Text style={styles.contactTitle}>Interested in updates?</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.contactButton}
          onPress={handleContactPress}
        >
          <Ionicons name="mail-outline" size={18} color="white" />
          <Text style={styles.contactButtonText}>Contact Us</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.websiteButton}
          onPress={handleWebsitePress}
        >
          <Ionicons name="globe-outline" size={18} color="#0F766E" />
          <Text style={styles.websiteButtonText}>Visit Our Website</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.email}>shimizutechnology@gmail.com</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E0F2F1', // Light teal background
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 2,
    borderColor: '#0F766E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
  },
  dismissButton: {
    padding: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  infoBold: {
    fontWeight: '600',
    color: '#0F766E',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  websiteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0F766E',
    gap: 6,
  },
  websiteButtonText: {
    color: '#0F766E',
    fontSize: 14,
    fontWeight: '600',
  },
  email: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Compact variant styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7', // Light yellow for visibility
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  compactText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
});
