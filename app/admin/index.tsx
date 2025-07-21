import { useEffect } from 'react';
import { router } from 'expo-router';

export default function AdminIndex() {
  useEffect(() => {
    router.replace('/admin/(tabs)');
  }, []);

  return null;
} 