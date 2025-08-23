import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCart } from '../context/CartContext';

export default function OrderConfirmationScreen() {
  const { orderId, orderTotal, paymentAuthorized, preAuthAmount } = useLocalSearchParams();
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
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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

          {/* Payment Status */}
          {paymentAuthorized && (
            <View style={styles.paymentStatusContainer}>
              {paymentAuthorized === 'true' ? (
                <>
                  <View style={styles.paymentStatusRow}>
                    <Ionicons name="card-outline" size={20} color="#059669" />
                    <Text style={styles.paymentStatusSuccess}>Payment Authorized</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  </View>
                  {preAuthAmount && (
                    <Text style={styles.paymentStatusNote}>
                      Pre-authorized: ${preAuthAmount} (includes variance buffer)
                    </Text>
                  )}
                  <Text style={styles.paymentStatusDescription}>
                    Your payment method has been authorized. Final charge will be processed after delivery.
                  </Text>
                </>
              ) : paymentAuthorized === 'false' ? (
                <>
                  <View style={styles.paymentStatusRow}>
                    <Ionicons name="card-outline" size={20} color="#EA580C" />
                    <Text style={styles.paymentStatusWarning}>Payment Authorization Failed</Text>
                    <Ionicons name="warning" size={20} color="#EA580C" />
                  </View>
                  <Text style={styles.paymentStatusDescription}>
                    Your order was created but payment authorization failed. You may be contacted to resolve payment.
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.paymentStatusRow}>
                    <Ionicons name="card-outline" size={20} color="#DC2626" />
                    <Text style={styles.paymentStatusError}>Payment Authorization Error</Text>
                    <Ionicons name="alert-circle" size={20} color="#DC2626" />
                  </View>
                  <Text style={styles.paymentStatusDescription}>
                    There was an issue with payment authorization. You may be contacted to resolve payment.
                  </Text>
                </>
              )}
            </View>
          )}

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
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
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
    marginBottom: 24,
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
    gap: 12,
    marginBottom: 32,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  continueButton: {
    backgroundColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 14,
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
    fontSize: 16,
    fontWeight: '600',
  },
  trackButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#0F766E',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackButtonText: {
    color: '#0F766E',
    fontSize: 15,
    fontWeight: '600',
  },
  // Payment status styles
  paymentStatusContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  paymentStatusSuccess: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  paymentStatusWarning: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EA580C',
  },
  paymentStatusError: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  paymentStatusNote: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  paymentStatusDescription: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});