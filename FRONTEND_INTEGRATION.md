# Frontend-Backend Integration Guide

## 🎯 **PHASE 1: API Foundation - ✅ COMPLETE**

### ✅ **What We've Built:**
- **API Service Layer** (`services/api.ts`) - Complete HTTP client
- **Environment Configuration** (`config/environment.ts`) - Centralized config
- **Type-safe API calls** with error handling
- **Authentication headers** automatic injection
- **File upload support** for images

### 📱 **Setup Instructions:**

1. **Create your .env.local file in the frontend root:**
```bash
# Copy this to: guahan-grocer-frontend/.env.local
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_ENV=development
```

2. **For physical device testing, use your computer's IP:**
```bash
# Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:3000/api/v1
```

## 🚀 **PHASE 2: Authentication Integration**

### **Next Steps:**
1. Update AuthContext to use real backend API
2. Handle JWT tokens properly
3. Add user registration flow
4. Test login/logout functionality

### **Files to Update:**
- `context/AuthContext.tsx` - Replace mock authentication
- `types/index.ts` - Align with backend response format

## 🧪 **Testing Phase 1:**

```bash
# Start your backend first
cd guahan-grocer-backend
rails server --port 3000

# Then test frontend API connectivity
cd guahan-grocer-frontend
npm start

# In your app, you can test API connectivity
```

## 📊 **Integration Progress:**

- [x] **Phase 1**: API Foundation (Complete)
- [ ] **Phase 2**: Authentication Integration  
- [ ] **Phase 3**: Products Integration
- [ ] **Phase 4**: Favorites Integration
- [ ] **Phase 5**: Orders Integration

## 🔧 **Current API Endpoints Ready:**

```typescript
// Authentication
authAPI.login(email, password)
authAPI.register(email, password, name, phone) 
authAPI.getCurrentUser()
authAPI.logout()

// Products (public)
productsAPI.getAll(category?)
productsAPI.getById(id)

// Favorites (authenticated)
favoritesAPI.getAll()
favoritesAPI.add(productId)
favoritesAPI.remove(productId)

// Orders (authenticated)
ordersAPI.getAll()
ordersAPI.getById(id)
ordersAPI.create(orderData)
ordersAPI.updateStatus(id, status)
```

## 🎯 **Ready for Phase 2!**

Your API service layer is complete and ready. Next, we'll update the AuthContext to use real backend authentication instead of mock data.

The integration is designed to be:
- ✅ **Non-breaking** - Keep existing functionality while adding real API
- ✅ **Incremental** - Test each piece as we go
- ✅ **Fallback-safe** - Graceful error handling if backend is down 