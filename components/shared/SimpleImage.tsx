import React, { useState, memo } from 'react';
import { Image, View, StyleSheet, ImageStyle, ViewStyle } from 'react-native';

interface SimpleImageProps {
  src: string | undefined | null;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  accessibilityLabel?: string;
  fallbackSrc?: string;
}

/**
 * Simple, reliable image component that just works
 * No complex optimizations or transformations that can break URLs
 */
const SimpleImage: React.FC<SimpleImageProps> = memo(({
  src: sourceUrl,
  style,
  containerStyle,
  resizeMode = 'cover',
  accessibilityLabel,
  fallbackSrc,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [attemptedUrls, setAttemptedUrls] = useState<Set<string>>(new Set());

  // Handle image load completion
  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    // DON'T reset attempted URLs on successful load - this was causing the flashing!
    // Only reset when source URL changes (handled in useEffect below)
  };

  // Handle image load error - prevent infinite loops
    const handleError = (error: any) => {
    const currentUrl = imageUrl;

    // Track this URL as failed
    setAttemptedUrls(prev => new Set(prev).add(currentUrl));

    // Only log actual errors (not fallback attempts) to keep logs clean
    if (__DEV__ && !hasError) {
      console.warn('SimpleImage: Failed to load', currentUrl, 'falling back...');
    }

    setIsLoading(false);

    // Only set error if this is not already a fallback URL attempt
    if (!hasError) {
      setHasError(true);
    }
  };

  // Get a reliable fallback image - memoized to prevent re-calculations
  const defaultFallback = React.useMemo(() => {
    return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300';
  }, []);

  // Simple URL selection - memoized to prevent unnecessary re-renders
  const imageUrl = React.useMemo(() => {
    let result;
    
    if (hasError) {
      // Try fallback first, then default if fallback also failed
      if (fallbackSrc && !attemptedUrls.has(fallbackSrc)) {
        result = fallbackSrc;
      } else if (!attemptedUrls.has(defaultFallback)) {
        result = defaultFallback;
      } else {
        // All options failed, use default anyway as last resort
        result = defaultFallback;
      }
    } else {
      // Try source first, then fallback, then default
      if (sourceUrl && !attemptedUrls.has(sourceUrl)) {
        result = sourceUrl;
      } else if (fallbackSrc && !attemptedUrls.has(fallbackSrc)) {
        result = fallbackSrc;
      } else {
        result = defaultFallback;
      }
    }
    
    return result;
  }, [hasError, sourceUrl, fallbackSrc, defaultFallback, attemptedUrls]);

  // Note: Verbose logging removed for cleaner console output

  // Reset attemptedUrls when source URL changes (new image)
  React.useEffect(() => {
    setAttemptedUrls(new Set());
    setHasError(false);
    setIsLoading(true);
  }, [sourceUrl]); // Only when source URL changes

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Simple placeholder during loading */}
      {isLoading && (
        <View style={[styles.placeholder, style]} />
      )}
      
      {/* Main Image - keep it simple */}
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, style]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f3f4f6',
    zIndex: 1,
  },
});

export default SimpleImage; 