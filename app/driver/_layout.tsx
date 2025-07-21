import { Stack, router } from 'expo-router';
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { useAuth } from '../../context/AuthContext';

export default function DriverLayout() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading]);

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
      <Stack.Screen 
        name="dashboard" 
        options={{ 
          headerShown: false,
          title: 'Driver Dashboard'
        }} 
      />
      <Stack.Screen 
        name="order/[id]" 
        options={{ 
          headerShown: false,
          title: 'Order Details'
        }} 
      />
    </Stack>
  );
} 