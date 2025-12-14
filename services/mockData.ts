// Mock data service for maintenance mode demo
import { Item } from '../types';

export const mockProducts: Item[] = [
  {
    id: '1',
    name: 'Organic Bananas',
    category: 'Fruits',
    price: 2.99,
    unit: 'lb',
    description: 'Fresh organic bananas from local farms',
    inStock: true,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400',
  },
  {
    id: '2',
    name: 'Whole Milk',
    category: 'Dairy',
    price: 4.49,
    unit: 'gal',
    description: 'Fresh whole milk, locally sourced',
    inStock: true,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
  },
  {
    id: '3',
    name: 'Sourdough Bread',
    category: 'Bakery',
    price: 5.99,
    unit: 'loaf',
    description: 'Freshly baked artisan sourdough',
    inStock: true,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400',
  },
  {
    id: '4',
    name: 'Roma Tomatoes',
    category: 'Vegetables',
    price: 3.49,
    unit: 'lb',
    description: 'Fresh Roma tomatoes, perfect for cooking',
    inStock: true,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400',
  },
  {
    id: '5',
    name: 'Chicken Breast',
    category: 'Meat',
    price: 8.99,
    unit: 'lb',
    description: 'Boneless, skinless chicken breast',
    inStock: true,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400',
  },
  {
    id: '6',
    name: 'Orange Juice',
    category: 'Beverages',
    price: 6.99,
    unit: 'half gal',
    description: 'Fresh squeezed orange juice',
    inStock: true,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400',
  },
  {
    id: '7',
    name: 'Avocados',
    category: 'Fruits',
    price: 1.99,
    unit: 'each',
    description: 'Ripe Hass avocados',
    inStock: true,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400',
  },
  {
    id: '8',
    name: 'Greek Yogurt',
    category: 'Dairy',
    price: 5.49,
    unit: '32 oz',
    description: 'Plain Greek yogurt, high protein',
    inStock: true,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
  },
  {
    id: '9',
    name: 'Baby Spinach',
    category: 'Vegetables',
    price: 4.99,
    unit: '16 oz',
    description: 'Fresh organic baby spinach',
    inStock: true,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400',
  },
  {
    id: '10',
    name: 'Ground Beef',
    category: 'Meat',
    price: 7.99,
    unit: 'lb',
    description: '85/15 lean ground beef',
    inStock: true,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=400',
  },
  {
    id: '11',
    name: 'Strawberries',
    category: 'Fruits',
    price: 5.99,
    unit: '16 oz',
    description: 'Sweet, fresh strawberries',
    inStock: true,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400',
  },
  {
    id: '12',
    name: 'Cheddar Cheese',
    category: 'Dairy',
    price: 6.99,
    unit: '8 oz',
    description: 'Sharp cheddar cheese block',
    inStock: true,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400',
  },
  {
    id: '13',
    name: 'Bagels',
    category: 'Bakery',
    price: 4.99,
    unit: '6 pack',
    description: 'Plain bagels, freshly baked',
    inStock: true,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400',
  },
  {
    id: '14',
    name: 'Bell Peppers',
    category: 'Vegetables',
    price: 1.49,
    unit: 'each',
    description: 'Fresh bell peppers, assorted colors',
    inStock: true,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400',
  },
  {
    id: '15',
    name: 'Salmon Fillet',
    category: 'Meat',
    price: 12.99,
    unit: 'lb',
    description: 'Fresh Atlantic salmon fillet',
    inStock: true,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1485704686097-ed47f7263ca4?w=400',
  },
  {
    id: '16',
    name: 'Sparkling Water',
    category: 'Beverages',
    price: 4.99,
    unit: '12 pack',
    description: 'Naturally flavored sparkling water',
    inStock: true,
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400',
  },
];

export const mockCategories = [
  { name: 'Fruits', icon: '🍎', color: '#EF4444', items: 3 },
  { name: 'Vegetables', icon: '🥬', color: '#10B981', items: 3 },
  { name: 'Dairy', icon: '🥛', color: '#3B82F6', items: 3 },
  { name: 'Bakery', icon: '🍞', color: '#F59E0B', items: 2 },
  { name: 'Meat', icon: '🥩', color: '#DC2626', items: 3 },
  { name: 'Beverages', icon: '🥤', color: '#8B5CF6', items: 2 },
];

export const mockFeaturedProducts: Item[] = [
  mockProducts[0], // Bananas
  mockProducts[3], // Tomatoes
  mockProducts[6], // Avocados
  mockProducts[10], // Strawberries
];

// Helper function to get products by category
export const getProductsByCategory = (category: string): Item[] => {
  if (category === 'All') {
    return mockProducts;
  }
  return mockProducts.filter(product => product.category === category);
};

// Helper function to search products
export const searchProducts = (searchTerm: string): Item[] => {
  const term = searchTerm.toLowerCase();
  return mockProducts.filter(product =>
    product.name.toLowerCase().includes(term) ||
    product.description.toLowerCase().includes(term) ||
    product.category.toLowerCase().includes(term)
  );
};

// Mock API response wrapper
export const createMockApiResponse = <T>(data: T, delay: number = 500): Promise<{ data: T }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data });
    }, delay);
  });
};
