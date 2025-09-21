import React, { createContext, useContext, useState } from 'react';
import Toast from '../components/shared/Toast';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
  showAddToCartToast: (itemName: string, quantity?: number, weightUnit?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'success',
    duration: 2000,
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 2000) => {
    setToast({
      visible: true,
      message,
      type,
      duration,
    });
  };

  const showAddToCartToast = (itemName: string, quantity?: number, weightUnit?: string) => {
    let message = `Added to cart ✓`;
    
    if (quantity && weightUnit) {
      // Weight-based item
      message = `Added ${quantity}${weightUnit} ${itemName} to cart ✓`;
    } else if (quantity && quantity > 1) {
      // Multiple unit-based items
      message = `Added ${quantity} ${itemName} to cart ✓`;
    } else {
      // Single unit-based item
      message = `Added ${itemName} to cart ✓`;
    }

    showToast(message, 'success', 2500);
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast, showAddToCartToast }}>
      {children}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
};
