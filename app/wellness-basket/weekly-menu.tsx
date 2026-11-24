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
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/config';
import {
  wellnessBasketService,
  SEED_WEEK_MENU,
} from '@/services/wellnessBasketService';
import type {
  WellnessMenuWeek,
  WellnessMenuDay,
  WellnessNutrition,
} from '@/types/wellnessBasket';

export default function WeeklyMenuScreen() {
  const router = useRouter();
  const [menuWeek, setMenuWeek] = useState<WellnessMenuWeek>(SEED_WEEK_MENU);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    setLoading(true);
    try {
      const data = await wellnessBasketService.getMenuForWeek();
      setMenuWeek(data);
    } catch {
      setMenuWeek(SEED_WEEK_MENU);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = (day: WellnessMenuDay, product: WellnessNutrition) => {
    if (!menuWeek.isSwapWindowOpen) {
      Alert.alert(
        'Swap Window Closed',
        'Weekly swaps open every Friday at 6:00 PM IST and close Saturday at 8:00 PM IST.'
      );
      return;
    }

    if (day.alternativeProducts.length === 0) {
      Alert.alert('No Alternatives', 'No dietitian alternatives are configured for this item.');
      return;
    }

    const alt = day.alternativeProducts[0];
    Alert.alert(
      'Confirm Item Swap',
      `Swap "${product.productName}" for "${alt.productName}" on ${day.dayOfWeekName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Swap',
          onPress: async () => {
            try {
              await wellnessBasketService.requestSwap({
                deliveryDate: day.deliveryDate,
                originalProductId: product.productId,
                requestedProductId: alt.productId,
              });
              Alert.alert('Swap Requested', 'Dietitian manifest has been updated for this delivery.');
              loadMenu();
            } catch {
              Alert.alert('Error', 'Could not process swap request.');
            }
          },
        },
      ]
    );
  };

  const currentDay = menuWeek.days[selectedDayIdx] || menuWeek.days[0];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `Menu Rotation (Week ${menuWeek.cycleWeek})`,
          headerStyle: { backgroundColor: '#064E3B' },
          headerTintColor: '#FFFFFF',
        }}
      />

      {/* Swap Window Banner */}
      <View
        style={[
          styles.swapBanner,
          { backgroundColor: menuWeek.isSwapWindowOpen ? '#059669' : '#334155' },
        ]}
      >
        <Ionicons name="time-outline" size={16} color="#FFFFFF" />
        <Text style={styles.swapBannerText}>
          {menuWeek.isSwapWindowOpen
            ? 'Swap Window OPEN (Fri 6 PM – Sat 8 PM)'
            : 'Swap Window Opens Friday 6:00 PM IST'}
        </Text>
      </View>

      {/* Day Tabs */}
      <View style={styles.dayTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabsScroll}>
          {menuWeek.days.map((d, i) => {
            const isSelected = selectedDayIdx === i;
            return (
              <TouchableOpacity
                key={d.deliveryDate}
                style={[styles.dayTab, isSelected && styles.dayTabSelected]}
                onPress={() => setSelectedDayIdx(i)}
              >
                <Text style={[styles.dayTabDow, isSelected && styles.dayTabDowSelected]}>
                  {d.dayOfWeekName.substring(0, 3)}
                </Text>
                <Text style={[styles.dayTabDate, isSelected && styles.dayTabDateSelected]}>
                  {new Date(d.deliveryDate).getDate()}
                </Text>
                <Text style={styles.dayTabCals}>{d.totalEnergyKcal} kcal</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Selected Day Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {currentDay && (
          <View>
            {/* Dietitian Notes */}
            <View style={styles.notesCard}>
              <View style={styles.notesHeader}>
                <Ionicons name="sparkles" size={16} color="#059669" />
                <Text style={styles.notesTitle}>Dietitian Formulation ({currentDay.dayOfWeekName})</Text>
              </View>
              <Text style={styles.notesBody}>"{currentDay.dietitianNotes}"</Text>

              {/* Macro Pills */}
              <View style={styles.macrosRow}>
                <View style={styles.macroPill}>
                  <Text style={styles.macroVal}>{currentDay.totalEnergyKcal}</Text>
                  <Text style={styles.macroLbl}>Calories</Text>
                </View>
                <View style={styles.macroPill}>
                  <Text style={styles.macroVal}>{currentDay.totalProteinG}g</Text>
                  <Text style={styles.macroLbl}>Protein</Text>
                </View>
                <View style={styles.macroPill}>
                  <Text style={styles.macroVal}>{currentDay.totalCarbsG}g</Text>
                  <Text style={styles.macroLbl}>Carbs</Text>
                </View>
                <View style={styles.macroPill}>
                  <Text style={styles.macroVal}>{currentDay.totalFibreG}g</Text>
                  <Text style={styles.macroLbl}>Fibre</Text>
                </View>
              </View>
            </View>

            {/* Products List */}
            <Text style={styles.productsTitle}>Morning Box Items</Text>
            {currentDay.products.map((p) => (
              <View key={p.productId} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <Text style={styles.productCategory}>{p.category.replace(/_/g, ' ')}</Text>
                  <Text style={styles.productCals}>{p.energyKcal} kcal</Text>
                </View>
                <Text style={styles.productName}>{p.productName}</Text>
                <Text style={styles.productMacros}>
                  Protein: {p.proteinG}g  •  Carbs: {p.carbsG}g  •  Fat: {p.fatG}g
                </Text>

                {menuWeek.isSwapWindowOpen && currentDay.alternativeProducts.length > 0 && (
                  <TouchableOpacity
                    style={styles.swapBtn}
                    onPress={() => handleSwap(currentDay, p)}
                  >
                    <Ionicons name="swap-horizontal" size={14} color="#059669" />
                    <Text style={styles.swapBtnText}>Swap with Alternative</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  swapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  swapBannerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  dayTabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dayTabsScroll: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: 8,
  },
  dayTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    minWidth: 54,
  },
  dayTabSelected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  dayTabDow: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  dayTabDowSelected: {
    color: '#059669',
  },
  dayTabDate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 2,
  },
  dayTabDateSelected: {
    color: '#059669',
  },
  dayTabCals: {
    fontSize: 9,
    color: '#94A3B8',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  notesBody: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#475569',
    lineHeight: 16,
    marginBottom: 12,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: RADIUS.sm,
  },
  macroPill: {
    alignItems: 'center',
  },
  macroVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  macroLbl: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  productsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  productCals: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  productMacros: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 8,
  },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  swapBtnText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
});
