import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import SimpleImage from '../../../components/shared/SimpleImage';
import { productsAPI, categoriesAPI, unitsAPI } from '../../../services/api';

interface Product {
  id: number;
  name: string;
  category: string;
  price: string;
  stock: number;
  lowStock: boolean;
  unit: string;
  status: string;
  trackInventory: boolean;
  stockStatus: string;
  available: boolean;
}

interface Category {
  key: string;
  label: string;
  count: number;
}

interface NewProduct {
  name: string;
  category: string;
  categoryId?: number;
  price: string;
  description: string;
  stockQuantity: string;
  unit: string;
  unitId?: number;
  image?: ImagePicker.ImagePickerAsset;
  trackInventory: boolean;
  // Weight-based fields
  weightBased: boolean;
  pricePerUnit: string;
  weightUnit: string;
  minWeight: string;
  maxWeight: string;
}

export default function AdminInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Add/Edit Product Modal States
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [showNewUnitInput, setShowNewUnitInput] = useState(false);
  const [newCategoryText, setNewCategoryText] = useState('');
  const [newUnitText, setNewUnitText] = useState('');
  const [newProduct, setNewProduct] = useState<NewProduct>({
    name: '',
    category: '',
    price: '',
    description: '',
    stockQuantity: '',
    unit: '',
    trackInventory: false,
    // Weight-based defaults
    weightBased: false,
    pricePerUnit: '',
    weightUnit: 'lb',
    minWeight: '0.5',
    maxWeight: '5.0',
  });

  // Keep refs for current selection when editing so we can show existing image
  const [selectedProductImageUrl, setSelectedProductImageUrl] = useState<string | null>(null);
  const [selectedProductImgixUrl, setSelectedProductImgixUrl] = useState<string | null>(null);

  // When an item is selected for editing, load full product to get image urls
  useEffect(() => {
    const loadDetails = async () => {
      if (!editingProductId) return;
      try {
        console.log('[Inventory] Fetching product by id for edit:', editingProductId);
        const resp = await productsAPI.getById(editingProductId);
        const p: any = resp.data || {};
        console.log('[Inventory] Product details response keys:', Object.keys(p || {}));
        const images = p?.images || {};
        console.log('[Inventory] images block:', images);
        const chosenDisplay = images.large || images.medium || images.original || null;
        const fallbackUrl = p?.imageUrl || images.original || null;
        console.log('[Inventory] chosenDisplay:', chosenDisplay, 'fallbackUrl:', fallbackUrl);
        setSelectedProductImgixUrl(chosenDisplay);
        setSelectedProductImageUrl(fallbackUrl);
      } catch (e) {
        console.warn('[Inventory] Failed to load product details for edit:', e);
      }
    };
    loadDetails();
  }, [editingProductId]);

  // Debug logger for render-time image decision
  useEffect(() => {
    console.log('[Inventory] image state -> newProduct.image?', !!(newProduct as any).image, 'imgixUrl:', selectedProductImgixUrl, 'imageUrl:', selectedProductImageUrl, 'editingProductId:', editingProductId);
  }, [newProduct, selectedProductImgixUrl, selectedProductImageUrl, editingProductId]);

  // Dynamic categories and units from backend
  const [availableCategories, setAvailableCategories] = useState<{ id: number; name: string }[]>([]);
  const [availableUnits, setAvailableUnits] = useState<{ id: number; name: string; symbol: string }[]>([]);

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      if (response.data) {
        setAvailableCategories(response.data as { id: number; name: string }[]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch units from API
  const fetchUnits = async () => {
    try {
      const response = await unitsAPI.getAll();
      if (response.data) {
        setAvailableUnits(response.data as { id: number; name: string; symbol: string }[]);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      console.log('API Request: GET', 'products');
      const response = await productsAPI.getAll();
      
      if (response.data) {
        const formattedProducts = (response.data as any[]).map((product: any) => ({
          id: product.id,
          name: product.name || 'Unnamed Product',
          category: product.category || 'Uncategorized',
          price: product.price || '0.00',
          stock: product.stockQuantity || 0,
          lowStock: product.trackInventory ? (product.stockQuantity || 0) < 10 : false,
          unit: product.unit || 'item',
          status: product.available ? 'active' : 'out_of_stock',
          trackInventory: product.trackInventory || false,
          stockStatus: product.stockStatus || 'In Stock',
          available: product.available || false,
        }));

        setProducts(formattedProducts);

        // Calculate categories from actual product data
        const categoryStats = formattedProducts.reduce((acc: Record<string, number>, product: Product) => {
          const category = product.category || 'Uncategorized';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {});

        // Create categories array
        const categoriesArray: Category[] = [
          { key: 'all', label: 'All Items', count: formattedProducts.length },
          ...Object.entries(categoryStats).map(([key, count]) => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            count,
          }))
        ];

        setCategories(categoriesArray);

      } else {
        setError(response.error || 'Failed to load products');
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchUnits();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setError(null);
    fetchProducts();
  };

  const getStockStatus = (product: Product) => {
    if (product.stockStatus === 'Always Available') {
      return { text: 'Always Available', color: '#8B5CF6' };
    }
    if (product.stockStatus === 'Out of Stock') {
      return { text: 'Out of Stock', color: '#DC2626' };
    }
    if (product.stockStatus === 'Low Stock') {
      return { text: 'Low Stock', color: '#EA580C' };
    }
    return { text: 'In Stock', color: '#16A34A' };
  };

  const handleAddProduct = () => {
    setEditingProductId(null);
    resetForm();
    setAddModalVisible(true);
  };

  const resetForm = () => {
    setNewProduct({
      name: '',
      category: '',
      price: '',
      description: '',
      stockQuantity: '',
      unit: '',
      trackInventory: false,
      // Weight-based defaults
      weightBased: false,
      pricePerUnit: '',
      weightUnit: 'lb',
      minWeight: '0.5',
      maxWeight: '5.0',
    });
    setSelectedProductImageUrl(null);
    setSelectedProductImgixUrl(null);
    setCategoryDropdownOpen(false);
    setUnitDropdownOpen(false);
    setShowNewCategoryInput(false);
    setShowNewUnitInput(false);
    setNewCategoryText('');
    setNewUnitText('');
  };

  const closeAddModal = () => {
    setAddModalVisible(false);
    setEditingProductId(null);
    resetForm();
  };

  const selectCategory = (categoryName: string) => {
    if (categoryName === 'Add New Category...') {
      setShowNewCategoryInput(true);
    } else {
      const selectedCategory = availableCategories.find(cat => cat.name === categoryName);
      setNewProduct(prev => ({ 
        ...prev, 
        category: categoryName,
        categoryId: selectedCategory?.id
      }));
    }
    setCategoryDropdownOpen(false);
  };

  const selectUnit = (unitName: string) => {
    if (unitName === 'Add New Unit...') {
      setShowNewUnitInput(true);
    } else {
      const selectedUnit = availableUnits.find(unit => unit.name === unitName);
      
      // Auto-detect weight-based products (when unit is "pound")
      const isWeightBased = unitName === 'pound';
      
      setNewProduct(prev => ({ 
        ...prev, 
        unit: unitName,
        unitId: selectedUnit?.id,
        // Auto-configure weight-based settings
        weightBased: isWeightBased,
        pricePerUnit: isWeightBased ? prev.price : '',
        weightUnit: isWeightBased ? 'lb' : '',
        minWeight: isWeightBased ? '0.5' : '',
        maxWeight: isWeightBased ? '5.0' : '',
      }));
    }
    setUnitDropdownOpen(false);
  };

  const submitProductUpdate = async () => {
    if (!editingProductId) return;
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('product[name]', newProduct.name);
      if (newProduct.categoryId) formData.append('product[category_ids][]', newProduct.categoryId.toString());
      formData.append('product[price]', newProduct.price);
      formData.append('product[description]', newProduct.description);
      formData.append('product[track_inventory]', newProduct.trackInventory.toString());
      if (newProduct.trackInventory) formData.append('product[stock_quantity]', newProduct.stockQuantity);
      if (newProduct.unitId) formData.append('product[unit_id]', newProduct.unitId.toString());
      
      // Add weight-based fields for updates too
      formData.append('product[weight_based]', newProduct.weightBased.toString());
      if (newProduct.weightBased) {
        formData.append('product[price_per_unit]', newProduct.pricePerUnit || newProduct.price);
        formData.append('product[weight_unit]', newProduct.weightUnit);
        formData.append('product[min_weight]', newProduct.minWeight);
        formData.append('product[max_weight]', newProduct.maxWeight);
      }
      if (newProduct.image) {
        formData.append('product[image]', { uri: newProduct.image.uri, type: 'image/jpeg', name: 'product-image.jpg' } as any);
      }

      const response = await productsAPI.update(editingProductId, formData);
      if (response.data) {
        Alert.alert('Success', 'Product updated successfully!');
        fetchProducts();
        closeAddModal();
      } else {
        Alert.alert('Error', response.error || 'Failed to update product');
      }
    } catch (error) {
      console.error('Failed to update product:', error);
      Alert.alert('Error', 'Failed to update product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addNewCategory = async () => {
    if (newCategoryText.trim()) {
      try {
        const response = await categoriesAPI.create({ name: newCategoryText.trim() });
        if (response.data) {
          // Refresh categories list
          await fetchCategories();
          // Set the new category as selected
          const newCategoryData = response.data as { id: number; name: string };
          setNewProduct(prev => ({ 
            ...prev, 
            category: newCategoryData.name,
            categoryId: newCategoryData.id
          }));
          setShowNewCategoryInput(false);
          setNewCategoryText('');
        }
      } catch (error) {
        console.error('Error creating category:', error);
        alert('Failed to create category');
      }
    }
  };

  const selectUnit = (unitName: string) => {
    if (unitName === 'Add New Unit...') {
      setShowNewUnitInput(true);
    } else {
      const selectedUnit = availableUnits.find(unit => unit.name === unitName);
      setNewProduct(prev => ({ 
        ...prev, 
        unit: unitName,
        unitId: selectedUnit?.id
      }));
    }
    setUnitDropdownOpen(false);
  };

  const addNewUnit = async () => {
    if (newUnitText.trim()) {
      try {
        const response = await unitsAPI.create({ 
          name: newUnitText.trim().toLowerCase(),
          symbol: newUnitText.trim().toLowerCase()
        });
        if (response.data) {
          // Refresh units list
          await fetchUnits();
          // Set the new unit as selected
          const newUnitData = response.data as { id: number; name: string; symbol: string };
          setNewProduct(prev => ({ 
            ...prev, 
            unit: newUnitData.name,
            unitId: newUnitData.id
          }));
          setShowNewUnitInput(false);
          setNewUnitText('');
        }
      } catch (error) {
        console.error('Error creating unit:', error);
        alert('Failed to create unit');
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, // Compress to 70% quality to reduce file size
    });

    if (!result.canceled) {
      setNewProduct(prev => ({ ...prev, image: result.assets[0] }));
    }
  };

  const submitProduct = async () => {
    // Validate required fields - stock quantity only required if tracking inventory
    const requiredFieldsMissing = !newProduct.name || !newProduct.category || !newProduct.price || !newProduct.unit || 
      (newProduct.trackInventory && !newProduct.stockQuantity);
    
    if (requiredFieldsMissing) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('product[name]', newProduct.name);
      if (newProduct.categoryId) {
        formData.append('product[category_ids][]', newProduct.categoryId.toString());
      }
      formData.append('product[price]', newProduct.price);
      formData.append('product[description]', newProduct.description);
      formData.append('product[track_inventory]', newProduct.trackInventory.toString());
      if (newProduct.trackInventory) {
        formData.append('product[stock_quantity]', newProduct.stockQuantity);
      }
      if (newProduct.unitId) {
        formData.append('product[unit_id]', newProduct.unitId.toString());
      }
      
      // Add weight-based fields
      formData.append('product[weight_based]', newProduct.weightBased.toString());
      if (newProduct.weightBased) {
        formData.append('product[price_per_unit]', newProduct.pricePerUnit || newProduct.price);
        formData.append('product[weight_unit]', newProduct.weightUnit);
        formData.append('product[min_weight]', newProduct.minWeight);
        formData.append('product[max_weight]', newProduct.maxWeight);
      }

      if (newProduct.image) {
        formData.append('product[image]', {
          uri: newProduct.image.uri,
          type: 'image/jpeg',
          name: 'product-image.jpg',
        } as any);
      }

      const response = await productsAPI.create(formData);
      
      if (response.data) {
        const successMessage = 'Product created successfully!';
        const imageError = (response.data as any)?.imageUploadError;
        
        if (imageError) {
          Alert.alert(
            'Product Created', 
            `${successMessage}\n\nWarning: Image upload failed - ${imageError}`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Success', successMessage);
        }
        
        fetchProducts();
        closeAddModal();
      } else {
        Alert.alert('Error', response.error || 'Failed to create product');
      }
    } catch (error) {
      console.error('Failed to create product:', error);
      Alert.alert('Error', 'Failed to create product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStock = async (product: Product) => {
    // Implementation for toggling stock status
    console.log('Toggle stock for:', product.name);
  };

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category?.toLowerCase() === selectedCategory.toLowerCase());

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Inventory Management</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Category Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.key}
                style={[
                  styles.filterTab,
                  selectedCategory === category.key && styles.filterTabActive
                ]}
                onPress={() => setSelectedCategory(category.key)}
              >
                <Text style={[
                  styles.filterText,
                  selectedCategory === category.key && styles.filterTextActive
                ]}>
                  {category.label}
                </Text>
                <View style={[
                  styles.countBadge,
                  selectedCategory === category.key && styles.countBadgeActive
                ]}>
                  <Text style={[
                    styles.countText,
                    selectedCategory === category.key && styles.countTextActive
                  ]}>
                    {category.count}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products List */}
        <ScrollView 
          style={styles.productsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No products found</Text>
              <Text style={styles.emptyStateDescription}>
                {selectedCategory === 'all' 
                  ? 'Start by adding your first product' 
                  : `No products in ${categories.find(c => c.key === selectedCategory)?.label || selectedCategory} category`
                }
              </Text>
            </View>
          ) : (
            filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product);
              return (
                  <View key={product.id} style={styles.productCard}>
                    <View style={styles.productHeader}>
                      <View style={styles.productHeaderRow}>
                        <View style={styles.productInfo}>
                          <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">{product.name}</Text>
                          <Text style={styles.productCategory}>{product.category}</Text>
                        </View>
                      </View>
                      <View style={[
                        styles.statusBadge, 
                        { backgroundColor: `${stockStatus.color}15` }
                      ]}>
                        <Text style={[styles.stockStatus, { 
                          color: stockStatus.color,
                          backgroundColor: 'transparent',
                          paddingHorizontal: 0,
                          paddingVertical: 0,
                        }]}>
                          {stockStatus.text}
                        </Text>
                      </View>
                    </View>
                  
                  <View style={styles.productDetails}>
                    <Text style={styles.productPrice}>${product.price}</Text>
                    <Text style={styles.productStock}>
                      {product.trackInventory ? `${product.stock} ${product.unit}` : `per ${product.unit}`}
                    </Text>
                  </View>
                  
                  <View style={styles.productActions}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => {
                        // Populate form with existing values and open modal in pageSheet style (same as orders)
                        setNewProduct((prev) => ({
                          ...prev,
                          name: product.name,
                          category: product.category,
                          price: String(product.price),
                          description: prev.description || '',
                          stockQuantity: String(product.stock || ''),
                          unit: product.unit,
                          trackInventory: product.trackInventory,
                        }));
                        // Capture existing image sources if present
                        // Backend `product_json` provides imageUrl or images (with imgix URL)
                        // Our product list mapping currently doesn't store them, so fetch by id now
                        (async () => {
                          try {
                            const resp = await productsAPI.getById(String(product.id));
                            const p: any = resp.data || {};
                            // images can be { thumbnail, medium, large, original }
                            const images = p?.images || {};
                            // Prefer large/medium/imgix-like URL if present; else imageUrl
                            setSelectedProductImgixUrl(images.large || images.medium || images.original || null);
                            setSelectedProductImageUrl(p?.imageUrl || images.original || null);
                          } catch (_) {}
                        })();

                        setEditingProductId(String(product.id));
                        setAddModalVisible(true);
                      }}
                    >
                      <Ionicons name="create-outline" size={14} color="#22C55E" />
                      <Text style={[styles.actionText, { color: '#22C55E' }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.toggleButton]} 
                      onPress={() => handleToggleStock(product)}
                    >
                      <Ionicons 
                        name={product.status === 'active' ? 'eye-off-outline' : 'eye-outline'} 
                        size={14} 
                        color="#8B5CF6" 
                      />
                      <Text style={[styles.actionText, { color: '#8B5CF6' }]}>
                        {product.status === 'active' ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Add/Edit Product Modal (pageSheet style to match Orders) */}
        <Modal
          animationType="slide"
          presentationStyle="pageSheet"
          visible={addModalVisible}
          onRequestClose={closeAddModal}
        >
          <SafeAreaView style={styles.sheetContainer}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingProductId ? 'Edit Product' : 'Add New Product'}</Text>
                <TouchableOpacity onPress={closeAddModal} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                {/* Product Image */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Product Image</Text>
                  <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
                    {(() => {
                      const localUri = (newProduct as any).image?.uri;
                      const existing = selectedProductImgixUrl || selectedProductImageUrl;
                      console.log('[Inventory] render image -> localUri:', localUri, 'existing:', existing);
                      if (localUri) {
                        return <Image source={{ uri: localUri }} style={styles.uploadedImage} />;
                      }
                      if (editingProductId && existing) {
                        return (
                          <SimpleImage
                            src={existing}
                            style={styles.uploadedImage}
                            containerStyle={styles.imageContainer}
                            accessibilityLabel="Existing product image"
                          />
                        );
                      }
                      return (
                        <>
                          <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
                          <Text style={styles.imageUploadText}>Tap to select image</Text>
                        </>
                      );
                    })()}
                  </TouchableOpacity>
                </View>

                {/* Product Name */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Product Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter product name"
                    value={newProduct.name}
                    onChangeText={(text) => setNewProduct(prev => ({ ...prev, name: text }))}
                  />
                </View>

                {/* Category - Simple Dropdown */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Category *</Text>
                  {showNewCategoryInput ? (
                    <View style={styles.newCategoryContainer}>
                      <TextInput
                        style={[styles.textInput, { flex: 1, marginRight: 8 }]}
                        placeholder="Enter new category"
                        value={newCategoryText}
                        onChangeText={setNewCategoryText}
                        autoFocus
                      />
                      <TouchableOpacity style={styles.addCategoryButton} onPress={addNewCategory}>
                        <Ionicons name="checkmark" size={20} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.cancelCategoryButton} 
                        onPress={() => {
                          setShowNewCategoryInput(false);
                          setNewCategoryText('');
                        }}
                      >
                        <Ionicons name="close" size={20} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                        <TouchableOpacity
                          style={[styles.textInput, styles.dropdownButton]}
                          onPress={() => {
                            setCategoryDropdownOpen(!categoryDropdownOpen);
                            setUnitDropdownOpen(false); // Close unit dropdown when opening category
                          }}
                        >
                        <Text style={[
                          styles.dropdownText,
                          !newProduct.category && styles.dropdownPlaceholder
                        ]}>
                          {newProduct.category || 'Select category'}
                        </Text>
                        <Ionicons 
                          name={categoryDropdownOpen ? "chevron-up" : "chevron-down"} 
                          size={20} 
                          color="#6B7280" 
                        />
                      </TouchableOpacity>
                      
                      {/* Simple Expandable Category List */}
                      {categoryDropdownOpen && (
                        <View style={styles.categoryListContainer}>
                          <ScrollView style={styles.categoryList} nestedScrollEnabled>
                            {availableCategories.map((category, index) => (
                              <TouchableOpacity
                                key={index}
                                style={styles.categoryOption}
                                onPress={() => selectCategory(category.name)}
                              >
                                <Text style={styles.categoryOptionText}>{category.name}</Text>
                              </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                              style={[styles.categoryOption, styles.addNewCategoryOption]}
                              onPress={() => selectCategory('Add New Category...')}
                            >
                              <Ionicons name="add" size={20} color="#0F766E" />
                              <Text style={[styles.categoryOptionText, { color: '#0F766E', marginLeft: 8 }]}>
                                Add New Category...
                              </Text>
                            </TouchableOpacity>
                          </ScrollView>
                        </View>
                      )}
                    </>
                  )}
                </View>

                {/* Price and Unit */}
                <View style={styles.rowContainer}>
                  <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.fieldLabel}>Price ($) *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="0.00"
                      value={newProduct.price}
                      onChangeText={(text) => setNewProduct(prev => ({ ...prev, price: text }))}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.fieldLabel}>Unit *</Text>
                    {showNewUnitInput ? (
                      <View style={styles.newCategoryContainer}>
                        <TextInput
                          style={[styles.textInput, { flex: 1, marginRight: 8 }]}
                          placeholder="Enter new unit"
                          value={newUnitText}
                          onChangeText={setNewUnitText}
                          autoFocus
                        />
                        <TouchableOpacity style={styles.addCategoryButton} onPress={addNewUnit}>
                          <Ionicons name="checkmark" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.cancelCategoryButton} 
                          onPress={() => {
                            setShowNewUnitInput(false);
                            setNewUnitText('');
                          }}
                        >
                          <Ionicons name="close" size={20} color="#6B7280" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[styles.textInput, styles.dropdownButton]}
                           onPress={() => {
                            setUnitDropdownOpen(!unitDropdownOpen);
                            setCategoryDropdownOpen(false); // Close category dropdown when opening unit
                          }}
                        >
                          <Text style={[
                            styles.dropdownText,
                            !newProduct.unit && styles.dropdownPlaceholder
                          ]}>
                            {newProduct.unit || 'Select unit'}
                          </Text>
                          <Ionicons 
                            name={unitDropdownOpen ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color="#6B7280" 
                          />
                        </TouchableOpacity>
                        
                        {/* Simple Expandable Unit List */}
                        {unitDropdownOpen && (
                          <View style={styles.categoryListContainer}>
                            <ScrollView style={styles.categoryList} nestedScrollEnabled>
                              {availableUnits.map((unit, index) => (
                                <TouchableOpacity
                                  key={index}
                                  style={styles.categoryOption}
                                  onPress={() => selectUnit(unit.name)}
                                >
                                  <Text style={styles.categoryOptionText}>{unit.name}</Text>
                                </TouchableOpacity>
                              ))}
                              <TouchableOpacity
                                style={[styles.categoryOption, styles.addNewCategoryOption]}
                                onPress={() => selectUnit('Add New Unit...')}
                              >
                                <Ionicons name="add" size={20} color="#0F766E" />
                                <Text style={[styles.categoryOptionText, { color: '#0F766E', marginLeft: 8 }]}>
                                  Add New Unit...
                                </Text>
                              </TouchableOpacity>
                            </ScrollView>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                </View>

                {/* Track Inventory Toggle */}
                <View style={styles.fieldContainer}>
                  <View style={styles.toggleContainer}>
                    <View>
                      <Text style={styles.fieldLabel}>Track Inventory</Text>
                      <Text style={styles.toggleDescription}>
                        {newProduct.trackInventory ? 'Monitor stock levels and quantities' : 'Product is always available'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggle, newProduct.trackInventory && styles.toggleActive]}
                      onPress={() => setNewProduct(prev => ({ ...prev, trackInventory: !prev.trackInventory, stockQuantity: prev.trackInventory ? '' : prev.stockQuantity }))}
                    >
                      <View style={[styles.toggleKnob, newProduct.trackInventory && styles.toggleKnobActive]} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Stock Quantity - Only show if tracking inventory */}
                {newProduct.trackInventory && (
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Stock Quantity *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter quantity"
                      value={newProduct.stockQuantity}
                      onChangeText={(text) => setNewProduct(prev => ({ ...prev, stockQuantity: text }))}
                      keyboardType="numeric"
                    />
                  </View>
                )}

                {/* Description */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Enter product description (optional)"
                    value={newProduct.description}
                    onChangeText={(text) => setNewProduct(prev => ({ ...prev, description: text }))}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </ScrollView>

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={closeAddModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
                  onPress={editingProductId ? submitProductUpdate : submitProduct}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <View style={styles.submitButtonContent}>
                      <ActivityIndicator size="small" color="white" />
                      <Text style={[styles.submitButtonText, { marginLeft: 8 }]}>
                        {newProduct.image ? 'Uploading...' : (editingProductId ? 'Updating...' : 'Creating...')}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.submitButtonText}>{editingProductId ? 'Update Product' : 'Create Product'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#0F766E',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersContainer: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  },
  filtersContent: {
    paddingHorizontal: 16,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 6,
  },
  filterTextActive: {
    color: 'white',
  },
  countBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  countTextActive: {
    color: 'white',
  },
  productsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productHeader: {
    marginBottom: 8,
  },
  productHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
    flexShrink: 1,
  },
  productCategory: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  productStock: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  stockStatus: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  toggleButton: {
    backgroundColor: '#F8FAFF',
    borderColor: '#8B5CF6',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Modal Styles
  sheetContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    height: '90%',
    padding: 0,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  modalForm: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  fieldContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  imageUpload: {
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 16,
    height: 120, // match catalog itemImage height for consistent aspect
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    resizeMode: 'cover',
  },
  imageUploadText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  sheetContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 30,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#0F766E',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Category Dropdown Styles
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#1F2937',
  },
  dropdownPlaceholder: {
    color: '#94A3B8',
  },
  categoryListContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#FFFFFF',
    maxHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryList: {
    maxHeight: 200,
  },
  categoryOption: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  addNewCategoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0,
    backgroundColor: '#F0FDF4',
    marginTop: 4,
    marginHorizontal: 4,
    marginBottom: 4,
    borderRadius: 8,
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  newCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addCategoryButton: {
    backgroundColor: '#0F766E',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  cancelCategoryButton: {
    backgroundColor: '#F1F5F9',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  // Toggle Styles
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#0F766E',
  },
  toggleKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    transform: [{ translateX: 24 }],
  },
}); 