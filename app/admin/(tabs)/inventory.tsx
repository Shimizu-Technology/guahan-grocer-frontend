import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminInventory() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { key: 'all', label: 'All Items', count: 42 },
    { key: 'fruits', label: 'Fruits', count: 12 },
    { key: 'vegetables', label: 'Vegetables', count: 15 },
    { key: 'dairy', label: 'Dairy', count: 8 },
    { key: 'bakery', label: 'Bakery', count: 7 },
  ];

  const products = [
    {
      id: 1,
      name: 'Fresh Bananas',
      category: 'fruits',
      price: '$2.99',
      stock: 45,
      lowStock: false,
      unit: 'per lb',
      status: 'active',
    },
    {
      id: 2,
      name: 'Organic Spinach',
      category: 'vegetables',
      price: '$3.49',
      stock: 8,
      lowStock: true,
      unit: 'per bunch',
      status: 'active',
    },
    {
      id: 3,
      name: 'Whole Milk',
      category: 'dairy',
      price: '$4.29',
      stock: 0,
      lowStock: true,
      unit: 'per gallon',
      status: 'out_of_stock',
    },
    {
      id: 4,
      name: 'Sourdough Bread',
      category: 'bakery',
      price: '$5.99',
      stock: 12,
      lowStock: false,
      unit: 'per loaf',
      status: 'active',
    },
    {
      id: 5,
      name: 'Red Apples',
      category: 'fruits',
      price: '$3.49',
      stock: 32,
      lowStock: false,
      unit: 'per lb',
      status: 'active',
    },
  ];

  const getStockStatus = (stock: number, lowStock: boolean) => {
    if (stock === 0) return { text: 'Out of Stock', color: '#DC2626' };
    if (lowStock) return { text: 'Low Stock', color: '#EA580C' };
    return { text: 'In Stock', color: '#16A34A' };
  };

  const handleAddProduct = () => {
    Alert.alert('Add Product', 'Product creation form would open here.');
  };

  const handleEditProduct = (productName: string) => {
    Alert.alert('Edit Product', `Edit ${productName} form would open here.`);
  };

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Inventory</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Category Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
          contentContainerStyle={styles.categoryContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryTab,
                selectedCategory === category.key && styles.activeCategoryTab
              ]}
              onPress={() => setSelectedCategory(category.key)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category.key && styles.activeCategoryText
              ]}>
                {category.label} ({category.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products List */}
        <ScrollView 
          style={styles.productsList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 12 }}
        >
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product.stock, product.lowStock);
            
            return (
              <TouchableOpacity 
                key={product.id} 
                style={styles.productCard}
                onPress={() => handleEditProduct(product.name)}
              >
                {/* Product Header */}
                <View style={styles.productHeader}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productUnit}>{product.unit}</Text>
                  </View>
                  <View style={[styles.stockBadge, { backgroundColor: `${stockStatus.color}15` }]}>
                    <Text style={[styles.stockText, { color: stockStatus.color }]}>
                      {stockStatus.text}
                    </Text>
                  </View>
                </View>

                {/* Product Details */}
                <View style={styles.productDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
                      <Text style={styles.priceText}>{product.price}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="cube-outline" size={16} color="#6B7280" />
                      <Text style={[
                        styles.stockNumber,
                        product.stock === 0 && styles.outOfStockNumber
                      ]}>
                        {product.stock} units
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleEditProduct(product.name)}
                  >
                    <Ionicons name="create-outline" size={16} color="#0F766E" />
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.actionButton, styles.restockButton]}>
                    <Ionicons name="add-circle-outline" size={16} color="#7C3AED" />
                    <Text style={[styles.actionButtonText, { color: '#7C3AED' }]}>Restock</Text>
                  </TouchableOpacity>
                  
                  {product.stock === 0 && (
                    <TouchableOpacity style={[styles.actionButton, styles.activateButton]}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
                      <Text style={[styles.actionButtonText, { color: '#16A34A' }]}>Activate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
          
          <View style={styles.bottomSpacing} />
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryContent: {
    paddingHorizontal: 20,
    paddingVertical: 8, // Minimal padding for clean look
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6, // Reduced padding for cleaner look
    marginRight: 10,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    height: 32, // Fixed height for consistency
    justifyContent: 'center',
  },
  activeCategoryTab: {
    backgroundColor: '#0F766E',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  activeCategoryText: {
    color: 'white',
  },
  productsList: {
    // Removed flex: 1 - let ScrollView size naturally
  },
  productCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  productUnit: {
    fontSize: 12,
    color: '#6B7280',
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  productDetails: {
    marginBottom: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F766E',
    marginLeft: 6,
  },
  stockNumber: {
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 6,
  },
  outOfStockNumber: {
    color: '#DC2626',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0F766E',
  },
  restockButton: {
    borderColor: '#7C3AED',
  },
  activateButton: {
    borderColor: '#16A34A',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
    marginLeft: 4,
  },
  bottomSpacing: {
    height: 100,
  },
}); 