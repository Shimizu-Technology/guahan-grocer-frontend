import { Tabs, router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, Animated } from 'react-native';

import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import Colors from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

// Cart Icon with Badge Component
const CartIconWithBadge = ({ color, focused }: { color: string; focused: boolean }) => {
  const { itemCount } = useCart();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevItemCount = useRef(itemCount);

  useEffect(() => {
    if (itemCount > prevItemCount.current) {
      // Bounce animation when items are added
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevItemCount.current = itemCount;
  }, [itemCount, scaleAnim]);
  
  return (
    <View style={{ position: 'relative' }}>
      <TabBarIcon name={focused ? 'bag' : 'bag-outline'} color={color} />
      {itemCount > 0 && (
        <Animated.View style={{
          position: 'absolute',
          top: -6,
          right: -6,
          backgroundColor: '#E67E52',
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: 'white',
          transform: [{ scale: scaleAnim }],
        }}>
          <Text style={{
            color: 'white',
            fontSize: 12,
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            {itemCount > 99 ? '99+' : itemCount}
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

export default function TabLayout() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect authenticated non-customer users to their appropriate layouts
      if (user.role === 'driver') {
        router.replace('/driver/(tabs)');
      } else if (user.role === 'admin') {
        router.replace('/admin/(tabs)');
      }
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  // Block non-customer authenticated users (they should be redirected above)
  if (user && user.role !== 'customer') {
    return null; // Will redirect to appropriate layout
  }

  // Allow both guests (user === null) and customers (user.role === 'customer')

  // Render tabs for guests and customers
  const isCustomer = user?.role === 'customer';
  const isGuest = !user;

  return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#1F2937', // Dark gray for active tabs
          tabBarInactiveTintColor: '#D1D5DB', // Light gray for inactive tabs
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            paddingBottom: 25, // Extra padding for iPhone home indicator
            paddingTop: 8,
            height: 85, // Increased height to accommodate padding
            paddingHorizontal: 10, // Better spacing for icons
            elevation: 0, // Remove shadow on Android
            shadowOpacity: 0, // Remove shadow on iOS
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 4,
            textAlign: 'center',
          },
          tabBarIconStyle: {
            marginBottom: 2,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="catalog"
          options={{
            title: 'Catalog',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'grid' : 'grid-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: 'Favorites',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'heart' : 'heart-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: 'Cart',
            tabBarIcon: ({ color, focused }) => (
              <CartIconWithBadge color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'person' : 'person-outline'} color={color} />
            ),
          }}
        />
      </Tabs>
    );
}
