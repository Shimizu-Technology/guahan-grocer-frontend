# Guahan Grocer - React Native App

This is the React Native version of the Guahan Grocer app, migrated from the original React.js web app. Built with Expo and TypeScript.

## 🚀 Migration Completed

### ✅ What's Been Migrated

- **Core Business Logic**: All context providers (Auth, Cart, Favorites)
- **Authentication System**: Login screen with role-based navigation
- **Customer App**: Complete customer experience with 5 tabs
  - **Home**: Welcome screen with featured products and categories
  - **Catalog**: Product browsing with search, filters, and product details
  - **Favorites**: Save and manage favorite products
  - **Cart**: Shopping cart with quantity management
  - **Profile**: User profile with stats and account management
- **Navigation**: File-based routing with Expo Router
- **Data**: Real API integration with Rails backend
- **Styling**: Native styling with consistent color scheme

### 🎨 Design System

The app maintains the same visual identity as the original:
- **Primary Color**: Ocean Teal (#0F766E)
- **Secondary Color**: Coral (#E67E52)
- **Typography**: System fonts with consistent sizing
- **Layout**: Card-based design with rounded corners and shadows

## 🏃‍♂️ Getting Started

### Prerequisites

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

### Demo Accounts

Test the app with these demo accounts:

- **Customer**: `customer@example.com` / `password`
- **Driver**: `driver@example.com` / `password`
- **Admin**: `admin@example.com` / `password`

## 📱 App Architecture

```
react-native-frontend/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Customer tab navigation
│   │   ├── index.tsx      # Home screen
│   │   ├── catalog.tsx    # Product catalog
│   │   ├── favorites.tsx  # Favorites list
│   │   ├── cart.tsx       # Shopping cart
│   │   └── profile.tsx    # User profile
│   ├── login.tsx          # Authentication
│   └── _layout.tsx        # Root layout with providers
├── context/               # React Context providers
│   ├── AuthContext.tsx    # Authentication state
│   ├── CartContext.tsx    # Shopping cart state
│   └── FavoritesContext.tsx # Favorites state
├── components/            # Reusable components
├── types/                 # TypeScript interfaces
├── data/                  # Mock data
└── hooks/                 # Custom hooks (to be added)
```

## 🔄 Key Differences from Web Version

### Storage
- **Web**: `localStorage` → **Mobile**: `AsyncStorage`

### Navigation
- **Web**: React Router → **Mobile**: Expo Router (file-based)

### UI Framework
- **Web**: Tailwind CSS → **Mobile**: React Native StyleSheet

### Icons
- **Web**: Lucide React → **Mobile**: Ionicons

## 🚧 Next Steps (In Order of Priority)

### 1. Driver & Admin Apps
- [ ] Create driver dashboard (`/app/driver/index.tsx`)
- [ ] Order management screens for drivers
- [ ] Admin dashboard with inventory/orders/SMS tabs

### 2. Enhanced Features
- [ ] Checkout flow with payment integration
- [ ] Order tracking with real-time updates
- [ ] Push notifications
- [ ] Camera integration for barcode scanning

### 3. API Integration
- [ ] Replace mock data with real API calls
- [ ] Implement SWR for data fetching
- [ ] Add error handling and loading states

### 4. Performance & UX
- [ ] Add React Native Reanimated animations
- [ ] Implement pull-to-refresh
- [ ] Add skeleton loading states
- [ ] Image caching and optimization

### 5. Native Features
- [ ] Location services for delivery tracking
- [ ] Camera for profile pictures
- [ ] Biometric authentication
- [ ] Offline support

## 🛠 Development Commands

```bash
# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web

# Type checking
npx tsc --noEmit
```

## 🚀 Deployment Instructions

### **Frontend Web (Netlify) - Auto-deploy**
```bash
# 1. Build the web version
npx expo export -p web

# 2. Commit and push (includes the dist/ folder)
git add .
git commit -m "Frontend web changes"
git push origin main

# ✅ Auto-deploys to Netlify
# Check: https://guahan-grocer.netlify.app
```

### **iOS App (TestFlight/App Store)**
```bash
# 1. Update version in app.json (if not already done)
# Edit: "version": "1.0.X"

# 2. ⚠️ CRITICAL: Update iOS Info.plist to match app.json version
# File: ios/GuahanGrocer/Info.plist
# Find: <key>CFBundleShortVersionString</key>
# Update: <string>1.0.X</string> (must match app.json version exactly)

# 3. 🚨 MANDATORY: Update version in profile pages
# File: app/(tabs)/profile.tsx
# Find: Version 1.0.X (React Native)
# Update to match app.json version
# 
# File: app/admin/(tabs)/profile.tsx  
# Find: <Text style={styles.infoValue}>1.0.X</Text>
# Update to match app.json version

# 4. Build for iOS
eas build --platform ios --profile production-ios

# 5. Submit to TestFlight
eas submit --platform ios --latest

# 6. Wait 5-10 minutes for Apple processing
# 7. Update available in TestFlight app
# Check: https://appstoreconnect.apple.com/apps/6749652653/testflight/ios
```

### **⚠️ Common Build Issues & Solutions**

#### Pod Dependency Conflicts
If you get `Compatible versions of some pods could not be resolved`:
```bash
# Clean and reinstall iOS pods
cd ios
rm -rf Pods && rm Podfile.lock
pod install
cd ..

# Then rebuild with cache cleared
eas build --platform ios --profile production-ios --clear-cache
```

#### Version Mismatch Submission Error
If you get `You've already submitted this version of the app`:
```bash
# 1. Check version consistency
# app.json version: should match Info.plist version

# 2. Update iOS Info.plist to match app.json
# File: ios/GuahanGrocer/Info.plist
# Key: CFBundleShortVersionString
# Value: should match "version" in app.json

# 3. Rebuild and resubmit
eas build --platform ios --profile production-ios
eas submit --platform ios --latest
```

#### Pre-Build Checklist
Before building, always verify:
- [ ] `app.json` version is incremented (e.g., "1.0.2" → "1.0.3")
- [ ] **🚨 MANDATORY**: `ios/GuahanGrocer/Info.plist` CFBundleShortVersionString matches app.json version exactly
- [ ] **🚨 MANDATORY**: Profile pages display versions match app.json version:
  - [ ] `app/(tabs)/profile.tsx` - Customer profile version text
  - [ ] `app/admin/(tabs)/profile.tsx` - Admin profile version text
- [ ] PostHog API key is set in EAS environment (see PostHog Setup below)
- [ ] All changes are committed (for tracking)
- [ ] Backend is deployed if API changes were made

**Quick version check command:**
```bash
# Check current versions across all files
echo "app.json version:" && grep '"version"' app.json
echo "Info.plist version:" && grep -A1 "CFBundleShortVersionString" ios/GuahanGrocer/Info.plist
echo "Customer profile version:" && grep "Version.*React Native" app/\(tabs\)/profile.tsx
echo "Admin profile version:" && grep -A1 "App Version" app/admin/\(tabs\)/profile.tsx | tail -1
```

#### PostHog Setup (Analytics)
PostHog analytics requires an API key to be set in the EAS environment:

```bash
# Set PostHog API key for production builds
eas env:create --environment production --name EXPO_PUBLIC_POSTHOG_API_KEY --value "your_posthog_api_key_here" --visibility plaintext

# Verify it's set
eas env:list --environment production
```

**Note**: The app will work without PostHog (analytics just won't be tracked), but setting the API key enables user behavior tracking.

#### React "Maximum update depth exceeded" Error
If you get this error on app launch:
```
Error: Maximum update depth exceeded. This can happen when a component 
repeatedly calls setState inside componentWillUpdate or componentDidUpdate.
```

**Cause**: Usually caused by defining components inside render functions or infinite re-render loops.

**Solution**: Check that:
- No components are defined inside other component render functions
- No `setState` calls are made directly in render methods
- `useEffect` dependencies are properly managed

### **Android App (Google Play)**
```bash
# Build for Android (when ready)
eas build --platform android --profile production
eas submit --platform android --latest
```

## 🔄 Complete Deployment Workflow

```bash
# For most changes (backend + frontend web):
npx expo export -p web  # Build web version
git add .
git commit -m "Your changes"
git push origin main     # Auto-deploys backend + web

# For iOS updates (manual):
eas build --platform ios --profile production-ios
eas submit --platform ios --latest
```

## 📦 Key Dependencies

- **Expo SDK 53**: React Native platform
- **Expo Router**: File-based navigation
- **AsyncStorage**: Persistent storage
- **Ionicons**: Icon library
- **TypeScript**: Type safety
- **SWR**: Data fetching (ready to use)
- **date-fns**: Date formatting

## 🔗 Integration with Backend

The app is designed to work with your existing Rails API:

```typescript
// Example API integration (to be implemented)
const API_BASE_URL = 'http://your-rails-api.com/api/v1';

// Your existing endpoints should work:
// POST /api/v1/sessions (login)
// GET /api/v1/items (products)
// POST /api/v1/orders (create order)
// etc.
```

## 🎯 Migration Benefits

1. **Native Performance**: 60fps animations and smooth scrolling
2. **Platform Features**: Push notifications, camera, location
3. **App Store Distribution**: Deploy to iOS App Store and Google Play
4. **Offline Capability**: Works without internet connection
5. **Native UI**: Platform-specific design patterns
6. **Code Reuse**: Shared business logic between platforms

## 💡 Tips for Continued Development

1. **Use Expo Router's typed routes** for type-safe navigation
2. **Leverage React Native's built-in components** before adding libraries
3. **Test on both iOS and Android** regularly
4. **Use Expo's managed workflow** for easier deployment
5. **Consider using NativeWind** for Tailwind-like styling if preferred

## 🤝 Contributing

The app structure follows React Native best practices:
- Keep components small and focused
- Use TypeScript for better developer experience
- Follow the existing file structure
- Test on multiple devices/simulators

---

**🎉 Congratulations!** You now have a fully functional React Native version of your Guahan Grocer app. The customer experience is complete and ready for testing. The next step is to build out the driver and admin experiences to match your original web app's functionality. 