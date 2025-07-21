import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';

import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function CheckoutScreen() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  
  // Address Form State
  const [streetAddress, setStreetAddress] = useState('');
  const [apartmentUnit, setApartmentUnit] = useState('');
  const [city, setCity] = useState('Tamuning');
  const [state, setState] = useState('GU');
  const [zipCode, setZipCode] = useState('');
  
  // Delivery Options
  const [deliveryWindow, setDeliveryWindow] = useState('ASAP');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  
  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState('card');
  
  // Loading State
  const [isProcessing, setIsProcessing] = useState(false);

  const deliveryOptions = [
    { id: 'ASAP', label: 'ASAP (30-45 min)', price: 0 },
    { id: 'today-evening', label: 'Today Evening (5-7 PM)', price: 0 },
    { id: 'tomorrow-morning', label: 'Tomorrow Morning (9-11 AM)', price: 0 },
    { id: 'tomorrow-afternoon', label: 'Tomorrow Afternoon (2-4 PM)', price: 0 },
  ];

  const paymentMethods = [
    { id: 'card', label: 'Credit/Debit Card', icon: 'card' },
    { id: 'apple-pay', label: 'Apple Pay', icon: 'logo-apple' },
    { id: 'cash', label: 'Cash on Delivery', icon: 'cash' },
  ];

  const deliveryFee = 2.99;
  const tax = total * 0.047; // 4.7% GU tax
  const finalTotal = total + deliveryFee + tax;

  const isFormValid = streetAddress && city && zipCode;

  const handlePlaceOrder = async () => {
    if (!isFormValid) {
      Alert.alert('Missing Information', 'Please fill in all required address fields.');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Simulate order processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
      
      // Clear cart and navigate to success
      clearCart();
      
      // For now, show success alert - later we can create an order confirmation screen
      Alert.alert(
        'Order Placed Successfully!',
        `Order #${orderId} has been placed. You'll receive updates via SMS.`,
        [
                     {
             text: 'Continue Shopping',
             onPress: () => router.replace('/(tabs)')
           }
        ]
      );
      
    } catch (error) {
      Alert.alert('Order Failed', 'There was an issue placing your order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    router.replace('/(tabs)/cart');
    return null;
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
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
            <Text style={styles.summaryAmount}>${total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Street Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="123 Main Street"
                value={streetAddress}
                onChangeText={setStreetAddress}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Apartment/Unit (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Apt 2B, Unit 101, etc."
                value={apartmentUnit}
                onChangeText={setApartmentUnit}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroupFlex}>
                <Text style={styles.inputLabel}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tamuning"
                  value={city}
                  onChangeText={setCity}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroupSmall}>
                <Text style={styles.inputLabel}>State *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="GU"
                  value={state}
                  onChangeText={setState}
                  autoCapitalize="characters"
                  maxLength={2}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ZIP Code *</Text>
              <TextInput
                style={styles.input}
                placeholder="96913"
                value={zipCode}
                onChangeText={setZipCode}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          </View>
        </View>

        {/* Delivery Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Time</Text>
          <View style={styles.optionsCard}>
            {deliveryOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionItem,
                  deliveryWindow === option.id && styles.optionItemSelected
                ]}
                onPress={() => setDeliveryWindow(option.id)}
              >
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionLabel,
                    deliveryWindow === option.id && styles.optionLabelSelected
                  ]}>
                    {option.label}
                  </Text>
                  {option.price > 0 && (
                    <Text style={styles.optionPrice}>+${option.price.toFixed(2)}</Text>
                  )}
                </View>
                <View style={[
                  styles.radioButton,
                  deliveryWindow === option.id && styles.radioButtonSelected
                ]}>
                  {deliveryWindow === option.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Delivery Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Instructions (Optional)</Text>
          <View style={styles.formCard}>
            <TextInput
              style={styles.textArea}
              placeholder="Leave at front door, ring doorbell, etc."
              value={deliveryInstructions}
              onChangeText={setDeliveryInstructions}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.optionsCard}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.optionItem,
                  paymentMethod === method.id && styles.optionItemSelected
                ]}
                onPress={() => setPaymentMethod(method.id)}
              >
                <View style={styles.paymentMethodContent}>
                  <Ionicons 
                    name={method.icon as any} 
                    size={24} 
                    color={paymentMethod === method.id ? '#0F766E' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.optionLabel,
                    paymentMethod === method.id && styles.optionLabelSelected
                  ]}>
                    {method.label}
                  </Text>
                </View>
                <View style={[
                  styles.radioButton,
                  paymentMethod === method.id && styles.radioButtonSelected
                ]}>
                  {paymentMethod === method.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Order Total */}
        <View style={styles.section}>
          <View style={styles.totalCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Delivery Fee</Text>
              <Text style={styles.totalAmount}>${deliveryFee.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalAmount}>${tax.toFixed(2)}</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.finalTotalLabel}>Total</Text>
              <Text style={styles.finalTotalAmount}>${finalTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.checkoutFooter}>
        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            (!isFormValid || isProcessing) && styles.placeOrderButtonDisabled
          ]}
          onPress={handlePlaceOrder}
          disabled={!isFormValid || isProcessing}
        >
          <Text style={styles.placeOrderButtonText}>
            {isProcessing ? 'Processing...' : `Place Order • $${finalTotal.toFixed(2)}`}
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
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  summaryCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryText: {
    fontSize: 16,
    color: '#6B7280',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F766E',
  },
  formCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroupFlex: {
    flex: 1,
    marginBottom: 16,
  },
  inputGroupSmall: {
    width: 80,
    marginBottom: 16,
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
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    height: 80,
  },
  optionsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  optionLabelSelected: {
    color: '#0F766E',
    fontWeight: '600',
  },
  optionPrice: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  optionItemSelected: {
    backgroundColor: '#F0FDFA',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#0F766E',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0F766E',
  },
  totalCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 16,
    color: '#1F2937',
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  finalTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  finalTotalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F766E',
  },
  bottomSpacing: {
    height: 100,
  },
  checkoutFooter: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  placeOrderButton: {
    backgroundColor: '#0F766E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  placeOrderButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
}); 