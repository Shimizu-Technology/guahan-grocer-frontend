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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';

import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ordersAPI } from '../services/api';
import { locationService, LocationResult } from '../services/locationService';

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
  
  // Tip
  const [tipPercentage, setTipPercentage] = useState(15); // Default 15%
  const [customTipAmount, setCustomTipAmount] = useState('');
  const [tipOption, setTipOption] = useState('percentage'); // 'percentage' | 'custom' | 'none'
  
  // Loading State
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Delivery Fee Calculation
  const [deliveryFee, setDeliveryFee] = useState(0); // No fee until calculated
  const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(false);
  const [distanceDetails, setDistanceDetails] = useState<any>(null);
  const [closestStore, setClosestStore] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<any>(null);
  const [addressCorrection, setAddressCorrection] = useState<any>(null);
  const [addressError, setAddressError] = useState<any>(null);
  
  // Location Services
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Calculate delivery fee based on address
  const calculateDeliveryFee = async () => {
    if (!streetAddress || !city || !zipCode) {
      // Reset when address incomplete - fee will not be shown anyway
      setDeliveryFee(0);
      setDistanceDetails(null);
      setClosestStore(null);
      setValidationWarning(null);
      setAddressCorrection(null);
      setAddressError(null);
      return;
    }

    setDeliveryFeeLoading(true);
    
    try {
      const deliveryAddress = {
        streetAddress,
        apartmentUnit,
        city,
        state,
        zipCode
      };

      const response = await ordersAPI.calculateDeliveryFee(deliveryAddress);
      
      if (response.data) {
        const data = response.data as any;
        setDeliveryFee(data.delivery_fee || 2.99);
        setDistanceDetails(data.distance_details);
        setClosestStore(data.closest_store);
        setValidationWarning(data.validation_warning || null);
        setAddressCorrection(data.address_correction || null);
        setAddressError(data.address_error || null);
      } else {
        // Fallback if API fails
        setDeliveryFee(2.99);
        setDistanceDetails(null);
        setClosestStore(null);
        setValidationWarning(null);
        setAddressCorrection(null);
        setAddressError(null);
      }
    } catch (error) {
      console.error('Failed to calculate delivery fee:', error);
      // Fallback if API fails
      setDeliveryFee(2.99);
      setDistanceDetails(null);
      setClosestStore(null);
      setValidationWarning(null);
      setAddressCorrection(null);
      setAddressError(null);
    } finally {
      setDeliveryFeeLoading(false);
    }
  };

  // Recalculate delivery fee when address changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateDeliveryFee();
    }, 500); // Debounce API calls

    return () => clearTimeout(timeoutId);
  }, [streetAddress, apartmentUnit, city, state, zipCode]);

  // Handle getting current location
  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    
    try {
      // Add a small delay to make the UI feel more responsive
      const result: LocationResult = await Promise.race([
        locationService.getCurrentLocationWithAddress(),
        // Add a timeout to prevent indefinite waiting
        new Promise<LocationResult>((_, reject) => 
          setTimeout(() => reject(new Error('Location request timed out')), 15000)
        )
      ]);
      
      if (result.success && result.address) {
        // Update form fields with location data
        setStreetAddress(result.address.streetAddress);
        setApartmentUnit(''); // Clear apartment unit
        setCity(result.address.city);
        setState(result.address.state);
        setZipCode(result.address.zipCode);
        
        // Show success message with shorter text
        Alert.alert(
          'Location Found!',
          `Address: ${result.address.streetAddress}, ${result.address.city}`,
          [{ text: 'OK' }]
        );
      } else {
        // Show error message
        Alert.alert(
          'Location Error',
          result.error || 'Unable to get your current location. Please enter your address manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      
      // Check if it was a timeout
      const isTimeout = error instanceof Error && error.message.includes('timeout');
      Alert.alert(
        'Location Error',
        isTimeout 
          ? 'Location request timed out. Please check your GPS signal and try again.'
          : 'An unexpected error occurred while getting your location. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  const deliveryOptions = [
    { id: 'ASAP', label: 'ASAP (30-45 min)', price: 0 },
    { id: 'today-evening', label: 'Today Evening (5-7 PM)', price: 0 },
    { id: 'tomorrow-morning', label: 'Tomorrow Morning (9-11 AM)', price: 0 },
    { id: 'tomorrow-afternoon', label: 'Tomorrow Afternoon (2-4 PM)', price: 0 },
  ];

  const paymentMethods = [
    { id: 'card', label: 'Credit/Debit Card', icon: 'card' },
  ];


  
  // Calculate tip amount
  const tipAmount = tipOption === 'none' ? 0 : 
                   tipOption === 'custom' ? parseFloat(customTipAmount) || 0 :
                   (total * tipPercentage) / 100;
  
  // Only include delivery fee in total when it's being displayed
  const shouldShowDeliveryFee = streetAddress || deliveryFeeLoading || distanceDetails;
  const finalTotal = total + (shouldShowDeliveryFee ? deliveryFee : 0) + tipAmount;

  const isFormValid = streetAddress && city && zipCode && !deliveryFeeLoading;

  const handlePlaceOrder = async () => {
    if (!isFormValid) {
      Alert.alert('Missing Information', 'Please fill in all required address fields.');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Prepare order data
      const orderData = {
        order: {
          total: finalTotal,
          tip_amount: tipAmount,
          tip_percentage: tipOption === 'percentage' ? tipPercentage : 0,
          delivery_address: {
            streetAddress,
            apartmentUnit,
            city,
            state,
            zipCode
          },
          eta: 45, // Default 45 minutes
          delivery_fee: shouldShowDeliveryFee ? deliveryFee : 0,
          closest_store: closestStore,
          distance_details: distanceDetails
        },
        items: items.map(item => ({
          itemId: item.item.id,
          quantity: item.quantity,
          price: item.item.price
        }))
      };

      // Create order via API
      const response = await ordersAPI.create(orderData);
      
      if (response.data) {
        // Clear cart and navigate to success
        clearCart();
        
        const orderData = response.data as any;
        Alert.alert(
          'Order Placed Successfully!',
          `Order #${orderData.id || 'NEW'} has been placed. You'll receive updates via SMS.`,
          [
            {
              text: 'Continue Shopping',
              onPress: () => router.replace('/(tabs)')
            }
          ]
        );
      } else {
        throw new Error('Failed to create order');
      }
      
    } catch (error) {
      console.error('Order creation failed:', error);
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
          <View style={styles.addressHeaderContainer}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>Delivery Address</Text>
            <TouchableOpacity
              style={[
                styles.locationButton,
                isGettingLocation && styles.locationButtonDisabled
              ]}
              onPress={handleUseCurrentLocation}
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="location" size={14} color="#FFFFFF" />
              )}
              <Text style={styles.locationButtonText}>
                {isGettingLocation ? 'Finding...' : 'Use Location'}
              </Text>
            </TouchableOpacity>
          </View>
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

        {/* Tip */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tip Your Driver</Text>
          <View style={styles.tipCard}>
            {/* Percentage Buttons Row */}
            <View style={styles.tipPercentageRow}>
              {[10, 15, 20].map((percentage) => (
                <TouchableOpacity
                  key={percentage}
                  style={[
                    styles.tipPercentageButton,
                    tipOption === 'percentage' && tipPercentage === percentage && styles.tipPercentageButtonSelected
                  ]}
                  onPress={() => {
                    setTipOption('percentage');
                    setTipPercentage(percentage);
                    setCustomTipAmount('');
                  }}
                >
                  <Text style={[
                    styles.tipPercentageText,
                    tipOption === 'percentage' && tipPercentage === percentage && styles.tipPercentageTextSelected
                  ]}>
                    {percentage}%
                  </Text>
                  <Text style={[
                    styles.tipPercentageAmount,
                    tipOption === 'percentage' && tipPercentage === percentage && styles.tipPercentageAmountSelected
                  ]}>
                    ${((total * percentage) / 100).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Other Options Row */}
            <View style={styles.tipOtherRow}>
              <TouchableOpacity
                style={[
                  styles.tipOtherButton,
                  tipOption === 'custom' && styles.tipOtherButtonSelected
                ]}
                onPress={() => {
                  setTipOption('custom');
                  setTipPercentage(0);
                }}
              >
                <Text style={[
                  styles.tipOtherText,
                  tipOption === 'custom' && styles.tipOtherTextSelected
                ]}>
                  Other
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.tipOtherButton,
                  tipOption === 'none' && styles.tipOtherButtonSelected
                ]}
                onPress={() => {
                  setTipOption('none');
                  setTipPercentage(0);
                  setCustomTipAmount('');
                }}
              >
                <Text style={[
                  styles.tipOtherText,
                  tipOption === 'none' && styles.tipOtherTextSelected
                ]}>
                  No tip
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Custom Amount Input */}
            {tipOption === 'custom' && (
              <View style={styles.tipCustomInputContainer}>
                <Text style={styles.tipCustomLabel}>Enter amount:</Text>
                <TextInput
                  style={styles.tipCustomInput}
                  placeholder="0.00"
                  value={customTipAmount}
                  onChangeText={setCustomTipAmount}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              </View>
            )}
          </View>
        </View>

        {/* Order Total */}
        <View style={styles.section}>
          <View style={styles.totalCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
            </View>
            {/* Only show delivery fee when address is being entered or calculated */}
            {shouldShowDeliveryFee && (
              <View style={styles.totalRow}>
                <View style={styles.deliveryFeeContainer}>
                  <Text style={styles.totalLabel}>Delivery Fee</Text>
                  {deliveryFeeLoading && (
                    <Text style={styles.deliveryFeeSubtext}>Calculating...</Text>
                  )}
                  {distanceDetails && !deliveryFeeLoading && (
                    <Text style={styles.deliveryFeeSubtext}>
                      {distanceDetails.distance_text} from {distanceDetails.store_name}
                    </Text>
                  )}
                  {!distanceDetails && !deliveryFeeLoading && isFormValid && (
                    <Text style={styles.deliveryFeeSubtext}>
                      From closest store
                    </Text>
                  )}
                </View>
                <View style={styles.deliveryFeeAmountContainer}>
                  {deliveryFeeLoading ? (
                    <ActivityIndicator size="small" color="#0F766E" />
                  ) : (
                    <Text style={styles.totalAmount}>${deliveryFee.toFixed(2)}</Text>
                  )}
                </View>
              </View>
            )}
            {/* Address Correction Notice */}
            {addressCorrection && (
              <View style={styles.addressCorrectionContainer}>
                <View style={styles.correctionHeader}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text style={styles.correctionTitle}>Address Corrected</Text>
                </View>
                <Text style={styles.correctionMessage}>{addressCorrection.message}</Text>
                <Text style={styles.correctionDetails}>
                  📍 Using: {addressCorrection.corrected_address}
                </Text>
              </View>
            )}
            {/* Address Error Notice */}
            {addressError && (
              <View style={styles.addressErrorContainer}>
                <View style={styles.errorHeader}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorTitle}>Address Not Found</Text>
                </View>
                <Text style={styles.errorMessage}>{addressError.message}</Text>
                <Text style={styles.errorSuggestion}>
                  💡 {addressError.suggestion}
                </Text>
              </View>
            )}
            {/* Address Validation Warning */}
            {validationWarning && (
              <View style={styles.validationWarningContainer}>
                <View style={styles.warningHeader}>
                  <Ionicons name="warning" size={16} color="#F59E0B" />
                  <Text style={styles.warningTitle}>Address Notice</Text>
                </View>
                <Text style={styles.warningMessage}>{validationWarning.reason}</Text>
                {validationWarning.suggestion && (
                  <Text style={styles.warningSuggestion}>
                    💡 {validationWarning.suggestion}
                  </Text>
                )}
              </View>
            )}
            {tipAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tip</Text>
                <Text style={styles.totalAmount}>${tipAmount.toFixed(2)}</Text>
              </View>
            )}
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
            {isProcessing ? 'Processing...' : 
             deliveryFeeLoading ? 'Calculating delivery...' :
             `Place Order • $${finalTotal.toFixed(2)}`}
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
  sectionTitleInline: {
    marginBottom: 0,
    paddingHorizontal: 0,
    flex: 1,
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
  // Compact Tip Styles
  tipCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipPercentageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tipPercentageButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tipPercentageButtonSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#0F766E',
  },
  tipPercentageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  tipPercentageTextSelected: {
    color: '#0F766E',
  },
  tipPercentageAmount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  tipPercentageAmountSelected: {
    color: '#0F766E',
  },
  tipOtherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tipOtherButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tipOtherButtonSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#0F766E',
  },
  tipOtherText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tipOtherTextSelected: {
    color: '#0F766E',
  },
  tipCustomInputContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipCustomLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  tipCustomInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    width: 80,
    textAlign: 'center',
  },
  // Delivery Fee Display Styles
  deliveryFeeContainer: {
    flex: 1,
  },
  deliveryFeeSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  deliveryFeeAmountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 24,
  },
  // Validation Warning Styles
  validationWarningContainer: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 6,
  },
  warningMessage: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  warningSuggestion: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Address Correction Styles
  addressCorrectionContainer: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  correctionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  correctionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    marginLeft: 6,
  },
  correctionMessage: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 18,
  },
  correctionDetails: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 18,
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Address Error Styles
  addressErrorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginLeft: 6,
  },
  errorMessage: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  errorSuggestion: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Location Button Styles
  addressHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F766E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
}); 