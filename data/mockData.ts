import { User, Item, Order } from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    email: 'customer@example.com',
    role: 'customer',
    name: 'John Customer'
  },
  {
    id: '2',
    email: 'driver@example.com',
    role: 'driver',
    name: 'Jane Driver'
  },
  {
    id: '3',
    email: 'admin@example.com',
    role: 'admin',
    name: 'Admin User'
  }
];

export const mockItems: Item[] = [
  {
    id: '1',
    name: 'Fresh Bananas',
    category: 'Fruits',
    price: 2.99,
    unit: 'lb',
    description: 'Sweet and ripe bananas',
    inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300'
  },
  {
    id: '2',
    name: 'Organic Spinach',
    category: 'Vegetables',
    price: 3.49,
    unit: 'bunch',
    description: 'Fresh organic spinach leaves',
    inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=300'
  },
  {
    id: '3',
    name: 'Whole Milk',
    category: 'Dairy',
    price: 4.29,
    unit: 'gallon',
    description: 'Fresh whole milk',
    inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300'
  },
  {
    id: '4',
    name: 'Sourdough Bread',
    category: 'Bakery',
    price: 5.99,
    unit: 'loaf',
    description: 'Artisan sourdough bread',
    inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300'
  },
  {
    id: '5',
    name: 'Ground Beef',
    category: 'Meat',
    price: 8.99,
    unit: 'lb',
    description: '85% lean ground beef',
    inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=300'
  },
  {
    id: '6',
    name: 'Orange Juice',
    category: 'Beverages',
    price: 3.99,
    unit: 'bottle',
    description: 'Fresh squeezed orange juice',
    inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300'
  },
  {
    id: '7',
    name: 'Red Apples',
    category: 'Fruits',
    price: 4.99,
    unit: 'bag',
    description: 'Crisp red apples',
    inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300'
  },
  {
    id: '8',
    name: 'Carrots',
    category: 'Vegetables',
    price: 2.49,
    unit: 'lb',
    description: 'Fresh carrots',
    inStock: true,
    imageUrl: 'https://images.unsplash.com/photo-1445282768818-728615cc910a?w=300'
  }
];

export const mockOrders: Order[] = [
  {
    id: 'order-1',
    userId: '1',
    driverId: '2',
    status: 'delivering',
    items: [
      {
        id: 'oi-1',
        itemId: '1',
        item: mockItems[0],
        quantity: 2,
        price: 2.99
      },
      {
        id: 'oi-2',
        itemId: '3',
        item: mockItems[2],
        quantity: 1,
        price: 4.29
      }
    ],
    total: 10.27,
    createdAt: new Date(Date.now() - 3600000), // 1 hour ago
    deliveryAddress: {
      streetAddress: '123 Main St',
      city: 'Tamuning',
      state: 'GU',
      zipCode: '96913'
    },
    eta: 900 // 15 minutes
  }
]; 