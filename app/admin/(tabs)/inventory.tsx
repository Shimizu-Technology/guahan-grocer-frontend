import React, { useState, useEffect, useRef } from 'react';
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
import { productsAPI, categoriesAPI, unitsAPI, adminAPI } from '../../../services/api';
import BarcodeScanner from '../../../components/admin/BarcodeScanner';

// Global processing lock to prevent any barcode processing
let GLOBAL_PROCESSING_LOCK = false;

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
  gtin?: string;
  
  // Enhanced Open Food Facts fields
  brand?: string;
  size?: string; // ✅ ADD MISSING SIZE
  servingSize?: string;
  ingredients?: string;
  allergens?: string;
  traces?: string;
  offCategories?: string;
  offLabels?: string;
  nutriscoreGrade?: string;
  novaGroup?: number | null;
  packaging?: string;
  
  // Enhanced images
  imageUrls?: string[]; // ✅ ADD MISSING IMAGE URLS ARRAY
  imageIngredientsUrl?: string;
  imageNutritionUrl?: string;
  
  // Enhanced nutrition data
  nutritionData?: any; // ✅ ADD MISSING NUTRITION DATA
  
  // Indicators
  isFoodProduct?: boolean;
  hasAllergenInfo?: boolean;
  hasHealthScores?: boolean;
  
  // Weight-based fields
  weightBased: boolean;
  pricePerUnit: string;
  weightUnit: string;
  minWeight: string;
  maxWeight: string;
}

// Helper function for Nutri-Score colors
const getNutriScoreColor = (grade: string): string => {
  switch (grade.toLowerCase()) {
    case 'a': return '#00B04F';
    case 'b': return '#85BB2F';
    case 'c': return '#FFCC00';
    case 'd': return '#FF8C00';
    case 'e': return '#FF6B6B';
    default: return '#9CA3AF';
  }
};

// Helper function to clean allergen strings (remove "en:" prefixes)
const cleanAllergenString = (allergens: string): string => {
  if (!allergens) return '';
  return allergens
    .split(',')
    .map(allergen => allergen.trim().replace(/^[a-z]+:/, ''))
    .join(', ');
};

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
  
  // Barcode Scanner States
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanningForEdit, setScanningForEdit] = useState(false);
  const [lastProcessedBarcode, setLastProcessedBarcode] = useState<string | null>(null);
  const [lastProcessTime, setLastProcessTime] = useState<number>(0);
  
  // Refs for immediate synchronous blocking
  const processingRef = useRef(false);
  const lastBarcodeRef = useRef<string | null>(null);
  const lastBarcodeTimeRef = useRef<number>(0);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [showNewUnitInput, setShowNewUnitInput] = useState(false);
  const [newCategoryText, setNewCategoryText] = useState('');
  const [newUnitText, setNewUnitText] = useState('');
  
  // Enhancement modal state
  const [enhancementModalVisible, setEnhancementModalVisible] = useState(false);
  const [enhancementData, setEnhancementData] = useState<any>(null);
  const [selectedEnhancements, setSelectedEnhancements] = useState<Set<string>>(new Set());
  
  // Debug effect to monitor modal state changes
  useEffect(() => {
    console.log('🔄 Enhancement modal state changed:', enhancementModalVisible);
    if (enhancementModalVisible && enhancementData) {
      console.log('✅ Modal should now be visible with data for:', enhancementData.product_name);
    }
  }, [enhancementModalVisible, enhancementData]);
  const [newProduct, setNewProduct] = useState<NewProduct>({
    name: '',
    category: '',
    price: '',
    description: '',
    stockQuantity: '',
    unit: '',
    trackInventory: false,
    gtin: '', // Initialize GTIN
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

  // Debug: Track enhanced data state changes
  useEffect(() => {
    if (newProduct.name || newProduct.brand || newProduct.allergens) {
      console.log('🔍 Enhanced data state updated:', {
        name: newProduct.name,
        brand: newProduct.brand,
        allergens: newProduct.allergens,
        nutriscoreGrade: newProduct.nutriscoreGrade,
        hasHealthScores: newProduct.hasHealthScores,
        isFoodProduct: newProduct.isFoodProduct,
        showEnhanced: !!(newProduct.brand || newProduct.allergens || newProduct.nutriscoreGrade)
      });
    }
  }, [newProduct.name, newProduct.brand, newProduct.allergens, newProduct.nutriscoreGrade, newProduct.hasHealthScores, newProduct.isFoodProduct]);

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

  const handleScanBarcode = () => {
    console.log('🔄 Starting scan process - closing add modal first...');
    setScanningForEdit(false);
    
    // Close the add product modal first to avoid nested modal issues
    setAddModalVisible(false);
    
    // Open scanner modal after add modal is closed
    setTimeout(() => {
      console.log('🔄 Opening scanner modal...');
      setScannerVisible(true);
    }, 300); // Delay to ensure add modal is fully closed
  };

  const handleBarcodeScanned = async (gtin: string) => {
    const now = Date.now();
    
    // GLOBAL LOCK - prevents ANY processing anywhere
    if (GLOBAL_PROCESSING_LOCK) {
      console.log('🚫 GLOBAL PROCESSING LOCK: Blocked');
      return;
    }
    
    // SYNCHRONOUS blocking using refs - ultimate protection
    if (processingRef.current) {
      console.log('🚫 REF PROCESSING LOCK: Blocked');
      return;
    }
    
    // Multiple layers of protection against duplicate processing
    if (isSubmitting) {
      console.log('⚠️ Already processing a barcode, ignoring... (state)');
      return;
    }
    
    // Prevent same barcode within 5 seconds
    if (lastBarcodeRef.current === gtin && (now - lastBarcodeTimeRef.current) < 5000) {
      console.log('⚠️ Same barcode processed recently, ignoring... (ref)');
      return;
    }
    
    // Prevent any barcode processing within 2 seconds
    if ((now - lastBarcodeTimeRef.current) < 2000) {
      console.log('⚠️ Processing too frequent, ignoring... (ref)');
      return;
    }

    try {
      // IMMEDIATELY set ALL locks to block further processing (synchronous)
      GLOBAL_PROCESSING_LOCK = true;
      processingRef.current = true;
      lastBarcodeRef.current = gtin;
      lastBarcodeTimeRef.current = now;
      
      // Set tracking variables for state
      setLastProcessedBarcode(gtin);
      setLastProcessTime(now);
      console.log('🔍 Processing barcode:', gtin);
      setIsSubmitting(true);
      
      // Call the scan_product API
      const response = await adminAPI.scanProduct(gtin);
      console.log('📡 API Response:', response);
      
      if (response.error) {
        console.error('❌ API Error:', response.error);
        Alert.alert('Error', response.error);
        return;
      }

      const scanData = response.data as any;
      
      if (scanData?.exists) {
        // Product already exists
        console.log('✅ Product exists:', scanData.product?.name);
        Alert.alert(
          'Product Already Exists',
          `"${scanData.product?.name || 'Unknown product'}" is already in your catalog.`,
          [{ text: 'OK' }]
        );
      } else if (scanData?.product_data) {
        // Found in Open Food Facts - pre-fill form with enhanced data
        console.log('🌐 Open Food Facts data found:', scanData.product_data.name);
        console.log('📊 Full product data:', JSON.stringify(scanData.product_data, null, 2));
        const productData = scanData.product_data;
        
        resetForm(); // Clear any existing form data
        setNewProduct(prev => ({
          ...prev,
          name: productData.name || '',
          description: '', // Leave description blank for admin to fill
          gtin: gtin,
          // Enhanced Open Food Facts data
          brand: productData.brand || '',
          size: productData.size || '', // ✅ ADD MISSING SIZE
          servingSize: productData.serving_size || '',
          ingredients: productData.ingredients_text || '',
          allergens: cleanAllergenString(productData.allergens || ''),
          traces: productData.traces || '',
          offCategories: productData.off_categories || '',
          offLabels: productData.off_labels || '',
          nutriscoreGrade: productData.nutriscore_grade || '',
          novaGroup: productData.nova_group || null,
          packaging: productData.packaging || '',
          // Enhanced images
          imageUrls: productData.image_urls || [], // ✅ ADD MISSING IMAGE URLS
          imageIngredientsUrl: productData.image_ingredients_url || '',
          imageNutritionUrl: productData.image_nutrition_url || '',
          // Enhanced nutrition data
          nutritionData: productData.nutrition_data || {}, // ✅ ADD MISSING NUTRITION DATA
          // Indicators
          isFoodProduct: productData.is_food_product || false,
          hasAllergenInfo: productData.has_allergen_info || false,
          hasHealthScores: productData.has_health_scores || false,
        }));
        
        // Set editing state (modal will be reopened by onClose callback)
        setEditingProductId(null);
        
        // Debug logging will be handled by useEffect
        
        // Enhanced alert with health info
        const healthInfo = [];
        if (productData.nutriscore_grade) healthInfo.push(`Nutri-Score: ${productData.nutriscore_grade.toUpperCase()}`);
        if (productData.allergens) healthInfo.push(`Contains allergens`);
        
        Alert.alert(
          'Enhanced Product Found! 🌟',
          `"${productData.name || 'Product'}" found with detailed nutrition data.\n${healthInfo.join(' • ')}\n\nPlease set the price and category.`,
          [{ text: 'OK' }]
        );
          } else {
            // Not found in Open Food Facts - show empty form with GTIN
            console.log('❌ Product not found in Open Food Facts');
            resetForm(); // Clear any existing form data
            setNewProduct(prev => ({
              ...prev,
              name: '',
              description: `Scanned barcode: ${gtin}`,
              gtin: gtin,
            }));
            
            setEditingProductId(null);
            // Modal will be reopened by onClose callback
            
            Alert.alert(
              'Product Not Found in Database',
              'This barcode was not found in the Open Food Facts database. This is normal for non-food items like notebooks, school supplies, etc. Please enter the product details manually.',
              [{ text: 'OK' }]
            );
          }
    } catch (error: any) {
      console.error('💥 Barcode scan error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to process barcode. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      // Reset ALL locks
      GLOBAL_PROCESSING_LOCK = false;
      processingRef.current = false;
      setIsSubmitting(false);
    }
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
      gtin: '',
      
      // Enhanced Open Food Facts fields (all reset to empty)
      brand: '',
      servingSize: '',
      ingredients: '',
      allergens: '',
      traces: '',
      offCategories: '',
      offLabels: '',
      nutriscoreGrade: '',
      novaGroup: null,
      packaging: '',
      
      // Enhanced images
      imageIngredientsUrl: '',
      imageNutritionUrl: '',
      
      // Indicators
      isFoodProduct: false,
      hasAllergenInfo: false,
      hasHealthScores: false,
      
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

      // Add enhanced Open Food Facts fields for updates
      if (newProduct.gtin) formData.append('product[gtin]', newProduct.gtin);
      if (newProduct.brand) formData.append('product[brand]', newProduct.brand);
      if (newProduct.size) formData.append('product[size]', newProduct.size); // ✅ ADD MISSING SIZE
      if (newProduct.servingSize) formData.append('product[serving_size]', newProduct.servingSize);
      if (newProduct.ingredients) formData.append('product[ingredients_text]', newProduct.ingredients);
      if (newProduct.allergens) formData.append('product[allergens]', newProduct.allergens);
      if (newProduct.traces) formData.append('product[traces]', newProduct.traces);
      if (newProduct.offCategories) formData.append('product[off_categories]', newProduct.offCategories);
      if (newProduct.offLabels) formData.append('product[off_labels]', newProduct.offLabels);
      if (newProduct.nutriscoreGrade) formData.append('product[nutriscore_grade]', newProduct.nutriscoreGrade);
      if (newProduct.novaGroup) formData.append('product[nova_group]', newProduct.novaGroup.toString());
      if (newProduct.packaging) formData.append('product[packaging]', newProduct.packaging);
      if (newProduct.imageIngredientsUrl) formData.append('product[image_ingredients_url]', newProduct.imageIngredientsUrl);
      if (newProduct.imageNutritionUrl) formData.append('product[image_nutrition_url]', newProduct.imageNutritionUrl);
      
      // ✅ ADD MISSING IMAGE URLS ARRAY
      if (newProduct.imageUrls && newProduct.imageUrls.length > 0) {
        newProduct.imageUrls.forEach(url => {
          formData.append('product[image_urls][]', url);
        });
      }
      
      // ✅ ADD MISSING NUTRITION DATA
      if (newProduct.nutritionData && Object.keys(newProduct.nutritionData).length > 0) {
        formData.append('product[nutrition_data]', JSON.stringify(newProduct.nutritionData));
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

      // Add enhanced Open Food Facts fields
      if (newProduct.gtin) formData.append('product[gtin]', newProduct.gtin);
      if (newProduct.brand) formData.append('product[brand]', newProduct.brand);
      if (newProduct.size) formData.append('product[size]', newProduct.size); // ✅ ADD MISSING SIZE
      if (newProduct.servingSize) formData.append('product[serving_size]', newProduct.servingSize);
      if (newProduct.ingredients) formData.append('product[ingredients_text]', newProduct.ingredients);
      if (newProduct.allergens) formData.append('product[allergens]', newProduct.allergens);
      if (newProduct.traces) formData.append('product[traces]', newProduct.traces);
      if (newProduct.offCategories) formData.append('product[off_categories]', newProduct.offCategories);
      if (newProduct.offLabels) formData.append('product[off_labels]', newProduct.offLabels);
      if (newProduct.nutriscoreGrade) formData.append('product[nutriscore_grade]', newProduct.nutriscoreGrade);
      if (newProduct.novaGroup) formData.append('product[nova_group]', newProduct.novaGroup.toString());
      if (newProduct.packaging) formData.append('product[packaging]', newProduct.packaging);
      if (newProduct.imageIngredientsUrl) formData.append('product[image_ingredients_url]', newProduct.imageIngredientsUrl);
      if (newProduct.imageNutritionUrl) formData.append('product[image_nutrition_url]', newProduct.imageNutritionUrl);
      
      // ✅ ADD MISSING IMAGE URLS ARRAY
      if (newProduct.imageUrls && newProduct.imageUrls.length > 0) {
        newProduct.imageUrls.forEach(url => {
          formData.append('product[image_urls][]', url);
        });
      }
      
      // ✅ ADD MISSING NUTRITION DATA
      if (newProduct.nutritionData && Object.keys(newProduct.nutritionData).length > 0) {
        formData.append('product[nutrition_data]', JSON.stringify(newProduct.nutritionData));
      }

      if (newProduct.image) {
        formData.append('product[image]', {
          uri: newProduct.image.uri,
          type: 'image/jpeg',
          name: 'product-image.jpg',
        } as any);
      }

      // Check if we have enhanced Open Food Facts data
      const hasEnhancedData = newProduct.gtin || newProduct.brand || newProduct.servingSize || 
                              newProduct.ingredients || newProduct.allergens || newProduct.offCategories;
      
      // Use admin API if we have enhanced data, regular API otherwise
      const response = hasEnhancedData 
        ? await adminAPI.createProduct(formData)
        : await productsAPI.create(formData);
      
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

  const handleDeleteProduct = async (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?\n\nThis action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              const response = await adminAPI.deleteProduct(String(product.id));
              
              if (response.data) {
                Alert.alert('Success', (response.data as any).message || 'Product deleted successfully');
                fetchProducts(); // Refresh the product list
              } else {
                Alert.alert('Error', response.error || 'Failed to delete product');
              }
            } catch (error: any) {
              console.error('Failed to delete product:', error);
              const errorMessage = error?.response?.data?.error || error?.message || 'Failed to delete product. Please try again.';
              Alert.alert('Error', errorMessage);
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const handleEnhanceProduct = async (productId: string) => {
    try {
      setIsSubmitting(true);
      console.log('🔄 Enhancing product:', productId);
      
      const response = await adminAPI.enhanceProduct(productId);
      console.log('📡 Enhancement response:', JSON.stringify(response.data, null, 2));
      
      if (response.data && (response.data as any).success) {
        const data = response.data as any;
        console.log('📊 Enhancement data structure:', {
          hasEnhancementData: !!data.enhancement_data,
          totalEnhancements: data.enhancement_data?.total_enhancements,
          fieldsCount: data.enhancement_data?.fields?.length,
          searchMethod: data.search_method,
          matchScore: data.match_score
        });
        
        console.log('🎯 About to set enhancement data and show modal');
        console.log('🔍 Current modal state:', enhancementModalVisible);
        console.log('🔍 Enhancement data keys:', Object.keys(data));
        console.log('🔍 Enhancement fields count:', data.enhancement_data?.fields?.length);
        
        // Pre-select recommended enhancements
        const recommendedFields = new Set<string>();
        if (data.enhancement_data?.fields) {
          data.enhancement_data.fields.forEach((field: any) => {
            if (field.recommended) {
              recommendedFields.add(field.key);
            }
          });
        }
        
        // CLOSE EDIT MODAL FIRST to avoid nested modal issues
        console.log('🔄 Closing edit modal to show enhancement modal...');
        setAddModalVisible(false);
        
        // Set enhancement data
        console.log('🔄 Setting enhancement data...');
        setEnhancementData(data);
        setSelectedEnhancements(recommendedFields);
        
        // Show enhancement modal after edit modal is closed
        setTimeout(() => {
          console.log('🔄 Now showing enhancement modal...');
          setEnhancementModalVisible(true);
        }, 300); // Longer delay to ensure edit modal is fully closed
      } else {
        const errorMessage = (response.data as any)?.error || 'Failed to fetch enhancement data';
        console.log('❌ Enhancement failed:', errorMessage);
        Alert.alert('Enhancement Error', errorMessage);
      }
    } catch (error: any) {
      console.error('💥 Enhancement error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to enhance product. Please try again.';
      Alert.alert('Enhancement Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
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
                          
                          {/* Enhanced indicators */}
                          <View style={styles.productIndicators}>
                            {/* Health scores - mock data for now, will be real when backend provides it */}
                            {product.name.toLowerCase().includes('nutella') && (
                              <>
                                <View style={[styles.miniNutriScore, { backgroundColor: getNutriScoreColor('e') }]}>
                                  <Text style={styles.miniScoreText}>E</Text>
                                </View>
                                <View style={styles.allergenIndicator}>
                                  <Ionicons name="warning" size={12} color="#DC2626" />
                                </View>
                              </>
                            )}
                            {/* Food product indicator */}
                            {(product.name.toLowerCase().includes('nutella') || 
                              product.name.toLowerCase().includes('bread') ||
                              product.name.toLowerCase().includes('milk') ||
                              product.category.toLowerCase().includes('dairy') ||
                              product.category.toLowerCase().includes('bakery')) && (
                              <View style={styles.foodIndicator}>
                                <Ionicons name="nutrition" size={12} color="#0F766E" />
                              </View>
                            )}
                          </View>
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
                        // Fetch full product data to get enhanced fields
                        (async () => {
                          try {
                            const resp = await adminAPI.getProduct(String(product.id));
                            const p: any = (resp.data as any)?.product || {};
                            
                            console.log('📝 Admin product data received:', JSON.stringify(p, null, 2));
                            
                            // Set basic product data
                            setNewProduct((prev) => ({
                              ...prev,
                              name: product.name,
                              category: product.category,
                              price: String(product.price),
                              description: p?.description || '',
                              stockQuantity: String(product.stock || ''),
                              unit: product.unit,
                              trackInventory: product.trackInventory,
                              gtin: p?.gtin || '',
                              
                              // Enhanced Open Food Facts data from backend
                              brand: p?.brand || '',
                              servingSize: p?.serving_size || '',
                              ingredients: p?.ingredients_text || '',
                              allergens: cleanAllergenString(p?.allergens || ''),
                              traces: p?.traces || '',
                              offCategories: p?.off_categories || '',
                              offLabels: p?.off_labels || '',
                              nutriscoreGrade: p?.nutriscore_grade || '',
                              novaGroup: p?.nova_group || null,
                              packaging: p?.packaging || '',
                              
                              // Enhanced images
                              imageIngredientsUrl: p?.image_ingredients_url || '',
                              imageNutritionUrl: p?.image_nutrition_url || '',
                              
                              // Computed indicators
                              isFoodProduct: p?.is_food_product || false,
                              hasAllergenInfo: p?.has_allergen_info || false,
                              hasHealthScores: p?.has_health_scores || false,
                            }));
                            
                            // Handle images
                            const images = p?.images || {};
                            setSelectedProductImgixUrl(images.large || images.medium || images.original || null);
                            setSelectedProductImageUrl(p?.imageUrl || images.original || null);
                            
                            console.log('📝 Loaded enhanced product data for edit:', {
                              name: p?.name,
                              brand: p?.brand,
                              allergens: p?.allergens,
                              nutriscore: p?.nutriscore_grade,
                              hasEnhanced: !!(p?.brand || p?.allergens || p?.nutriscore_grade)
                            });
                          } catch (error) {
                            console.error('Failed to load enhanced product data:', error);
                            // Fallback to basic data
                            setNewProduct((prev) => ({
                              ...prev,
                              name: product.name,
                              category: product.category,
                              price: String(product.price),
                              description: '',
                              stockQuantity: String(product.stock || ''),
                              unit: product.unit,
                              trackInventory: product.trackInventory,
                            }));
                          }
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
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.deleteButton]} 
                      onPress={() => handleDeleteProduct(product)}
                    >
                      <Ionicons 
                        name="trash-outline" 
                        size={14} 
                        color="#DC2626" 
                      />
                      <Text style={[styles.actionText, { color: '#DC2626' }]}>Delete</Text>
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
                <View style={styles.modalHeaderActions}>
                  {editingProductId && (
                    <TouchableOpacity 
                      onPress={() => handleEnhanceProduct(editingProductId)} 
                      style={[styles.enhanceButton, isSubmitting && styles.enhanceButtonDisabled]}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <ActivityIndicator size="small" color="#0F766E" />
                          <Text style={styles.enhanceButtonText}>Searching...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="refresh-circle-outline" size={20} color="#0F766E" />
                          <Text style={styles.enhanceButtonText}>Enhance</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  {!editingProductId && (
                    <TouchableOpacity 
                      style={styles.scanButton}
                      onPress={handleScanBarcode}
                    >
                      <Ionicons name="scan" size={20} color="#FFFFFF" />
                      <Text style={styles.scanButtonText}>Scan</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={closeAddModal} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
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
                  <Text style={styles.fieldLabel}>Category <Text style={styles.requiredAsterisk}>*</Text></Text>
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
                    <Text style={styles.fieldLabel}>Price ($) <Text style={styles.requiredAsterisk}>*</Text></Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="0.00"
                      value={newProduct.price}
                      onChangeText={(text) => setNewProduct(prev => ({ ...prev, price: text }))}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.fieldLabel}>Unit <Text style={styles.requiredAsterisk}>*</Text></Text>
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

                {/* Enhanced Product Data Fields */}
                <View style={styles.enhancedFieldsContainer}>
                  <View style={styles.enhancedFieldsHeader}>
                    <Ionicons name="nutrition-outline" size={20} color="#0F766E" />
                    <Text style={styles.enhancedFieldsTitle}>Enhanced Product Information</Text>
                    <Text style={styles.enhancedFieldsSubtitle}>Auto-filled from Open Food Facts when available • All fields optional</Text>
                  </View>

                  {/* Brand and Serving Size Row */}
                  <View style={styles.twoColumnRow}>
                    <View style={[styles.fieldContainer, styles.halfWidth]}>
                      <Text style={styles.fieldLabel}>Brand</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Ferrero"
                        placeholderTextColor="#9CA3AF"
                        value={newProduct.brand || ''}
                        onChangeText={(text) => setNewProduct(prev => ({ ...prev, brand: text }))}
                      />
                    </View>
                    <View style={[styles.fieldContainer, styles.halfWidth]}>
                      <Text style={styles.fieldLabel}>Serving Size</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. 1 serving (37 g)"
                        placeholderTextColor="#9CA3AF"
                        value={newProduct.servingSize || ''}
                        onChangeText={(text) => setNewProduct(prev => ({ ...prev, servingSize: text }))}
                      />
                    </View>
                  </View>

                  {/* Health Scores Row */}
                  <View style={styles.twoColumnRow}>
                    <View style={[styles.fieldContainer, styles.halfWidth]}>
                      <Text style={styles.fieldLabel}>Nutri-Score</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="A, B, C, D, or E"
                        placeholderTextColor="#9CA3AF"
                        value={newProduct.nutriscoreGrade || ''}
                        onChangeText={(text) => setNewProduct(prev => ({ ...prev, nutriscoreGrade: text.toLowerCase() }))}
                        maxLength={1}
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={[styles.fieldContainer, styles.halfWidth]}>
                      <Text style={styles.fieldLabel}>NOVA Group</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="1, 2, 3, or 4"
                        placeholderTextColor="#9CA3AF"
                        value={newProduct.novaGroup ? String(newProduct.novaGroup) : ''}
                        onChangeText={(text) => {
                          const num = parseInt(text);
                          setNewProduct(prev => ({ ...prev, novaGroup: isNaN(num) ? null : num }));
                        }}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                  </View>

                  {/* Allergens */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Allergens</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. milk, nuts, soybeans (comma-separated)"
                      placeholderTextColor="#9CA3AF"
                      value={newProduct.allergens || ''}
                      onChangeText={(text) => setNewProduct(prev => ({ ...prev, allergens: text }))}
                      multiline
                    />
                  </View>

                  {/* Ingredients */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Ingredients</Text>
                    <TextInput
                      style={[styles.textInput, styles.multilineInput]}
                      placeholder="Full ingredients list..."
                      placeholderTextColor="#9CA3AF"
                      value={newProduct.ingredients || ''}
                      onChangeText={(text) => setNewProduct(prev => ({ ...prev, ingredients: text }))}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  {/* Additional Info Row */}
                  <View style={styles.twoColumnRow}>
                    <View style={[styles.fieldContainer, styles.halfWidth]}>
                      <Text style={styles.fieldLabel}>Packaging</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Plastic, Pet-tub"
                        placeholderTextColor="#9CA3AF"
                        value={newProduct.packaging || ''}
                        onChangeText={(text) => setNewProduct(prev => ({ ...prev, packaging: text }))}
                      />
                    </View>
                    <View style={[styles.fieldContainer, styles.halfWidth]}>
                      <Text style={styles.fieldLabel}>Traces</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="May contain..."
                        placeholderTextColor="#9CA3AF"
                        value={newProduct.traces || ''}
                        onChangeText={(text) => setNewProduct(prev => ({ ...prev, traces: text }))}
                      />
                    </View>
                  </View>
                </View>

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

        {/* Enhancement Modal */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={enhancementModalVisible}
          onRequestClose={() => {
            console.log('🎨 Enhancement modal closing');
            setEnhancementModalVisible(false);
            // Reopen edit modal when enhancement modal closes
            setTimeout(() => setAddModalVisible(true), 300);
          }}
        >
          <SafeAreaView style={styles.sheetContainer}>
            {console.log('🎨 Enhancement modal SafeAreaView rendering')}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <TouchableOpacity 
                  onPress={() => {
                    setEnhancementModalVisible(false);
                    // Reopen edit modal when enhancement modal closes
                    setTimeout(() => setAddModalVisible(true), 300);
                  }} 
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={24} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Enhance Product</Text>
              </View>
            </View>
            
            {enhancementData && (() => {
              try {
                console.log('🎨 Rendering enhancement content for:', enhancementData.product_name);
                return (
              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                {/* Enhancement Summary */}
                <View style={styles.enhancementSummary}>
                  <View style={styles.enhancementHeader}>
                    <View style={styles.productIcon}>
                      <Ionicons name="nutrition-outline" size={24} color="#0F766E" />
                    </View>
                    <View style={styles.enhancementHeaderText}>
                      <Text style={styles.enhancementTitle}>
                        {enhancementData.product_name}
                      </Text>
                      <Text style={styles.enhancementSubtitle}>
                        {enhancementData.enhancement_data.total_enhancements} enhancements found from Open Food Facts
                      </Text>
                    </View>
                  </View>
                  
                  {/* Search Method and Match Score */}
                  <View style={styles.searchInfo}>
                    <View style={styles.searchMethodContainer}>
                      <Ionicons 
                        name={enhancementData.search_method === 'gtin' ? 'barcode-outline' : 'search-outline'} 
                        size={14} 
                        color="#0369A1" 
                      />
                      <Text style={styles.searchMethod}>
                        {enhancementData.search_method === 'gtin' ? 'Found via barcode' : 'Found via name search'}
                      </Text>
                    </View>
                    {enhancementData.match_score && typeof enhancementData.match_score === 'number' && (
                      <View style={styles.matchScoreContainer}>
                        <View style={[
                          styles.matchScoreBadge,
                          { backgroundColor: enhancementData.match_score >= 0.7 ? '#10B981' : enhancementData.match_score >= 0.4 ? '#F59E0B' : '#EF4444' }
                        ]}>
                          <Text style={styles.matchScore}>
                            {Math.round(enhancementData.match_score * 100)}% match
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                  
                  {enhancementData.enhancement_data.critical_updates > 0 && (
                    <View style={styles.criticalAlert}>
                      <Ionicons name="warning" size={16} color="#DC2626" />
                      <Text style={styles.criticalAlertText}>
                        {enhancementData.enhancement_data.critical_updates} critical safety updates available
                      </Text>
                    </View>
                  )}
                </View>

                {/* Enhancement Fields */}
                {enhancementData.enhancement_data?.fields?.length > 0 ? (
                  enhancementData.enhancement_data.fields.map((field: any, index: number) => (
                  <View key={field.key} style={styles.enhancementField}>
                    <View style={styles.enhancementFieldHeader}>
                      <View style={styles.enhancementFieldTitle}>
                        <TouchableOpacity
                          style={[
                            styles.enhancementCheckbox,
                            selectedEnhancements.has(field.key) && styles.enhancementCheckboxSelected
                          ]}
                          onPress={() => {
                            const newSelected = new Set(selectedEnhancements);
                            if (newSelected.has(field.key)) {
                              newSelected.delete(field.key);
                            } else {
                              newSelected.add(field.key);
                            }
                            setSelectedEnhancements(newSelected);
                          }}
                        >
                          {selectedEnhancements.has(field.key) && (
                            <Ionicons name="checkmark" size={16} color="white" />
                          )}
                        </TouchableOpacity>
                        <Text style={styles.enhancementFieldLabel}>
                          {field.label}
                        </Text>
                        {field.priority === 'critical' && (
                          <View style={styles.criticalBadge}>
                            <Text style={styles.criticalBadgeText}>CRITICAL</Text>
                          </View>
                        )}
                        {field.recommended && field.priority !== 'critical' && (
                          <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.enhancementComparison}>
                      <View style={styles.comparisonSection}>
                        <Text style={styles.comparisonLabel}>Current:</Text>
                        <Text style={styles.comparisonValue}>
                          {field.current_value || '(empty)'}
                        </Text>
                      </View>
                      <Ionicons name="arrow-forward" size={16} color="#6B7280" />
                      <View style={styles.comparisonSection}>
                        <Text style={styles.comparisonLabel}>Enhanced:</Text>
                        <Text style={[styles.comparisonValue, styles.enhancedValue]}>
                          {field.enhanced_value}
                        </Text>
                      </View>
                    </View>
                  </View>
                  ))
                ) : (
                  <View style={styles.noEnhancementsContainer}>
                    <Ionicons name="checkmark-circle-outline" size={48} color="#6B7280" />
                    <Text style={styles.noEnhancementsTitle}>No Enhancements Available</Text>
                    <Text style={styles.noEnhancementsText}>
                      This product already has all the available information from Open Food Facts, or no matching product was found.
                    </Text>
                  </View>
                )}
              </ScrollView>
                );
              } catch (error) {
                console.error('💥 Error rendering enhancement modal:', error);
                return (
                  <View style={styles.modalForm}>
                    <Text style={styles.enhancementErrorText}>Error loading enhancement data</Text>
                  </View>
                );
              }
            })()}

            {/* Enhancement Actions */}
            <View style={styles.enhancementModalActions}>
              <TouchableOpacity 
                style={styles.enhancementBackButton} 
                onPress={() => {
                  setEnhancementModalVisible(false);
                  // Reopen edit modal when enhancement modal closes
                  setTimeout(() => setAddModalVisible(true), 300);
                }}
              >
                <View style={styles.enhancementBackButtonContent}>
                  <Ionicons name="arrow-back" size={20} color="#6B7280" />
                  <Text style={styles.enhancementBackButtonText}>Back to Edit</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.enhancementApplyButtonNew, 
                  selectedEnhancements.size === 0 && styles.enhancementApplyButtonDisabled
                ]} 
                onPress={async () => {
                  try {
                    console.log('Applying enhancements:', Array.from(selectedEnhancements));
                    setIsSubmitting(true);
                    
                    const response = await adminAPI.applyEnhancements(
                      enhancementData.product_id?.toString() || '',
                      enhancementData.enhancement_data,
                      Array.from(selectedEnhancements)
                    );
                    
                    if ((response.data as any).success) {
                      // Update the product in our local state
                      const updatedProduct = (response.data as any).product;
                      setProducts(prevProducts => 
                        prevProducts.map(p => 
                          p.id === updatedProduct.id ? updatedProduct : p
                        )
                      );
                      
                      // Set the updated product as the editing product for the edit modal
                      setNewProduct({
                        name: updatedProduct.name || '',
                        category: updatedProduct.category?.name || '',
                        price: updatedProduct.price?.toString() || '',
                        description: updatedProduct.description || '', // Keep original description, don't enhance with ingredients
                        stockQuantity: updatedProduct.stock_quantity?.toString() || '',
                        unit: updatedProduct.unit?.name || 'Each',
                        trackInventory: updatedProduct.track_inventory || false,
                        gtin: updatedProduct.gtin || '',
                        // Weight-based fields
                        weightBased: updatedProduct.weight_based || false,
                        pricePerUnit: updatedProduct.price_per_unit?.toString() || '',
                        weightUnit: updatedProduct.weight_unit || 'lb',
                        minWeight: updatedProduct.min_weight?.toString() || '',
                        maxWeight: updatedProduct.max_weight?.toString() || '',
                        // Enhanced fields (using camelCase field names)
                        brand: updatedProduct.brand || '',
                        servingSize: updatedProduct.serving_size || '',
                        ingredients: updatedProduct.ingredients_text || '',
                        allergens: updatedProduct.allergens || '',
                        traces: updatedProduct.traces || '',
                        offCategories: updatedProduct.off_categories || '',
                        offLabels: updatedProduct.off_labels || '',
                        nutriscoreGrade: updatedProduct.nutriscore_grade || '',
                        novaGroup: updatedProduct.nova_group || null,
                        packaging: updatedProduct.packaging || '',
                        imageIngredientsUrl: updatedProduct.image_ingredients_url || '',
                        imageNutritionUrl: updatedProduct.image_nutrition_url || '',
                      });
                      
                      // Set edit mode
                      setEditingProductId(updatedProduct.id);
                      
                      Alert.alert(
                        'Enhancements Applied!', 
                        (response.data as any).message,
                        [{ text: 'OK' }]
                      );
                      
                      setEnhancementModalVisible(false);
                      // Reopen edit modal with updated data
                      setTimeout(() => setAddModalVisible(true), 300);
                    } else {
                      Alert.alert('Error', (response.data as any).error || 'Failed to apply enhancements');
                    }
                  } catch (error: any) {
                    console.error('💥 Apply enhancements error:', error);
                    Alert.alert('Error', 'Failed to apply enhancements. Please try again.');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={selectedEnhancements.size === 0 || isSubmitting}
              >
                <View style={styles.enhancementApplyButtonContent}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                  )}
                  <Text style={[
                    styles.enhancementApplyButtonTextNew,
                    selectedEnhancements.size === 0 && styles.enhancementApplyButtonTextDisabled
                  ]}>
                    {isSubmitting ? 'Applying...' : 
                     selectedEnhancements.size === 0 ? 'Select Enhancements' :
                     `Apply ${selectedEnhancements.size} Enhancement${selectedEnhancements.size !== 1 ? 's' : ''}`
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Barcode Scanner Modal */}
        <BarcodeScanner
          visible={scannerVisible}
          onClose={() => {
            setScannerVisible(false);
            // Reopen add product modal after scanner closes (unless we're editing)
            if (!scanningForEdit) {
              setTimeout(() => {
                console.log('🔄 Reopening add product modal after scanner close...');
                setAddModalVisible(true);
              }, 300);
            }
          }}
          onBarcodeScanned={handleBarcodeScanned}
        />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
    borderRadius: 8,
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
  
  // Enhanced Open Food Facts styles
  enhancedDataContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  enhancedDataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  enhancedDataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F766E',
    marginLeft: 8,
  },
  healthScoresRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  healthBadge: {
    alignItems: 'center',
  },
  healthBadgeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  nutriScoreBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nutriScoreText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  novaBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  novaText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  allergenSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  allergenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allergenText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
  },
  additionalInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  additionalInfoText: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  
  // Product list indicators
  productIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  miniNutriScore: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniScoreText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  allergenIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  foodIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  
  // Enhanced Fields Styles
  enhancedFieldsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  enhancedFieldsHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  enhancedFieldsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F766E',
    marginTop: 4,
    marginBottom: 4,
  },
  enhancedFieldsSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  twoColumnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  requiredAsterisk: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  
  // Enhancement Modal Styles
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  enhanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 4,
  },
  enhanceButtonText: {
    color: '#0F766E',
    fontSize: 14,
    fontWeight: '600',
  },
  enhanceButtonDisabled: {
    opacity: 0.6,
  },
  enhancementSummary: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  enhancementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  enhancementHeaderText: {
    flex: 1,
  },
  enhancementTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  enhancementSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  searchInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  searchMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchMethod: {
    fontSize: 13,
    color: '#0369A1',
    fontWeight: '500',
  },
  matchScoreContainer: {
    alignItems: 'flex-end',
  },
  matchScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchScore: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  criticalAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  criticalAlertText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  enhancementField: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  enhancementFieldHeader: {
    marginBottom: 12,
  },
  enhancementFieldTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enhancementCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancementCheckboxSelected: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  enhancementFieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  criticalBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  criticalBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  recommendedBadge: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  enhancementComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  comparisonSection: {
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  enhancedValue: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    color: '#166534',
  },
  enhancementSubmitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  enhancementCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  enhancementCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  enhancementApplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    flex: 2,
  },
  enhancementApplyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  enhancementSubmitButtonTextDisabled: {
    color: '#9CA3AF',
  },
  // New enhanced button styles
  enhancementModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  enhancementBackButton: {
    flex: 1.3,
    minHeight: 48,
    justifyContent: 'center',
  },
  enhancementBackButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    minHeight: 48,
  },
  enhancementBackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    flexShrink: 0,
  },
  enhancementApplyButtonNew: {
    flex: 2,
    minHeight: 48,
    justifyContent: 'center',
  },
  enhancementApplyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
    minHeight: 48,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  enhancementApplyButtonTextNew: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    flexShrink: 1,
  },
  enhancementApplyButtonDisabled: {
    opacity: 0.5,
  },
  enhancementApplyButtonTextDisabled: {
    color: '#9CA3AF',
  },
  noEnhancementsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginVertical: 20,
  },
  noEnhancementsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  noEnhancementsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  enhancementErrorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    padding: 20,
  },
}); 