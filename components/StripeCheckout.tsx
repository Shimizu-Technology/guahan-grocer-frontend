import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { stripeApi } from '../services/stripe';

interface StripeCheckoutProps {
  amount: string;
  currency?: string;
  testMode?: boolean;
  onPaymentSuccess: (details: {
    status: string;
    transaction_id: string;
    payment_intent_id?: string;
    amount: string;
  }) => void;
  onPaymentError: (error: Error) => void;
}

export interface StripeCheckoutRef {
  processPayment: () => Promise<boolean>;
}

export const StripeCheckout = React.forwardRef<StripeCheckoutRef, StripeCheckoutProps>((props, ref) => {
  const {
    amount,
    currency = 'USD',
    testMode = true, // Default to test mode for React Native
    onPaymentSuccess,
    onPaymentError
  } = props;

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Card form state
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [expiryDate, setExpiryDate] = useState('12/25');
  const [cvv, setCvv] = useState('123');
  const [cardholderName, setCardholderName] = useState('');

  // Create payment intent when component mounts
  useEffect(() => {
    createPaymentIntent();
  }, [amount]);

  const createPaymentIntent = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await stripeApi.createPaymentIntent(amount, currency);
      
      if (response.success && response.client_secret) {
        setClientSecret(response.client_secret);
      } else {
        throw new Error(response.error || 'Failed to create payment intent');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment');
      onPaymentError(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Add spaces every 4 digits
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.substring(0, 19); // Limit to 16 digits + 3 spaces
  };

  const formatExpiryDate = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Add slash after 2 digits
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const formatCvv = (text: string) => {
    // Remove all non-digits and limit to 4
    return text.replace(/\D/g, '').substring(0, 4);
  };

  const validateCardForm = () => {
    if (!cardholderName.trim()) {
      throw new Error('Cardholder name is required');
    }
    
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanCardNumber.length < 15) {
      throw new Error('Please enter a valid card number');
    }
    
    if (expiryDate.length < 5) {
      throw new Error('Please enter a valid expiry date');
    }
    
    if (cvv.length < 3) {
      throw new Error('Please enter a valid CVV');
    }
  };

  const processPayment = async (): Promise<boolean> => {
    if (processing) return false;
    
    setProcessing(true);
    setError(null);

    try {
      // Validate form
      validateCardForm();

      if (testMode) {
        // Simulate payment processing in test mode
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const testTransactionId = `pi_test_${Math.random().toString(36).substring(2, 15)}`;
        
        onPaymentSuccess({
          status: 'succeeded',
          transaction_id: testTransactionId,
          payment_intent_id: testTransactionId,
          amount: amount,
        });
        
        return true;
      }

      // In a real implementation, you would:
      // 1. Use Stripe React Native SDK
      // 2. Create payment method with card details
      // 3. Confirm payment intent with payment method
      // 4. Handle 3D Secure authentication if required
      
      // For now, simulate successful payment
      const mockTransactionId = clientSecret?.split('_secret_')[0] || `pi_${Math.random().toString(36).substring(2, 15)}`;
      
      onPaymentSuccess({
        status: 'succeeded',
        transaction_id: mockTransactionId,
        payment_intent_id: mockTransactionId,
        amount: amount,
      });
      
      return true;

    } catch (err: any) {
      const errorMessage = err.message || 'Payment failed';
      setError(errorMessage);
      onPaymentError(new Error(errorMessage));
      return false;
    } finally {
      setProcessing(false);
    }
  };

  // Expose processPayment to parent
  React.useImperativeHandle(ref, () => ({
    processPayment
  }), [processPayment]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0F766E" />
        <Text style={styles.loadingText}>Initializing payment...</Text>
      </View>
    );
  }

  if (error && !clientSecret) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={createPaymentIntent}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {testMode && (
        <View style={styles.testModeNotice}>
          <Text style={styles.testModeText}>TEST MODE - No real charges</Text>
        </View>
      )}

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Card Information</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Cardholder Name</Text>
          <TextInput
            style={styles.textInput}
            value={cardholderName}
            onChangeText={setCardholderName}
            placeholder="John Doe"
            autoCapitalize="words"
            editable={!processing}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Card Number</Text>
          <TextInput
            style={styles.textInput}
            value={cardNumber}
            onChangeText={(text) => setCardNumber(formatCardNumber(text))}
            placeholder="1234 5678 9012 3456"
            keyboardType="numeric"
            editable={!processing}
          />
        </View>

        <View style={styles.rowContainer}>
          <View style={styles.halfInputContainer}>
            <Text style={styles.inputLabel}>Expiry Date</Text>
            <TextInput
              style={styles.textInput}
              value={expiryDate}
              onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
              placeholder="MM/YY"
              keyboardType="numeric"
              editable={!processing}
            />
          </View>

          <View style={styles.halfInputContainer}>
            <Text style={styles.inputLabel}>CVV</Text>
            <TextInput
              style={styles.textInput}
              value={cvv}
              onChangeText={(text) => setCvv(formatCvv(text))}
              placeholder="123"
              keyboardType="numeric"
              secureTextEntry
              editable={!processing}
            />
          </View>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {processing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="small" color="#0F766E" />
          <Text style={styles.processingText}>Processing payment...</Text>
        </View>
      )}
    </View>
  );
});

StripeCheckout.displayName = 'StripeCheckout';

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  loadingText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 12,
  },
  testModeNotice: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  testModeText: {
    color: '#92400E',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInputContainer: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  processingText: {
    marginLeft: 8,
    color: '#0F766E',
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#0F766E',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  retryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
});