import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCart } from '../context/CartContext';

export default function OrderConfirmationScreen() {
  const { orderId, orderTotal } = useLocalSearchParams();
  const { clearCart } = useCart();
  const cartClearedRef = useRef(false);

  console.log('🎉 Order confirmation screen loaded!');
  console.log('📦 Order ID:', orderId);
  console.log('💰 Order Total:', orderTotal);

  // Clear cart only once when confirmation screen loads
  useEffect(() => {
    if (!cartClearedRef.current) {
      console.log('🧹 Clearing cart from confirmation screen');
      clearCart();
      cartClearedRef.current = true;
    }
  }, []); // Empty dependency array to run only once

  const handleContinueShopping = () => {
    router.replace('/(tabs)');
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark" size={48} color="#FFFFFF" />
            </View>
          </View>

          {/* Success Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.successTitle}>Order Placed Successfully!</Text>
            <Text style={styles.orderNumber}>Order #{orderId}</Text>
            <Text style={styles.successMessage}>
              Your order has been placed and you'll receive updates via SMS. 
              Our team will start shopping for your items right away.
            </Text>
            {orderTotal && (
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>${orderTotal}</Text>
              </View>
            )}
          </View>

          {/* Additional Info */}
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text style={styles.infoText}>A driver will be assigned shortly</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
              <Text style={styles.infoText}>SMS updates will be sent to your phone</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={handleContinueShopping}
          >
            <Text style={styles.continueButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.trackButton}
            onPress={() => router.push(`/order-detail/${orderId}`)}
          >
            <Text style={styles.trackButtonText}>Track Your Order</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    gap: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F766E',
  },
  infoContainer: {
    width: '100%',
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  actionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  continueButton: {
    backgroundColor: '#0F766E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F766E',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  trackButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#0F766E',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackButtonText: {
    color: '#0F766E',
    fontSize: 16,
    fontWeight: '600',
  },
});