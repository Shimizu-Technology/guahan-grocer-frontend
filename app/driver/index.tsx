import { useEffect } from 'react';
import { router } from 'expo-router';

export default function DriverIndex() {
  useEffect(() => {
    router.replace('/driver/(tabs)');
  }, []);

  return null;
} 