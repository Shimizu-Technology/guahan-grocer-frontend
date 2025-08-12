// API service for connecting to Guahan Grocer backend
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, config } from '../config/environment';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  errors?: string[];
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = getApiUrl();
  }

  private async getHeaders(includeAuth: boolean = true): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.TOKEN);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();
      
      if (!response.ok) {
        return {
          error: data.error || `HTTP ${response.status}`,
          errors: data.errors || [data.error || `HTTP ${response.status}`]
        };
      }

      return { data };
    } catch (error) {
      console.error('API Response Error:', error);
      return {
        error: 'Network error or invalid JSON response',
        errors: ['Network error or invalid JSON response']
      };
    }
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit, 
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders(includeAuth);
      const url = `${this.baseURL}${endpoint}`;
      
      console.log(`API Request: ${options.method} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers },
      });
      
      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('API Request Error:', error);
      return {
        error: 'Network error',
        errors: ['Network connection failed. Please check your internet connection.']
      };
    }
  }

  async get<T>(endpoint: string, includeAuth: boolean = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET' }, includeAuth);
  }

  async post<T>(endpoint: string, data?: any, includeAuth: boolean = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      endpoint, 
      { 
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      }, 
      includeAuth
    );
  }

  async put<T>(endpoint: string, data?: any, includeAuth: boolean = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      endpoint, 
      { 
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      }, 
      includeAuth
    );
  }

  async delete<T>(endpoint: string, includeAuth: boolean = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' }, includeAuth);
  }

  // Form data upload method for multipart requests
  async postFormData<T>(endpoint: string, formData: FormData, includeAuth: boolean = true): Promise<ApiResponse<T>> {
    try {
      const token = includeAuth ? await AsyncStorage.getItem(config.STORAGE_KEYS.TOKEN) : null;
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Don't set Content-Type for FormData - let the browser set it with boundary
      const url = `${this.baseURL}${endpoint}`;
      
      console.log(`API Request: POST ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('API FormData Request Error:', error);
      return {
        error: 'Network error',
        errors: ['Network connection failed. Please check your internet connection.']
      };
    }
  }

  // PUT with multipart/form-data
  async putFormData<T>(endpoint: string, formData: FormData, includeAuth: boolean = true): Promise<ApiResponse<T>> {
    try {
      const token = includeAuth ? await AsyncStorage.getItem(config.STORAGE_KEYS.TOKEN) : null;
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const url = `${this.baseURL}${endpoint}`;
      console.log(`API Request: PUT ${url}`);
      const response = await fetch(url, { method: 'PUT', headers, body: formData });
      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('API FormData PUT Error:', error);
      return { error: 'Network error', errors: ['Network connection failed. Please check your internet connection.'] };
    }
  }

  // File upload method for image uploads
  async uploadFile<T>(endpoint: string, file: any, includeAuth: boolean = true): Promise<ApiResponse<T>> {
    try {
      const token = includeAuth ? await AsyncStorage.getItem(config.STORAGE_KEYS.TOKEN) : null;
      
      const formData = new FormData();
      formData.append('image', {
        uri: file.uri,
        type: file.mimeType || 'image/jpeg',
        name: file.fileName || 'image.jpg',
      } as any);

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = `${this.baseURL}${endpoint}`;
      console.log(`API Upload: POST ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('Upload Error:', error);
      return {
        error: 'Upload failed',
        errors: ['File upload failed. Please try again.']
      };
    }
  }

  // Test API connectivity
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL.replace('/api/v1', '')}/up`);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const apiService = new ApiService();

// Specific API endpoints
export const authAPI = {
  login: (email: string, password: string) => 
    apiService.post('/auth/login', { email: email.toLowerCase().trim(), password }, false),
  
  register: (email: string, password: string, name: string, phone: string) => 
    apiService.post('/auth/register', { user: { email: email.toLowerCase().trim(), password, password_confirmation: password, name, phone } }, false),
  
  getCurrentUser: () => 
    apiService.get('/auth/me'),
  
  logout: () => 
    apiService.delete('/auth/logout'),

  // Online status endpoints  
  toggleOnline: () =>
    apiService.put('/auth/toggle_online'),
};

export const productsAPI = {
  getAll: (category?: string) => {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    return apiService.get(`/products${params}`, false);
  },
  
  getAllAvailable: (category?: string) => {
    const categoryParam = category ? `category=${encodeURIComponent(category)}&` : '';
    return apiService.get(`/products?${categoryParam}available=true`, false);
  },
  
  getFeatured: () => 
    apiService.get('/products/featured', false),
  
  getById: (id: string) => 
    apiService.get(`/products/${id}`, false),
  
  create: (formData: FormData) => 
    apiService.postFormData('/products', formData),

  update: (id: string, formData: FormData) =>
    apiService.putFormData(`/products/${id}`, formData),
};

export const favoritesAPI = {
  getAll: () => 
    apiService.get('/favorites'),
  
  add: (productId: string) => 
    apiService.post('/favorites', { product_id: productId }),
  
  remove: (productId: string) => 
    apiService.delete(`/favorites/${productId}`),
};

export const ordersAPI = {
  getAll: () => 
    apiService.get('/orders'),
  
  getById: (id: string) => 
    apiService.get(`/orders/${id}`),
  
  getAvailable: () =>
    apiService.get('/orders/available'),
  
  getActive: () =>
    apiService.get('/orders/active'),
  
  create: (orderData: any) => 
    apiService.post('/orders', orderData),
  
  updateStatus: (id: string, status: string) => 
    apiService.put(`/orders/${id}/status`, { status }),
  
  assignDriver: (id: string, driverId: string) =>
    apiService.put(`/orders/${id}/assign_driver`, { driver_id: driverId }),
  
  acceptOrder: (id: string) =>
    apiService.put(`/orders/${id}/accept`),
  
  uploadReceipt: async (id: string, receiptUri: string) => {
    const formData = new FormData();
    formData.append('receipt', {
      uri: receiptUri,
      type: 'image/jpeg',
      name: 'receipt.jpg',
    } as any);
    return apiService.postFormData(`/orders/${id}/receipt`, formData);
  },
  
  calculateDeliveryFee: (deliveryAddress: any) =>
    apiService.post('/orders/calculate_delivery_fee', { delivery_address: deliveryAddress }),
};

export const orderItemsAPI = {
  updateFoundQuantity: (id: string, foundQuantity: number, notes?: string) =>
    apiService.put(`/order_items/${id}/found_quantity`, { found_quantity: foundQuantity, notes }),
  
  updateStatus: (id: string, status: string) =>
    apiService.put(`/order_items/${id}/status`, { status }),
  
  substitute: (id: string, substituteProductId: string, foundQuantity?: number, notes?: string) =>
    apiService.put(`/order_items/${id}/substitute`, { 
      substitute_product_id: substituteProductId, 
      found_quantity: foundQuantity,
      notes 
    }),
};

export const driverStatsAPI = {
  getStats: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiService.get(`/driver_stats${params.toString() ? '?' + params.toString() : ''}`);
  },
  
  getStatsForDate: (date: string) =>
    apiService.get(`/driver_stats/${date}`),
};

export const adminAPI = {
  getDashboard: () => 
    apiService.get('/admin/dashboard'),
};

export const categoriesAPI = {
  getAll: () => 
    apiService.get('/categories'),
  
  getById: (id: string) => 
    apiService.get(`/categories/${id}`),
  
  create: (categoryData: { name: string; description?: string }) => 
    apiService.post('/categories', { category: categoryData }),
  
  update: (id: string, categoryData: { name: string; description?: string; active?: boolean }) => 
    apiService.put(`/categories/${id}`, { category: categoryData }),
  
  delete: (id: string) => 
    apiService.delete(`/categories/${id}`),
};

export const unitsAPI = {
  getAll: () => 
    apiService.get('/units'),
  
  getById: (id: string) => 
    apiService.get(`/units/${id}`),
  
  create: (unitData: { name: string; symbol: string }) => 
    apiService.post('/units', { unit: unitData }),
  
  update: (id: string, unitData: { name: string; symbol: string; active?: boolean }) => 
    apiService.put(`/units/${id}`, { unit: unitData }),
  
  delete: (id: string) => 
    apiService.delete(`/units/${id}`),
};

export const usersAPI = {
  // List users (admin only). Optional filters like role/active supported by backend
  list: (params?: { role?: string; active?: boolean }) => {
    const search = new URLSearchParams();
    if (params?.role) search.append('role', params.role);
    if (params?.active !== undefined) search.append('active', String(params.active));
    const qs = search.toString();
    return apiService.get(`/users${qs ? `?${qs}` : ''}`);
  },

  // List available drivers (admin only)
  getAvailableDrivers: () => apiService.get('/drivers/available'),

  getById: (id: string) => 
    apiService.get(`/users/${id}`),
  
  create: (userData: any) => 
    apiService.post('/users', { user: userData }),
  
  update: (id: string, userData: any) => 
    apiService.put(`/users/${id}`, { user: userData }),
  
  delete: (id: string) => 
    apiService.delete(`/users/${id}`),
};

export const addressesAPI = {
  getAll: () => 
    apiService.get('/addresses'),
  
  getById: (id: string) => 
    apiService.get(`/addresses/${id}`),
  
  create: (addressData: any) => 
    apiService.post('/addresses', { address: addressData }),
  
  update: (id: string, addressData: any) => 
    apiService.put(`/addresses/${id}`, { address: addressData }),
  
  delete: (id: string) => 
    apiService.delete(`/addresses/${id}`),
    
  makeDefault: (id: string) => 
    apiService.put(`/addresses/${id}/make_default`),
};

export const storesAPI = {
  getAll: () => 
    apiService.get('/stores'),
  
  getById: (id: string) => 
    apiService.get(`/stores/${id}`),
  
  create: (storeData: any) => 
    apiService.post('/stores', { store: storeData }),
  
  update: (id: string, storeData: any) => 
    apiService.put(`/stores/${id}`, { store: storeData }),
  
  delete: (id: string) => 
    apiService.delete(`/stores/${id}`),
    
  toggleActive: (id: string) => 
    apiService.put(`/stores/${id}/toggle_active`),
};

// Helper function to transform camelCase to snake_case for vehicle data
const transformVehicleData = (data: any) => ({
  make: data.make,
  model: data.model,
  year: data.year,
  color: data.color,
  license_plate: data.licensePlate,
  vehicle_type: data.vehicleType,
});

export const vehiclesAPI = {
  get: () => 
    apiService.get('/vehicles'),
  
  getById: (id: string) => 
    apiService.get(`/vehicles/${id}`),
  
  create: (vehicleData: any) => 
    apiService.post('/vehicles', { vehicle: transformVehicleData(vehicleData) }),
  
  update: (id: string, vehicleData: any) => 
    apiService.put(`/vehicles/${id}`, { vehicle: transformVehicleData(vehicleData) }),
  
  delete: (id: string) => 
    apiService.delete(`/vehicles/${id}`),
};

export default apiService; 