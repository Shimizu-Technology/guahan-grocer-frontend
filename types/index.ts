export interface User {
  id: string;
  email: string;
  role: 'customer' | 'driver' | 'admin';
  name: string;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  imageUrl?: string;
  description?: string;
  inStock: boolean;
  available?: boolean;
  trackInventory?: boolean;
  stockStatus?: string;
}

export interface CartItem {
  id: string;
  item: Item;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  driverId?: string;
  status: 'new' | 'shopping' | 'delivering' | 'delivered' | 'cancelled';
  items: OrderItem[];
  total: number;
  createdAt: Date;
  deliveryAddress: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    apartmentUnit?: string;
  };
  eta?: number; // seconds
}

export interface OrderItem {
  id: string;
  itemId: string;
  item: Item;
  quantity: number;
  price: number;
}

export interface ShoppingItem extends OrderItem {
  status: 'pending' | 'found' | 'unavailable' | 'substituted';
  notes?: string;
  substituteItem?: string;
}

export interface SMSMessage {
  id: string;
  phone: string;
  message: string;
  status: 'sent' | 'delivered' | 'failed';
  sentAt: Date;
} 