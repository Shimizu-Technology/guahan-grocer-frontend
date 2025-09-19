import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProductData {
  gtin?: string;
  name?: string;
  brand?: string;
  size?: string;
  description?: string;
  image_urls?: string[];
  nutrition_data?: any;
}

interface ProductFormProps {
  visible: boolean;
  onClose: () => void;
  productData?: ProductData | null;
  onSubmit: (productData: any) => Promise<void>;
  isLoading?: boolean;
}

export default function ProductForm({ 
  visible, 
  onClose, 
  productData, 
  onSubmit, 
  isLoading = false 
}: ProductFormProps) {
  const [formData, setFormData] = useState({
    gtin: '',
    name: '',
    brand: '',
    size: '',
    description: '',
    price: '',
    image_urls: [] as string[],
    nutrition_data: {} as any,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (productData) {
      setFormData({
        gtin: productData.gtin || '',
        name: productData.name || '',
        brand: productData.brand || '',
        size: productData.size || '',
        description: productData.description || '',
        price: '',
        image_urls: productData.image_urls || [],
        nutrition_data: productData.nutrition_data || {},
      });
    } else {
      // Reset form
      setFormData({
        gtin: '',
        name: '',
        brand: '',
        size: '',
        description: '',
        price: '',
        image_urls: [],
        nutrition_data: {},
      });
    }
    setErrors({});
  }, [productData, visible]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Please enter a valid price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        product: {
          ...formData,
          price: Number(formData.price),
        }
      });
      onClose();
    } catch (error) {
      console.error('Failed to create product:', error);
      Alert.alert('Error', 'Failed to create product. Please try again.');
    }
  };

  const handleClose = () => {
    setFormData({
      gtin: '',
      name: '',
      brand: '',
      size: '',
      description: '',
      price: '',
      image_urls: [],
      nutrition_data: {},
    });
    setErrors({});
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {productData ? 'Add Product to Catalog' : 'Create New Product'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Product Images */}
          {formData.image_urls.length > 0 && (
            <View style={styles.imageSection}>
              <Text style={styles.sectionTitle}>Product Images</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {formData.image_urls.map((url, index) => (
                  <Image key={index} source={{ uri: url }} style={styles.productImage} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Open Food Facts Info */}
          {productData && (
            <View style={styles.infoSection}>
              <View style={styles.infoHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.infoText}>Product data from Open Food Facts</Text>
              </View>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* GTIN (Read-only if from barcode scan) */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Barcode (GTIN)</Text>
              <TextInput
                style={[styles.textInput, productData && styles.readOnlyInput]}
                value={formData.gtin}
                onChangeText={(text) => setFormData({ ...formData, gtin: text })}
                placeholder="Enter or scan barcode"
                editable={!productData}
              />
            </View>

            {/* Product Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Product Name *</Text>
              <TextInput
                style={[styles.textInput, errors.name && styles.errorInput]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter product name"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Brand */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Brand</Text>
              <TextInput
                style={styles.textInput}
                value={formData.brand}
                onChangeText={(text) => setFormData({ ...formData, brand: text })}
                placeholder="Enter brand name"
              />
            </View>

            {/* Size */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Size/Weight</Text>
              <TextInput
                style={styles.textInput}
                value={formData.size}
                onChangeText={(text) => setFormData({ ...formData, size: text })}
                placeholder="e.g., 500g, 1L, 12 oz"
              />
            </View>

            {/* Pay-Less Price */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Pay-Less Price *</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[styles.priceInput, errors.price && styles.errorInput]}
                  value={formData.price}
                  onChangeText={(text) => setFormData({ ...formData, price: text })}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            </View>

            {/* Description */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter product description"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Nutrition Info Preview */}
            {formData.nutrition_data && Object.keys(formData.nutrition_data).length > 0 && (
              <View style={styles.nutritionSection}>
                <Text style={styles.sectionTitle}>Nutrition Information Available</Text>
                <View style={styles.nutritionPreview}>
                  <Ionicons name="nutrition" size={16} color="#10B981" />
                  <Text style={styles.nutritionText}>
                    Includes calories, ingredients, and allergen information
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleClose}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.disabledButton]} 
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Add to Catalog</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
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
  imageSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  infoSection: {
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  infoText: {
    fontSize: 14,
    color: '#059669',
    marginLeft: 8,
    fontWeight: '500',
  },
  formSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
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
  readOnlyInput: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    paddingLeft: 12,
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 0,
  },
  errorInput: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  nutritionSection: {
    marginTop: 8,
  },
  nutritionPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
  },
  nutritionText: {
    fontSize: 14,
    color: '#059669',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 12,
    backgroundColor: '#0F766E',
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
