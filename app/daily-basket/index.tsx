import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { freshKitchenService } from '@/services/freshKitchenService';
import type { DailyBasket, DayOfWeek } from '@/types/freshKitchen';

const WEEKDAYS: { code: DayOfWeek; label: string }[] = [
  { code: 'MON', label: 'M' },
  { code: 'TUE', label: 'T' },
  { code: 'WED', label: 'W' },
  { code: 'THU', label: 'Th' },
  { code: 'FRI', label: 'F' },
  { code: 'SAT', label: 'Sa' },
  { code: 'SUN', label: 'Su' },
];

export default function DailyBasketScreen() {
  const router = useRouter();
  const [basket, setBasket] = useState<DailyBasket | null>(null);
  const [loading, setLoading] = useState(true);
  const [vacationModal, setVacationModal] = useState(false);

  useEffect(() => {
    loadBasket();
  }, []);

  const loadBasket = async () => {
    setLoading(true);
    try {
      const data = await freshKitchenService.getDailyBasket();
      setBasket(data);
    } catch {
      // fallback handled in service
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePause = async () => {
    if (!basket) return;
    try {
      if (basket.isVacationPaused) {
        const updated = await freshKitchenService.resumeDailyBasket();
        setBasket(updated);
        Alert.alert('Resumed', 'Your Daily Basket deliveries are resumed.');
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        const updated = await freshKitchenService.pauseDailyBasket({
          isVacationPaused: true,
          vacationStartDate: tomorrow.toISOString().split('T')[0],
          vacationEndDate: nextWeek.toISOString().split('T')[0],
        });
        setBasket(updated);
        Alert.alert(
          'Vacation Pause Activated',
          `Basket paused from ${tomorrow.toISOString().split('T')[0]} to ${nextWeek.toISOString().split('T')[0]}. No deliveries or charges during this period.`
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update pause status');
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    Alert.alert(
      'Remove from Basket',
      `Are you sure you want to remove "${itemName}" from your recurring daily basket?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await freshKitchenService.deleteDailyBasketItem(itemId);
            if (basket) {
              setBasket({
                ...basket,
                items: basket.items.filter((i) => i.id !== itemId),
              });
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const activeItems = basket?.items.filter((i) => !i.isPaused) || [];
  const dailyTotal = activeItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'My Daily Basket',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/fresh-kitchen')}>
              <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Vacation Pause Alert Banner */}
        {basket?.isVacationPaused && (
          <View style={styles.vacationBanner}>
            <Ionicons name="airplane" size={20} color="#b45309" />
            <View style={styles.vacationTextContainer}>
              <Text style={styles.vacationTitle}>Vacation Mode Active</Text>
              <Text style={styles.vacationSub}>
                Paused {basket.vacationStartDate} to {basket.vacationEndDate}. Auto-resumes after.
              </Text>
            </View>
            <TouchableOpacity onPress={handleTogglePause} style={styles.resumeBtn}>
              <Text style={styles.resumeBtnText}>Resume</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Overview Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Delivery Slot</Text>
              <Text style={styles.summaryValue}>
                {basket?.preferredDeliveryTime || '06:00 AM - 06:45 AM'}
              </Text>
            </View>
            <View style={styles.flatTag}>
              <Ionicons name="location-outline" size={14} color="#0284c7" />
              <Text style={styles.flatTagText}>{basket?.flatNumber || 'Tower A - 402'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalsRow}>
            <View>
              <Text style={styles.totalSub}>Active Subscriptions</Text>
              <Text style={styles.totalCount}>{activeItems.length} Products</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.totalSub}>Est. Daily Delivery</Text>
              <Text style={styles.totalAmount}>₹{dailyTotal}</Text>
            </View>
          </View>
        </View>

        {/* Vacation Mode Toggle Card */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <Ionicons name="umbrella-outline" size={20} color="#0f172a" />
            <View>
              <Text style={styles.toggleTitle}>Vacation / Travel Pause</Text>
              <Text style={styles.toggleSub}>Halt morning deliveries while away</Text>
            </View>
          </View>
          <Switch
            value={basket?.isVacationPaused || false}
            onValueChange={handleTogglePause}
            trackColor={{ false: '#cbd5e1', true: '#86efac' }}
            thumbColor={basket?.isVacationPaused ? COLORS.primary : '#ffffff'}
          />
        </View>

        {/* Subscribed Items List */}
        <View style={styles.itemsHeader}>
          <Text style={styles.sectionTitle}>Recurring Items</Text>
          <TouchableOpacity onPress={() => router.push('/fresh-kitchen')}>
            <Text style={styles.addMoreText}>+ Add Products</Text>
          </TouchableOpacity>
        </View>

        {activeItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>Your Basket is Empty</Text>
            <Text style={styles.emptySub}>
              Set up fresh batters, daily milk, and chutneys for scheduled morning delivery.
            </Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => router.push('/fresh-kitchen')}
            >
              <Text style={styles.browseBtnText}>Browse Fresh Kitchen</Text>
            </TouchableOpacity>
          </View>
        ) : (
          activeItems.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.itemName}</Text>
                  <Text style={styles.itemPrice}>
                    ₹{item.unitPrice} × {item.quantity} = ₹{item.unitPrice * item.quantity}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteItem(item.id, item.itemName)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>

              {/* Day Pills */}
              <View style={styles.dayPillsRow}>
                {WEEKDAYS.map((day) => {
                  const isActive = item.scheduledDays?.includes(day.code);
                  return (
                    <View
                      key={day.code}
                      style={[styles.dayPill, isActive && styles.dayPillActive]}
                    >
                      <Text
                        style={[styles.dayPillText, isActive && styles.dayPillTextActive]}
                      >
                        {day.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    gap: SPACING.md,
  },
  vacationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 10,
  },
  vacationTextContainer: {
    flex: 1,
  },
  vacationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
  },
  vacationSub: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 2,
  },
  resumeBtn: {
    backgroundColor: '#92400e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  resumeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  flatTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  flatTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: SPACING.sm,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalSub: {
    fontSize: 11,
    color: '#64748b',
  },
  totalCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  toggleSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  addMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemPrice: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
  dayPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayPillActive: {
    backgroundColor: COLORS.primary,
  },
  dayPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  dayPillTextActive: {
    color: '#ffffff',
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.xs,
  },
  browseBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  browseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
