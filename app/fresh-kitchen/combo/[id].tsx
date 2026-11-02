import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { freshKitchenService, SEED_BREAKFAST_COMBOS } from '@/services/freshKitchenService';
import type { BreakfastCombo } from '@/types/freshKitchen';

export default function ComboDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [combo, setCombo] = useState<BreakfastCombo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadCombo();
  }, [id]);

  const loadCombo = async () => {
    setLoading(true);
    try {
      const combos = await freshKitchenService.getBreakfastCombos();
      const match = combos.find((c) => c.id === id) || SEED_BREAKFAST_COMBOS[0];
      setCombo(match);
    } catch {
      setCombo(SEED_BREAKFAST_COMBOS[0]);
    } finally {
      setLoading(false);
    }
  };

  const toggleAddon = (addonId: string) => {
    if (selectedAddons.includes(addonId)) {
      setSelectedAddons(selectedAddons.filter((x) => x !== addonId));
    } else {
      setSelectedAddons([...selectedAddons, addonId]);
    }
  };

  const addonsTotal = combo
    ? combo.optionalAddons
        .filter((a) => selectedAddons.includes(a.id))
        .reduce((sum, a) => sum + a.price, 0)
    : 0;

  const unitTotal = (combo?.finalPrice || 0) + addonsTotal;
  const grandTotal = unitTotal * quantity;

  const handleAddToBasket = async () => {
    if (!combo) return;
    try {
      await freshKitchenService.addItemToDailyBasket({
        comboId: combo.id,
        itemName: combo.name,
        itemCategory: 'BREAKFAST_KIT',
        unitPrice: unitTotal,
        quantity,
        scheduledDays: ['SAT', 'SUN'],
      });
      Alert.alert(
        'Added to Weekend Basket',
        `${combo.name} scheduled for Weekend delivery.`,
        [
          { text: 'View Basket', onPress: () => router.push('/daily-basket') },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not add to basket');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!combo) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Combo kit not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Breakfast Kit Builder' }} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <Text style={styles.title}>{combo.name}</Text>
          <Text style={styles.servings}>{combo.servings}</Text>
          <Text style={styles.desc}>{combo.description}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.finalPrice}>₹{combo.finalPrice}</Text>
            <Text style={styles.basePrice}>₹{combo.basePrice}</Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>{combo.discountPercentage}% OFF</Text>
            </View>
          </View>
        </View>

        {/* BOM Items Included */}
        <Text style={styles.sectionTitle}>Includes (Bill of Materials)</Text>
        <View style={styles.bomCard}>
          <View style={styles.bomItem}>
            <Ionicons name="checkmark-circle" size={18} color="#059669" />
            <Text style={styles.bomText}>
              {combo.mainProduct.name} ({combo.mainProduct.unit})
            </Text>
          </View>

          {combo.mandatoryChutneyOptions.map((chutney) => (
            <View key={chutney.id} style={styles.bomItem}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text style={styles.bomText}>
                {chutney.name} ({chutney.unit})
              </Text>
            </View>
          ))}
        </View>

        {/* Optional Add-ons */}
        {combo.optionalAddons.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Customize & Add Extra</Text>
            <View style={styles.addonsList}>
              {combo.optionalAddons.map((addon) => {
                const isSelected = selectedAddons.includes(addon.id);
                return (
                  <TouchableOpacity
                    key={addon.id}
                    onPress={() => toggleAddon(addon.id)}
                    style={[styles.addonCard, isSelected && styles.addonCardSelected]}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isSelected ? COLORS.primary : '#94a3b8'}
                    />
                    <View style={styles.addonInfo}>
                      <Text style={styles.addonName}>{addon.name}</Text>
                      {addon.description && (
                        <Text style={styles.addonDesc}>{addon.description}</Text>
                      )}
                    </View>
                    <Text style={styles.addonPrice}>+₹{addon.price}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Quantity Selector */}
        <View style={styles.qtyContainer}>
          <Text style={styles.qtyLabel}>Quantity (Sets)</Text>
          <View style={styles.qtyControls}>
            <TouchableOpacity
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              style={styles.qtyBtn}
            >
              <Ionicons name="remove" size={18} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.qtyVal}>{quantity}</Text>
            <TouchableOpacity
              onPress={() => setQuantity(quantity + 1)}
              style={styles.qtyBtn}
            >
              <Ionicons name="add" size={18} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomLabel}>Total Kit Price</Text>
          <Text style={styles.bottomPrice}>₹{grandTotal}</Text>
        </View>

        <TouchableOpacity style={styles.ctaBtn} onPress={handleAddToBasket}>
          <Ionicons name="basket-outline" size={18} color="#ffffff" />
          <Text style={styles.ctaText}>Add to Daily Basket</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  servings: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
    marginBottom: SPACING.xs,
  },
  desc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  finalPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  basePrice: {
    fontSize: 14,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  saveBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  saveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: SPACING.xs,
    marginTop: SPACING.xs,
  },
  bomCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
    marginBottom: SPACING.md,
  },
  bomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bomText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
  },
  addonsList: {
    gap: 8,
    marginBottom: SPACING.md,
  },
  addonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  addonCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#f0fdf4',
  },
  addonInfo: {
    flex: 1,
  },
  addonName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  addonDesc: {
    fontSize: 11,
    color: '#64748b',
  },
  addonPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  qtyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qtyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  bottomPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
  },
});
