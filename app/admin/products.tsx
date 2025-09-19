import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import BarcodeScanner from '../../components/admin/BarcodeScanner';
import ProductForm from '../../components/admin/ProductForm';
import { adminAPI } from '../../services/api';

export default function AdminProductsScreen() {
  const router = useRouter();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [productData, setProductData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBarcodeScanned = async (gtin: string) => {
    try {
      setIsLoading(true);
      
      // Call the scan_product API
      const response = await adminAPI.scanProduct(gtin);
      
      if (response.data.exists) {
        // Product already exists
        Alert.alert(
          'Product Already Exists',
          `"${response.data.product.name}" is already in your catalog.`,
          [{ text: 'OK' }]
        );
      } else if (response.data.product_data) {
        // Found in Open Food Facts - show form with pre-filled data
        setProductData(response.data);
        setFormVisible(true);
      } else {
        // Not found in Open Food Facts - show empty form
        Alert.alert(
          'Product Not Found',
          'This product was not found in our database. You can add it manually.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Add Manually', 
              onPress: () => {
                setProductData({ gtin });
                setFormVisible(true);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      Alert.alert('Error', 'Failed to process barcode. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async (formData: any) => {
    try {
      setIsLoading(true);
      
      const response = await adminAPI.createProduct(formData);
      
      if (response.data.success) {
        Alert.alert(
          'Success!',
          `"${response.data.product.name}" has been added to your catalog.`,
          [{ text: 'OK' }]
        );
        setProductData(null);
      } else {
        throw new Error(response.data.error || 'Failed to create product');
      }
    } catch (error: any) {
      console.error('Create product error:', error);
      
      let errorMessage = 'Failed to create product. Please try again.';
      if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.join('\n');
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      Alert.alert('Error', errorMessage);
      throw error; // Re-throw to prevent form from closing
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualAdd = () => {
    setProductData(null);
    setFormVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Management</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Add Products to Catalog</Text>
          <Text style={styles.welcomeSubtitle}>
            Scan barcodes to automatically fetch product information, or add products manually.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {/* Scan Barcode Button */}
          <TouchableOpacity 
            style={styles.primaryAction}
            onPress={() => setScannerVisible(true)}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="scan" size={32} color="white" />
            </View>
            <Text style={styles.actionTitle}>Scan Barcode</Text>
            <Text style={styles.actionSubtitle}>
              Automatically fetch product details from barcode
            </Text>
          </TouchableOpacity>

          {/* Manual Add Button */}
          <TouchableOpacity 
            style={styles.secondaryAction}
            onPress={handleManualAdd}
          >
            <View style={styles.secondaryActionIcon}>
              <Ionicons name="add-circle-outline" size={32} color="#0F766E" />
            </View>
            <Text style={styles.secondaryActionTitle}>Add Manually</Text>
            <Text style={styles.secondaryActionSubtitle}>
              Enter product information manually
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#0F766E" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>How it works</Text>
              <Text style={styles.infoText}>
                Scan any product barcode to automatically fetch brand, images, and nutrition data. 
                Just add your Pay-Less price and it's ready for customers!
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* Product Form Modal */}
      <ProductForm
        visible={formVisible}
        onClose={() => {
          setFormVisible(false);
          setProductData(null);
        }}
        productData={productData}
        onSubmit={handleCreateProduct}
        isLoading={isLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  actionsSection: {
    marginBottom: 32,
  },
  primaryAction: {
    backgroundColor: '#0F766E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  actionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  secondaryAction: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  secondaryActionIcon: {
    marginBottom: 16,
  },
  secondaryActionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  secondaryActionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoSection: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});
