import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SimpleImage from './SimpleImage';

interface ImageCarouselProps {
  images: string[];
  style?: any;
  imageStyle?: any;
  accessibilityLabel?: string;
  showIndicators?: boolean;
  showNavigation?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export default function ImageCarousel({
  images,
  style,
  imageStyle,
  accessibilityLabel = 'Product images',
  showIndicators = true,
  showNavigation = false,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  if (!images || images.length === 0) {
    return null;
  }

  // If only one image, show it directly
  if (images.length === 1) {
    return (
      <View style={[styles.container, style]}>
        <SimpleImage
          src={images[0]}
          style={[styles.image, imageStyle]}
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    );
  }

  const handleScroll = (event: any) => {
    if (containerWidth > 0) {
      const index = Math.round(event.nativeEvent.contentOffset.x / containerWidth);
      setCurrentIndex(index);
    }
  };

  const goToPrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    setCurrentIndex(newIndex);
    if (scrollViewRef.current && containerWidth > 0) {
      scrollViewRef.current.scrollTo({ x: newIndex * containerWidth, animated: true });
    }
  };

  const goToNext = () => {
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    if (scrollViewRef.current && containerWidth > 0) {
      scrollViewRef.current.scrollTo({ x: newIndex * containerWidth, animated: true });
    }
  };

  return (
    <View 
      style={[styles.container, style]}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={[styles.scrollView, { height: imageStyle?.height || 200 }]} // Add explicit height
      >
        {images.map((imageUrl, index) => {
          const itemWidth = containerWidth > 0 ? containerWidth : 200;
          return (
            <View key={`${imageUrl}-${index}`} style={[styles.imageContainer, { width: itemWidth }]}>
              <SimpleImage
                src={imageUrl}
                style={[styles.image, { width: itemWidth - 20 }, imageStyle]} // Subtract padding
                accessibilityLabel={`${accessibilityLabel} ${index + 1} of ${images.length}`}
              />
            </View>
          );
        })}
      </ScrollView>

      {/* Navigation arrows (optional) */}
      {showNavigation && images.length > 1 && (
        <>
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonLeft]}
            onPress={goToPrevious}
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonRight]}
            onPress={goToNext}
          >
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </>
      )}

      {/* Indicators */}
      {showIndicators && images.length > 1 && (
        <View style={styles.indicators}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentIndex && styles.indicatorActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10, // Add horizontal padding
  },
  image: {
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover', // Ensure proper image scaling
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -16 }],
  },
  navButtonLeft: {
    left: 8,
  },
  navButtonRight: {
    right: 8,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  indicatorActive: {
    backgroundColor: '#0F766E',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
