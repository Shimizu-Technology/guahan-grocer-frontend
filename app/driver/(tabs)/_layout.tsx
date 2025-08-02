import { Tabs } from 'expo-router';
import React from 'react';
import { View, Text } from 'react-native';

import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import Colors from '../../../constants/Colors';
import { useColorScheme } from '../../../components/useColorScheme';
import { useAuth } from '../../../context/AuthContext';

export default function DriverTabLayout() {
  const colorScheme = useColorScheme();
  const { isOnline } = useAuth();

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
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'speedometer' : 'speedometer-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'list' : 'list-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'wallet' : 'wallet-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ position: 'relative' }}>
              <TabBarIcon name={focused ? 'person' : 'person-outline'} color={color} />
              {isOnline && (
                <View style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#059669',
                  borderWidth: 1,
                  borderColor: '#FFFFFF',
                }} />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
} 