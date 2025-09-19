import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onBarcodeScanned: (gtin: string) => void;
}

const { width, height } = Dimensions.get('window');

// Global variable to prevent ANY barcode processing across all instances
let GLOBAL_BARCODE_LOCK = false;

export default function BarcodeScanner({ visible, onClose, onBarcodeScanned }: BarcodeScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  
  // Use refs for immediate synchronous state tracking
  const processingRef = useRef(false);
  const lastCodeRef = useRef<string | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    if (visible) {
      getCameraPermissions();
      // Reset scanner state when opening
      GLOBAL_BARCODE_LOCK = false; // Reset global lock
      setScanned(false);
      setIsLoading(false);
      setLastScannedCode(null);
      setLastScanTime(0);
      // Reset refs
      processingRef.current = false;
      lastCodeRef.current = null;
      lastTimeRef.current = 0;
    }
  }, [visible]);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    // GLOBAL LOCK - prevents ANY barcode processing anywhere in the app
    if (GLOBAL_BARCODE_LOCK) {
      console.log('🚫 GLOBAL LOCK: Barcode processing blocked');
      return;
    }

    const now = Date.now();
    
    // SYNCHRONOUS blocking using refs - this prevents ALL duplicate scans
    if (processingRef.current) {
      console.log('⚠️ Scan blocked: already processing (ref)');
      return;
    }
    
    // Prevent same code within 3 seconds
    if (lastCodeRef.current === data && (now - lastTimeRef.current) < 3000) {
      console.log('⚠️ Scan blocked: same code too soon (ref)');
      return;
    }
    
    // Prevent any scan within 1 second of last scan
    if ((now - lastTimeRef.current) < 1000) {
      console.log('⚠️ Scan blocked: too frequent (ref)');
      return;
    }

    console.log('📱 Barcode scanned:', data);
    
    // IMMEDIATELY set GLOBAL LOCK and refs to block ALL further scans
    GLOBAL_BARCODE_LOCK = true;
    processingRef.current = true;
    lastCodeRef.current = data;
    lastTimeRef.current = now;
    
    // Also set states for UI feedback
    setScanned(true);
    setIsLoading(true);
    setLastScannedCode(data);
    setLastScanTime(now);

    try {
      // Validate barcode format (basic validation)
      if (data.length < 8 || data.length > 14) {
        Alert.alert('Invalid Barcode', 'Please scan a valid product barcode (UPC/EAN).');
        resetScanner();
        return;
      }

      // Call the parent callback with the scanned GTIN
      console.log('📱 Processing barcode:', data);
      await onBarcodeScanned(data);
      onClose();
    } catch (error) {
      console.error('Barcode scanning error:', error);
      Alert.alert('Error', 'Failed to process barcode. Please try again.');
      resetScanner();
    } finally {
      // Reset ALL locks
      GLOBAL_BARCODE_LOCK = false;
      processingRef.current = false;
      setIsLoading(false);
    }
  };

  const resetScanner = () => {
    GLOBAL_BARCODE_LOCK = false; // Reset global lock
    processingRef.current = false; // Reset ref immediately
    setScanned(false);
    setIsLoading(false);
    // Don't reset lastScannedCode and lastScanTime to prevent immediate re-scans
  };

  const handleClose = () => {
    resetScanner();
    onClose();
  };

  if (!visible) return null;

  if (hasPermission === null) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={styles.loadingText}>Requesting camera permission...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="camera-outline" size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Camera Permission Required</Text>
            <Text style={styles.errorText}>
              Please enable camera access in your device settings to scan barcodes.
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeIcon}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Product Barcode</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Camera View */}
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned || processingRef.current ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: [
                'upc_a',
                'upc_e', 
                'ean13',
                'ean8',
                'code128',
                'code39',
              ],
            }}
          />
          
          {/* Scanning Overlay - positioned absolutely over camera */}
          <View style={styles.overlay}>
            {/* Top overlay */}
            <View style={styles.overlayTop} />
            
            {/* Middle section with scanning frame */}
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                
                {isLoading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="white" />
                    <Text style={styles.processingText}>Processing...</Text>
                  </View>
                )}
              </View>
              <View style={styles.overlaySide} />
            </View>
            
            {/* Bottom overlay */}
            <View style={styles.overlayBottom}>
              <Text style={styles.instructionText}>
                Position the barcode within the frame
              </Text>
              <Text style={styles.subInstructionText}>
                The barcode will be scanned automatically
              </Text>
            </View>
          </View>
        </View>

        {/* Manual Reset Button */}
        {scanned && !isLoading && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.resetButtonText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeIcon: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: 200,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanFrame: {
    width: 250,
    height: 200,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#0F766E',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subInstructionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 12,
  },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    paddingHorizontal: 40,
  },
  errorTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  closeButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
