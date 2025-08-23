import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

interface Notification {
  id: string;
  type: 'variance_approval' | 'variance_approved' | 'variance_rejected' | 'variance_timeout' | 'order_update';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  handleVarianceApprovalNotification: (data: any) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from storage on mount
  useEffect(() => {
    loadNotifications();
  }, []);

  // Save notifications to storage whenever they change
  useEffect(() => {
    saveNotifications();
  }, [notifications]);

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const notifications = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(notifications);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const saveNotifications = async () => {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show alert for important notifications
    if (notification.type === 'variance_approval') {
      Alert.alert(
        notification.title,
        notification.message,
        [
          { text: 'Later', style: 'cancel' },
          { 
            text: 'Review Now', 
            onPress: () => {
              if (notification.data?.order_id) {
                router.push(`/order-detail/${notification.data.order_id}`);
              }
            }
          }
        ]
      );
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const handleVarianceApprovalNotification = (data: any) => {
    const productName = data.product_name || 'Unknown item';
    const variancePercentage = data.variance_percentage || 0;
    const varianceText = variancePercentage > 0 
      ? `${variancePercentage.toFixed(1)}% more` 
      : `${Math.abs(variancePercentage).toFixed(1)}% less`;

    addNotification({
      type: 'variance_approval',
      title: 'Weight Variance Approval Needed',
      message: `${productName} found with ${varianceText} weight than requested. Tap to review.`,
      data
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        handleVarianceApprovalNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};