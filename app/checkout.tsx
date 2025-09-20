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
import { usePostHog } from 'posthog-react-native';

import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ordersAPI, addressesAPI, paymentsAPI } from '../services/api';
import { locationService, LocationResult } from '../services/locationService';
import { Address } from '../types';

export default function CheckoutScreen() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const posthog = usePostHog();
  
  // Address Form State
  const [streetAddress, setStreetAddress] = useState('');
  const [apartmentUnit, setApartmentUnit] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('GU');
  const [zipCode, setZipCode] = useState('');
  
  // Delivery Options
  const [deliveryWindow, setDeliveryWindow] = useState('ASAP');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  
  // Card Information (placeholders for Stripe integration)
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  // Format card number with spaces
  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted;
  };

  // Format expiry date with slash
  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };
  
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
  
  // Address Management
  const [userAddresses, setUserAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [isUsingDefaultAddress, setIsUsingDefaultAddress] = useState(false);

  // Fetch user's addresses and pre-populate default address
  useEffect(() => {
    const fetchUserAddresses = async () => {
      if (!user) {
        setIsLoadingAddresses(false);
        return;
      }

      try {
        const response = await addressesAPI.getAll();
        
        if (response.data) {
          const addresses = response.data as Address[];
          setUserAddresses(addresses);
          
          // Find the default address
          const defaultAddr = addresses.find(addr => addr.isDefault);
          if (defaultAddr) {
            setDefaultAddress(defaultAddr);
            
            // Pre-populate form fields with default address
            setStreetAddress(defaultAddr.streetAddress || '');
            setApartmentUnit(defaultAddr.apartmentUnit || '');
            setCity(defaultAddr.city || '');
            setState(defaultAddr.state || 'GU');
            setZipCode(defaultAddr.zipCode || '');
            setIsUsingDefaultAddress(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user addresses:', error);
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    fetchUserAddresses();
  }, [user]);

  // Address field change handlers that track manual modifications
  const handleStreetAddressChange = (value: string) => {
    setStreetAddress(value);
    if (isUsingDefaultAddress && defaultAddress && value !== defaultAddress.streetAddress) {
      setIsUsingDefaultAddress(false);
    }
  };

  const handleApartmentUnitChange = (value: string) => {
    setApartmentUnit(value);
    if (isUsingDefaultAddress && defaultAddress && value !== (defaultAddress.apartmentUnit || '')) {
      setIsUsingDefaultAddress(false);
    }
  };

  const handleCityChange = (value: string) => {
    setCity(value);
    if (isUsingDefaultAddress && defaultAddress && value !== defaultAddress.city) {
      setIsUsingDefaultAddress(false);
    }
  };

  const handleStateChange = (value: string) => {
    setState(value);
    if (isUsingDefaultAddress && defaultAddress && value !== defaultAddress.state) {
      setIsUsingDefaultAddress(false);
    }
  };

  const handleZipCodeChange = (value: string) => {
    setZipCode(value);
    if (isUsingDefaultAddress && defaultAddress && value !== defaultAddress.zipCode) {
      setIsUsingDefaultAddress(false);
    }
  };

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

  // Track checkout page view
  useEffect(() => {
    posthog?.capture('Checkout Started', {
      cart_value: total,
      item_count: items.length,
      items: items.map(item => ({
        product_id: item.item.id,
        product_name: item.item.name,
        category: item.item.category,
        quantity: item.quantity,
        price: item.item.price
      }))
    });
  }, []);

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
        
        // Since this is manual location input, not using default address
        setIsUsingDefaultAddress(false);
        
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




  
  // Calculate tip amount
  const tipAmount = tipOption === 'none' ? 0 : 
                   tipOption === 'custom' ? parseFloat(customTipAmount) || 0 :
                   (total * tipPercentage) / 100;
  
  // Only include delivery fee in total when it's being displayed
  const shouldShowDeliveryFee = streetAddress || deliveryFeeLoading || distanceDetails;
  const finalTotal = total + (shouldShowDeliveryFee ? deliveryFee : 0) + tipAmount;

  const isFormValid = streetAddress && city && zipCode && cardholderName && 
                      cardNumber.replace(/\s/g, '').length >= 3 && 
                      expiryDate.length >= 3 && 
                      cvv.length >= 1 && 
                      !deliveryFeeLoading;

  const handlePlaceOrder = async () => {
    if (!isFormValid) {
      Alert.alert('Missing Information', 'Please fill in all required address and payment fields.');
      return;
    }

    setIsProcessing(true);
    
    // Track order placement attempt
    posthog?.capture('Order Placement Started', {
      cart_value: total,
      delivery_fee: shouldShowDeliveryFee ? deliveryFee : 0,
      tip_amount: tipAmount,
      final_total: finalTotal,
      item_count: items.length,
      delivery_window: deliveryWindow,
      has_delivery_instructions: !!deliveryInstructions
    });
    
    try {
      // Prepare order data
      const orderData = {
        order: {
          subtotal: total, // Items cost only
          delivery_fee: shouldShowDeliveryFee ? deliveryFee : 0,
          total: finalTotal, // Grand total (subtotal + delivery + tip)
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
          delivery_time: deliveryWindow,
          delivery_instructions: deliveryInstructions
        },
        items: items.map(item => ({
          itemId: item.item.id,
          quantity: item.quantity,
          price: item.item.price,
          // Include weight information for weight-based items
          selectedWeight: item.selectedWeight,
          estimatedPrice: item.estimatedPrice,
          weightNote: item.weightNote
        }))
      };

      // Create order via API
      const response = await ordersAPI.create(orderData);
      
      if (response.data) {
        const createdOrder = response.data as any;
        console.log('✅ Order created successfully:', createdOrder);
        
        // Authorize payment for the order
        try {
          console.log('💳 Authorizing payment for order:', createdOrder.id);
          const paymentResponse = await paymentsAPI.authorize(createdOrder.id, 25); // 25% buffer for weight variances
          
          if (paymentResponse.data) {
            console.log('✅ Payment authorized:', paymentResponse.data);
            
            // Track successful order completion
            posthog?.capture('Order Completed', {
              order_id: createdOrder.id,
              cart_value: total,
              delivery_fee: shouldShowDeliveryFee ? deliveryFee : 0,
              tip_amount: tipAmount,
              final_total: finalTotal,
              item_count: items.length,
              payment_method: 'stripe',
              delivery_window: deliveryWindow
            });
            
            // Navigate to confirmation screen
            try {
              const paymentData = paymentResponse.data as any;
              router.replace({
                pathname: '/order-confirmation',
                params: {
                  orderId: createdOrder.id || 'NEW',
                  orderTotal: finalTotal.toFixed(2),
                  paymentAuthorized: 'true',
                  preAuthAmount: paymentData.pre_auth_amount?.toString() || finalTotal.toFixed(2)
                }
              });
              console.log('📱 Navigation completed with payment info');
            } catch (navError) {
              console.error('❌ Navigation failed:', navError);
              // Fallback to simple navigation
              router.replace('/order-confirmation');
            }
          } else {
            // Payment authorization failed, but order was created
            console.error('❌ Payment authorization failed:', paymentResponse.error);
            
            // Attempt to cancel the order to maintain consistency
            try {
              console.log('🔄 Attempting to cancel order due to payment failure...');
              await ordersAPI.updateStatus(createdOrder.id, 'cancelled');
              console.log('✅ Order cancelled successfully');
              
              Alert.alert(
                'Payment Authorization Failed',
                'We were unable to authorize your payment. Your order has been cancelled. Please try again with a different payment method.',
                [
                  {
                    text: 'Try Again',
                    onPress: () => {
                      // Stay on checkout screen to try again
                      setIsProcessing(false);
                    }
                  }
                ]
              );
            } catch (cancelError) {
              console.error('❌ Failed to cancel order:', cancelError);
              
              Alert.alert(
                'Payment Authorization Failed',
                'Your order was created but payment authorization failed. Please contact support to resolve this issue.',
                [
                  {
                    text: 'Contact Support',
                    onPress: () => {
                      router.replace({
                        pathname: '/order-confirmation',
                        params: {
                          orderId: createdOrder.id || 'NEW',
                          orderTotal: finalTotal.toFixed(2),
                          paymentAuthorized: 'false',
                          paymentError: 'true'
                        }
                      });
                    }
                  }
                ]
              );
            }
          }
        } catch (paymentError) {
          console.error('❌ Payment authorization error:', paymentError);
          
          // Attempt to cancel the order due to payment error
          try {
            console.log('🔄 Attempting to cancel order due to payment error...');
            await ordersAPI.updateStatus(createdOrder.id, 'cancelled');
            console.log('✅ Order cancelled successfully');
            
            Alert.alert(
              'Payment Error',
              'There was an error processing your payment. Your order has been cancelled. Please try again.',
              [
                {
                  text: 'Try Again',
                  onPress: () => {
                    setIsProcessing(false);
                  }
                }
              ]
            );
          } catch (cancelError) {
            console.error('❌ Failed to cancel order after payment error:', cancelError);
            
            Alert.alert(
              'Payment Authorization Error',
              'Your order was created but there was an issue with payment authorization. Please contact support to resolve this issue.',
              [
                {
                  text: 'Contact Support',
                  onPress: () => {
                    router.replace({
                      pathname: '/order-confirmation',
                      params: {
                        orderId: createdOrder.id || 'NEW',
                        orderTotal: finalTotal.toFixed(2),
                        paymentAuthorized: 'error',
                        paymentError: 'true'
                      }
                    });
                  }
                }
              ]
            );
          }
        }
      } else {
        throw new Error(response.error || 'Failed to create order');
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
          {/* Main Header Row */}
          <View style={styles.addressMainHeaderContainer}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>Delivery Address</Text>
            <View style={styles.primaryActionButtons}>
              {isLoadingAddresses && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#0F766E" />
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              )}
              {!isLoadingAddresses && (
                <>
                  {userAddresses.length > 1 && (
                    <TouchableOpacity
                      style={styles.changeAddressButton}
                      onPress={() => {
                        Alert.alert(
                          'Select Address',
                          'Choose which address to use for this order:',
                          [
                            ...userAddresses.map((addr) => ({
                              text: `${addr.displayLabel}: ${addr.streetAddress}`,
                              onPress: () => {
                                setStreetAddress(addr.streetAddress || '');
                                setApartmentUnit(addr.apartmentUnit || '');
                                setCity(addr.city || '');
                                setState(addr.state || 'GU');
                                setZipCode(addr.zipCode || '');
                                setDefaultAddress(addr);
                                setIsUsingDefaultAddress(true);
                              }
                            })),
                            { text: 'Cancel', style: 'cancel' }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="swap-horizontal" size={12} color="#0F766E" />
                      <Text style={styles.changeAddressText}>Change</Text>
                    </TouchableOpacity>
                  )}
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
                </>
              )}
            </View>
          </View>

          {/* Status and Utility Buttons Row */}
          {!isLoadingAddresses && (
            <View style={styles.addressStatusContainer}>
              <View style={styles.statusBadgesContainer}>
                {defaultAddress && isUsingDefaultAddress && (
                  <View style={styles.defaultAddressBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#059669" />
                    <Text style={styles.defaultAddressText}>Default</Text>
                  </View>
                )}
              </View>
              <View style={styles.utilityButtonsContainer}>
                {defaultAddress && !isUsingDefaultAddress && (
                  <TouchableOpacity
                    style={styles.useDefaultButton}
                    onPress={() => {
                      setStreetAddress(defaultAddress.streetAddress || '');
                      setApartmentUnit(defaultAddress.apartmentUnit || '');
                      setCity(defaultAddress.city || '');
                      setState(defaultAddress.state || 'GU');
                      setZipCode(defaultAddress.zipCode || '');
                      setIsUsingDefaultAddress(true);
                    }}
                  >
                    <Ionicons name="home" size={12} color="#0F766E" />
                    <Text style={styles.useDefaultText}>Use Default</Text>
                  </TouchableOpacity>
                )}
                {(streetAddress || city || zipCode) && (
                  <TouchableOpacity
                    style={styles.clearAddressButton}
                    onPress={() => {
                      Alert.alert(
                        'Clear Address',
                        'Are you sure you want to clear all address fields?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Clear',
                            style: 'destructive',
                            onPress: () => {
                              setStreetAddress('');
                              setApartmentUnit('');
                              setCity('');
                              setState('GU');
                              setZipCode('');
                              setIsUsingDefaultAddress(false);
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="close-circle" size={12} color="#DC2626" />
                    <Text style={styles.clearAddressText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Street Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="123 Main Street"
                value={streetAddress}
                onChangeText={handleStreetAddressChange}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Apartment/Unit (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Apt 2B, Unit 101, etc."
                value={apartmentUnit}
                onChangeText={handleApartmentUnitChange}
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
                  onChangeText={handleCityChange}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroupSmall}>
                <Text style={styles.inputLabel}>State *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="GU"
                  value={state}
                  onChangeText={handleStateChange}
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
                onChangeText={handleZipCodeChange}
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

        {/* Payment Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cardholder Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                value={cardholderName}
                onChangeText={setCardholderName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Card Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroupFlex}>
                <Text style={styles.inputLabel}>Expiry Date *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/YY"
                  value={expiryDate}
                  onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={styles.inputGroupSmall}>
                <Text style={styles.inputLabel}>CVV *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  value={cvv}
                  onChangeText={(text) => setCvv(text.replace(/\D/g, ''))}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>
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
                  <Text style={styles.totalLabel}>Delivery Fee (estimated)</Text>
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
             !isFormValid ? 'Complete all fields' :
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
  // Address Header Styles
  addressMainHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  primaryActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
    minHeight: 24,
  },
  statusBadgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  utilityButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  defaultAddressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#059669',
  },
  defaultAddressText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  useDefaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0F766E',
    backgroundColor: 'transparent',
  },
  useDefaultText: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '500',
  },
  changeAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0F766E',
    backgroundColor: 'transparent',
  },
  changeAddressText: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '500',
  },
  clearAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DC2626',
    backgroundColor: 'transparent',
  },
  clearAddressText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '500',
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