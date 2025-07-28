import * as Location from 'expo-location';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface AddressComponents {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface LocationResult {
  success: boolean;
  coordinates?: LocationCoords;
  address?: AddressComponents;
  error?: string;
}

class LocationService {
  private lastKnownLocation: { coords: LocationCoords; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  /**
   * Request location permissions from user
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Check if location services are enabled on device
   */
  async isLocationEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  /**
   * Get current position coordinates
   */
  async getCurrentPosition(): Promise<LocationCoords | null> {
    // Check if we have a recent cached location
    if (this.lastKnownLocation) {
      const age = Date.now() - this.lastKnownLocation.timestamp;
      if (age < this.CACHE_DURATION) {
        console.log('Using cached location for faster response');
        return this.lastKnownLocation.coords;
      }
    }

    try {
      // Use balanced accuracy for faster results while maintaining good precision
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        // Add timeout to prevent indefinite waiting
        timeInterval: 5000, // 5 second timeout
        // Allow cached location up to 30 seconds old for faster response
        distanceInterval: 10, // Update when moved 10 meters
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Cache the location for future requests
      this.lastKnownLocation = {
        coords,
        timestamp: Date.now(),
      };

      return coords;
    } catch (error) {
      console.error('Error getting current position:', error);
      
      // Fallback: Try with lower accuracy if high accuracy fails
      try {
        console.log('Retrying with lower accuracy...');
        const fallbackLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
          timeInterval: 3000, // 3 second timeout for fallback
        });
        
        const coords = {
          latitude: fallbackLocation.coords.latitude,
          longitude: fallbackLocation.coords.longitude,
        };

        // Cache the fallback location too
        this.lastKnownLocation = {
          coords,
          timestamp: Date.now(),
        };
        
        return coords;
      } catch (fallbackError) {
        console.error('Fallback location also failed:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(coords: LocationCoords): Promise<AddressComponents | null> {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (results.length === 0) {
        return null;
      }

      const result = results[0];
      
      // Format address components for Guam
      return {
        streetAddress: this.formatStreetAddress(result),
        city: result.city || result.subregion || 'Unknown City',
        state: result.region || 'GU',
        zipCode: result.postalCode || '',
        country: result.country || 'Guam',
      };
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Format street address from location result
   */
  private formatStreetAddress(result: Location.LocationGeocodedAddress): string {
    const parts: string[] = [];
    
    if (result.streetNumber) {
      parts.push(result.streetNumber);
    }
    if (result.street) {
      parts.push(result.street);
    }
    
    return parts.length > 0 ? parts.join(' ') : (result.name || 'Unknown Street');
  }

  /**
   * Get current location with address - main method
   */
  async getCurrentLocationWithAddress(): Promise<LocationResult> {
    try {
      // Fast permission and service checks first
      const [isEnabled, hasPermission] = await Promise.all([
        this.isLocationEnabled(),
        this.requestPermissions()
      ]);

      if (!isEnabled) {
        return {
          success: false,
          error: 'Location services are disabled. Please enable location services and try again.',
        };
      }

      if (!hasPermission) {
        return {
          success: false,
          error: 'Location permission denied. Please grant location permission to use this feature.',
        };
      }

      // Get current position with optimized settings
      const coordinates = await this.getCurrentPosition();
      if (!coordinates) {
        return {
          success: false,
          error: 'Unable to get your current location. Please try again or check your location settings.',
        };
      }

      // Reverse geocode to get address
      const address = await this.reverseGeocode(coordinates);
      if (!address) {
        return {
          success: false,
          error: 'Unable to determine your address from your location. Please enter your address manually.',
        };
      }

      return {
        success: true,
        coordinates,
        address,
      };
    } catch (error) {
      console.error('Error in getCurrentLocationWithAddress:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while getting your location. Please try again.',
      };
    }
  }
}

export const locationService = new LocationService(); 