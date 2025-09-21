import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Item } from '../../types';

interface EnhancedProductInfoProps {
  item: Item;
  compact?: boolean;
  minimal?: boolean; // New prop for very minimal display
  hideBrandSize?: boolean; // New prop to hide brand/size when already shown elsewhere
}

export default function EnhancedProductInfo({ item, compact = false, minimal = false, hideBrandSize = false }: EnhancedProductInfoProps) {
  const [showIngredients, setShowIngredients] = useState(false);
  const [showAllergens, setShowAllergens] = useState(false);

  if (!item.enhanced) {
    return null;
  }

  const { enhanced } = item;

  const renderHealthScores = () => {
    if (!enhanced.hasHealthScores) return null;

    return (
      <View style={styles.healthScoresContainer}>
        {enhanced.nutriscoreGrade && (
          <View style={[styles.badge, styles.nutriscoreBadge]}>
            <Text style={styles.badgeText}>Nutri-Score {enhanced.nutriscoreGrade}</Text>
          </View>
        )}
        {enhanced.novaDisplay && (
          <View style={[styles.badge, styles.novaBadge]}>
            <Text style={styles.badgeText}>NOVA {enhanced.novaGroup}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderBrandAndSize = () => {
    if (!enhanced.brand && !enhanced.size) return null;

    return (
      <View style={styles.brandSizeContainer}>
        {enhanced.brand && (
          <Text style={styles.brandText}>{enhanced.brand}</Text>
        )}
        {enhanced.size && (
          <Text style={styles.sizeText}>{enhanced.size}</Text>
        )}
      </View>
    );
  };

  const renderNutritionInfo = () => {
    if (!enhanced.hasNutritionData || !enhanced.caloriesPer100g) return null;

    return (
      <View style={styles.nutritionContainer}>
        <View style={styles.nutritionItem}>
          <Ionicons name="fitness-outline" size={16} color="#6B7280" />
          <Text style={styles.nutritionText}>
            {enhanced.caloriesPer100g} cal/100g
          </Text>
        </View>
        {enhanced.servingSize && (
          <View style={styles.nutritionItem}>
            <Ionicons name="restaurant-outline" size={16} color="#6B7280" />
            <Text style={styles.nutritionText}>
              Serving: {enhanced.servingSize}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderIngredients = () => {
    if (!enhanced.ingredients) return null;

    return (
      <View style={styles.expandableSection}>
        <TouchableOpacity
          style={styles.expandableHeader}
          onPress={() => setShowIngredients(!showIngredients)}
        >
          <View style={styles.expandableHeaderContent}>
            <Ionicons name="list-outline" size={16} color="#6B7280" />
            <Text style={styles.expandableHeaderText}>Ingredients</Text>
          </View>
          <Ionicons
            name={showIngredients ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#6B7280"
          />
        </TouchableOpacity>
        {showIngredients && (
          <Text style={styles.expandableContent}>{enhanced.ingredients}</Text>
        )}
      </View>
    );
  };

  const renderAllergens = () => {
    if (!enhanced.hasAllergenInfo) return null;

    const allergenText = [enhanced.allergens, enhanced.traces]
      .filter(Boolean)
      .join(', ');

    if (!allergenText) return null;

    return (
      <View style={styles.expandableSection}>
        <TouchableOpacity
          style={styles.expandableHeader}
          onPress={() => setShowAllergens(!showAllergens)}
        >
          <View style={styles.expandableHeaderContent}>
            <Ionicons name="warning-outline" size={16} color="#EF4444" />
            <Text style={[styles.expandableHeaderText, styles.allergenHeaderText]}>
              Allergen Info
            </Text>
          </View>
          <Ionicons
            name={showAllergens ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#EF4444"
          />
        </TouchableOpacity>
        {showAllergens && (
          <View style={styles.allergenContent}>
            {enhanced.allergens && (
              <View style={styles.allergenItem}>
                <Text style={styles.allergenLabel}>Contains:</Text>
                <Text style={styles.allergenText}>{enhanced.allergens}</Text>
              </View>
            )}
            {enhanced.traces && (
              <View style={styles.allergenItem}>
                <Text style={styles.allergenLabel}>May contain:</Text>
                <Text style={styles.allergenText}>{enhanced.traces}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (minimal) {
    return (
      <View style={styles.minimalContainer}>
        {renderBrandAndSize()}
      </View>
    );
  }

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {!hideBrandSize && renderBrandAndSize()}
        {renderHealthScores()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!hideBrandSize && renderBrandAndSize()}
      {renderHealthScores()}
      {renderNutritionInfo()}
      {renderIngredients()}
      {renderAllergens()}
      {enhanced.packaging && (
        <View style={styles.packagingContainer}>
          <Ionicons name="cube-outline" size={16} color="#6B7280" />
          <Text style={styles.packagingText}>Packaging: {enhanced.packaging}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  compactContainer: {
    gap: 6,
  },
  minimalContainer: {
    gap: 4,
  },
  brandSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap', // Allow wrapping to next line if needed
  },
  brandText: {
    fontSize: 13, // Slightly smaller
    fontWeight: '600',
    color: '#374151',
    flexShrink: 1, // Allow text to shrink if needed
  },
  sizeText: {
    fontSize: 12, // Slightly smaller
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0, // Don't shrink the size badge
  },
  healthScoresContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nutriscoreBadge: {
    backgroundColor: '#10B981',
  },
  novaBadge: {
    backgroundColor: '#F59E0B',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nutritionContainer: {
    gap: 4,
  },
  nutritionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nutritionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  expandableSection: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  expandableHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expandableHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  allergenHeaderText: {
    color: '#EF4444',
  },
  expandableContent: {
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },
  allergenContent: {
    padding: 12,
    gap: 8,
  },
  allergenItem: {
    gap: 4,
  },
  allergenLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    textTransform: 'uppercase',
  },
  allergenText: {
    fontSize: 14,
    color: '#374151',
  },
  packagingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  packagingText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
