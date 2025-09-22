import { Stack, router } from 'expo-router';
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const { user, isLoading, currentViewRole } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading]);

  // Redirect when admin switches view roles
  useEffect(() => {
    if (!isLoading && user && user.role === 'admin') {
      if (currentViewRole === 'customer') {
        router.replace('/(tabs)');
      } else if (currentViewRole === 'driver') {
        router.replace('/driver/(tabs)');
      }
      // If currentViewRole is 'admin', stay on admin layout
    }
  }, [user, isLoading, currentViewRole]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false
        }} 
      />
    </Stack>
  );
} 