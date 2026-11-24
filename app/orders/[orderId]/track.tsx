import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import {
  fulfillmentService,
  FulfillmentEvent,
  FulfillmentEventType,
  DeliveryAssignment,
} from '@/services/fulfillmentService';

const SEQUENCE: FulfillmentEventType[] = [
  'PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED',
];

const STEP_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PLACED:            { label: 'Order Placed',     icon: 'checkmark-circle-outline' },
  CONFIRMED:         { label: 'Confirmed',         icon: 'shield-checkmark-outline' },
  PREPARING:         { label: 'Preparing',         icon: 'flame-outline' },
  READY:             { label: 'Ready',             icon: 'bag-check-outline' },
  OUT_FOR_DELIVERY:  { label: 'Out for Delivery',  icon: 'bicycle-outline' },
  DELIVERED:         { label: 'Delivered',         icon: 'home-outline' },
  CANCELLED:         { label: 'Cancelled',         icon: 'close-circle-outline' },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function PulsingDot() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.35, duration: 600, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [scale]);
  return (
    <Animated.View style={[styles.dotActive, { transform: [{ scale }] }]}>
      <Ionicons name="ellipse" size={8} color="#FFFFFF" />
    </Animated.View>
  );
}

export default function OrderTrackScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [events, setEvents] = useState<FulfillmentEvent[]>([]);
  const [delivery, setDelivery] = useState<DeliveryAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const currentStatus: FulfillmentEventType = events.length > 0
    ? events[events.length - 1].eventType
    : 'PLACED';

  const isTerminal = currentStatus === 'DELIVERED' || currentStatus === 'CANCELLED';

  const fetchData = useCallback(async () => {
    if (!orderId) return;
    try {
      const [timeline, assign] = await Promise.all([
        fulfillmentService.getTimeline(orderId),
        fulfillmentService.getDeliveryAssignment(orderId),
      ]);
      setEvents(timeline);
      setDelivery(assign);
      setLastUpdated(new Date());
    } catch {
      // silent — keep old data
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isTerminal) return;
    const timer = setInterval(fetchData, 30_000);
    return () => clearInterval(timer);
  }, [fetchData, isTerminal]);

  const isCancelled = currentStatus === 'CANCELLED';
  const steps = isCancelled
    ? [...SEQUENCE, 'CANCELLED' as FulfillmentEventType]
    : SEQUENCE;

  const currentIdx = steps.indexOf(currentStatus);

  function getEventForStep(step: FulfillmentEventType): FulfillmentEvent | undefined {
    return events.find(e => e.eventType === step);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Track Order</Text>
          <Text style={styles.headerSub}>#{orderId}</Text>
        </View>
        <Text style={styles.updatedText}>
          {isTerminal ? 'Final' : `Updated ${formatTime(lastUpdated.toISOString())}`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Delivery banner */}
        {currentStatus === 'OUT_FOR_DELIVERY' && delivery && (
          <View style={styles.deliveryBanner}>
            <Text style={styles.deliveryIcon}>🛵</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryName}>{delivery.deliveryPersonName ?? 'Delivery Partner'}</Text>
              {delivery.deliveryPersonPhone && (
                <Text style={styles.deliveryPhone}>{delivery.deliveryPersonPhone}</Text>
              )}
            </View>
            {delivery.estimatedArrival && (
              <View style={styles.etaBadge}>
                <Text style={styles.etaText}>~{delivery.estimatedArrival}</Text>
              </View>
            )}
          </View>
        )}

        {/* Timeline */}
        <View style={styles.timelineCard}>
          {steps.map((step, idx) => {
            const done   = idx <= currentIdx;
            const active = idx === currentIdx;
            const ev     = getEventForStep(step as FulfillmentEventType);
            const meta   = STEP_META[step] ?? { label: step, icon: 'ellipse-outline' };
            const isCancelStep = step === 'CANCELLED';

            return (
              <View key={step} style={styles.stepRow}>
                {/* connector + dot */}
                <View style={styles.dotCol}>
                  {active && !isCancelStep ? (
                    <PulsingDot />
                  ) : (
                    <View style={[
                      styles.dot,
                      done && !isCancelStep && styles.dotDone,
                      isCancelStep && done && styles.dotCancel,
                    ]}>
                      {done && (
                        <Ionicons
                          name={isCancelStep ? 'close' : 'checkmark'}
                          size={10}
                          color="#FFFFFF"
                        />
                      )}
                    </View>
                  )}
                  {idx < steps.length - 1 && (
                    <View style={[styles.connector, done && idx < currentIdx ? styles.connectorDone : null]} />
                  )}
                </View>

                {/* label */}
                <View style={styles.stepContent}>
                  <View style={styles.stepLabelRow}>
                    <Ionicons
                      name={meta.icon}
                      size={15}
                      color={active ? COLORS.primary : done ? COLORS.success : COLORS.textMuted}
                    />
                    <Text style={[
                      styles.stepLabel,
                      done && !isCancelStep && styles.stepLabelDone,
                      active && styles.stepLabelActive,
                      isCancelStep && done && styles.stepLabelCancel,
                    ]}>
                      {meta.label}
                    </Text>
                  </View>
                  {ev ? (
                    <Text style={styles.stepTime}>{formatTime(ev.occurredAt)}</Text>
                  ) : active ? (
                    <Text style={styles.stepWaiting}>In progress…</Text>
                  ) : !done ? (
                    <Text style={styles.stepWaiting}>Waiting…</Text>
                  ) : null}
                  {ev?.note && <Text style={styles.stepNote}>{ev.note}</Text>}
                </View>
              </View>
            );
          })}
        </View>

        {/* Terminal message */}
        {currentStatus === 'DELIVERED' && (
          <View style={styles.terminalCard}>
            <Text style={styles.terminalEmoji}>🎉</Text>
            <Text style={styles.terminalTitle}>Order Delivered!</Text>
            <Text style={styles.terminalSub}>Enjoy your order. Rate the experience from your activity centre.</Text>
          </View>
        )}
        {currentStatus === 'CANCELLED' && (
          <View style={[styles.terminalCard, styles.terminalCancel]}>
            <Text style={styles.terminalEmoji}>❌</Text>
            <Text style={[styles.terminalTitle, { color: COLORS.error ?? '#EF4444' }]}>Order Cancelled</Text>
            <Text style={styles.terminalSub}>Refunds, if applicable, are processed within 3–5 business days.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background ?? '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border ?? '#E2E8F0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  headerSub:   { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  updatedText: { marginLeft: 'auto', fontSize: 11, color: COLORS.textMuted },
  scroll: { padding: SPACING.md, gap: 12 },

  deliveryBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.md, padding: 14,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  deliveryIcon: { fontSize: 24 },
  deliveryName: { fontSize: 14, fontWeight: '600', color: '#1E40AF' },
  deliveryPhone: { fontSize: 12, color: '#3B82F6', marginTop: 2 },
  etaBadge: { backgroundColor: '#1D4ED8', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  etaText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  timelineCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: 16,
    ...SHADOWS.sm,
  },
  stepRow: { flexDirection: 'row', gap: 12, minHeight: 48 },
  dotCol:  { alignItems: 'center', width: 22 },
  dot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.border ?? '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  dotDone:   { backgroundColor: COLORS.success ?? '#22C55E' },
  dotActive: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primary ?? '#6366F1',
    alignItems: 'center', justifyContent: 'center',
  },
  dotCancel: { backgroundColor: '#EF4444' },
  connector: { width: 2, flex: 1, backgroundColor: COLORS.border ?? '#E2E8F0', marginVertical: 2 },
  connectorDone: { backgroundColor: COLORS.success ?? '#22C55E' },

  stepContent: { flex: 1, paddingBottom: 16 },
  stepLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepLabel:       { fontSize: 14, color: COLORS.textMuted ?? '#94A3B8', fontWeight: '500' },
  stepLabelDone:   { color: COLORS.text ?? '#1E293B', fontWeight: '600' },
  stepLabelActive: { color: COLORS.primary ?? '#6366F1', fontWeight: '700' },
  stepLabelCancel: { color: '#EF4444', fontWeight: '700' },
  stepTime:    { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  stepWaiting: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 2 },
  stepNote:    { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontStyle: 'italic' },

  terminalCard: {
    alignItems: 'center', padding: 20,
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  terminalCancel: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  terminalEmoji: { fontSize: 32, marginBottom: 8 },
  terminalTitle: { fontSize: 16, fontWeight: '700', color: '#16A34A' },
  terminalSub:   { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 6 },
});
