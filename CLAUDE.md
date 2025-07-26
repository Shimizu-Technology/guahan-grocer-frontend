# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

### Before starting work
- Always in plan mode to make a plan
- After getting the plan, make sure to write the plan to .claude/tasks/TASK_NAME.md
- The plan should be a detailed implementation plan and the reasoning behind it, as well as tasks broken down
- If the task requires external knowledge or certain packages, also research to get the latest knowledge (Use Task tool for research)
- Don't over plan it, always think MVP
- Once you write the plan, first ask me to review it. Do not continue until I approve the plan.

### While implementing
- You should update the plan as you work
- AFter you complete tasks in the plan, you should update and append detailed descriptions of the changes you made, so the following tasks can be easily hadned over to other engineers.

## Quick Start Commands
```bash
npm install          # Install dependencies
npm start            # Start Expo dev server
npm run ios          # iOS simulator
npm run android      # Android emulator
npm run web          # Web browser
npx tsc --noEmit     # Type checking
```

## Architecture Overview

### File-Based Routing (Expo Router v5)
```
app/
├── (tabs)/          # Customer interface (bottom tabs)
├── admin/           # Admin dashboard
├── driver/          # Driver interface
├── login.tsx        # Auth entry
└── checkout.tsx     # Order completion
```

### Role-Based Navigation
- **Customer**: `/(tabs)` → Home, Catalog, Cart, Profile
- **Driver**: `/driver/(tabs)` → Dashboard, Orders, Earnings, Profile  
- **Admin**: `/admin/(tabs)` → Dashboard, Orders, Inventory, Users, Profile

### Context Providers
- **AuthContext** (`/context/AuthContext.tsx`) - User auth & role management
- **CartContext** (`/context/CartContext.tsx`) - Shopping cart state
- **FavoritesContext** (`/context/FavoritesContext.tsx`) - Favorite items

### Key Directories
- `/app` - File-based routes (Expo Router)
- `/context` - React Context providers
- `/services` - API service layer for backend communication
- `/types` - TypeScript interfaces
- `/components` - Reusable UI components

### TypeScript Patterns
- **User Roles**: `'customer' | 'driver' | 'admin'`
- **Order Status**: `'new' | 'shopping' | 'delivering' | 'delivered' | 'cancelled'`
- **Shopping Status**: `'pending' | 'found' | 'unavailable' | 'substituted'`

### Development Features
- Expo SDK 53 with React Native 0.79.5
- Hot reloading enabled
- TypeScript strict mode
- AsyncStorage for persistence
- SWR ready for API integration
- **Mobile-first design** with responsive web support - optimized for phones but designed to look great on laptops and desktops

### Demo Accounts
- Customer: `customer@example.com` / `password`
- Driver: `driver@example.com` / `password`  
- Admin: `admin@example.com` / `password`