export interface User {
  id: string;
  email: string;
  role: 'customer' | 'driver' | 'admin';
  name: string;
  phone?: string;
  isOnline?: boolean;
  createdAt?: string;
}

export interface Address {
  id: string;
  label?: string;
  displayLabel: string;
  streetAddress: string;
  apartmentUnit?: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
  fullAddress: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
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

export interface Vehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  vehicleType: VehicleType;
  verificationStatus: VerificationStatus;
  displayName: string;
  fullDescription: string;
  needsVerification: boolean;
  canBeUsedForDelivery: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type VehicleType = 
  | 'sedan' 
  | 'suv' 
  | 'truck' 
  | 'hatchback' 
  | 'coupe' 
  | 'convertible' 
  | 'van' 
  | 'minivan' 
  | 'pickup' 
  | 'other';

export type VerificationStatus = 
  | 'pending' 
  | 'verified' 
  | 'rejected' 
  | 'under_review';

export interface VehicleFormData {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  vehicleType: VehicleType;
} 