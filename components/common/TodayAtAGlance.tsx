import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SHADOWS } from '@/constants/config';

// ── Types ────────────────────────────────────────────────────────
export interface KpiChip {
  id: string;
  label: string;
  value: number | string;
  emoji: string;
  /** Icon name from Ionicons */
  icon: keyof typeof Ionicons.glyphMap;
  /** Accent colour for the value text and icon tint */
  color: string;
  /** Soft background colour for the chip */
  bg: string;
  /** Slightly darker version of bg used for the icon badge */
  iconBg: string;
  /** Expo Router route to push to when tapped */
  route: string;
}

interface TodayAtAGlanceProps {
  chips: KpiChip[];
}

// ── Component ─────────────────────────────────────────────────────
export function TodayAtAGlance({ chips }: TodayAtAGlanceProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const displayChips = chips.slice(0, 6);

  const renderCard = (chip: KpiChip) => (
    <TouchableOpacity
      key={chip.id}
      style={[styles.card, { backgroundColor: chip.bg }]}
      onPress={() => router.push(chip.route as any)}
      activeOpacity={0.75}
    >
      <View style={styles.cardTopRow}>
        <View style={[styles.iconBadge, { backgroundColor: chip.iconBg }]}>
          <Ionicons name={chip.icon} size={11} color={chip.color} />
        </View>
        <Text style={[styles.value, { color: chip.color }]}>
          {typeof chip.value === 'number' && chip.value > 99 ? '99+' : chip.value}
        </Text>
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {chip.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrapper}>
      {/* Section heading */}
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Today at a Glance</Text>
        <View style={styles.headingRightActions}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => setShowModal(true)}
            activeOpacity={0.7}
            accessibilityLabel="View all updates"
          >
            <Text style={styles.moreBtnText}>View All</Text>
            <Ionicons name="chevron-forward" size={11} color="#2563EB" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Compact 3x2 Grid: 3 in row 1, 3 in row 2 */}
      <View style={styles.grid}>
        {/* Row 1 */}
        {displayChips.length >= 3 && (
          <View style={styles.gridRow}>
            {renderCard(displayChips[0])}
            {renderCard(displayChips[1])}
            {renderCard(displayChips[2])}
          </View>
        )}

        {/* Row 2 */}
        {displayChips.length >= 6 && (
          <View style={styles.gridRow}>
            {renderCard(displayChips[3])}
            {renderCard(displayChips[4])}
            {renderCard(displayChips[5])}
          </View>
        )}
      </View>

      {/* Dedicated All Options Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalDragPill} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Today at a Glance</Text>
                <Text style={styles.modalSub}>All community updates, services & activities</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowModal(false)}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {chips.map((chip) => (
                <TouchableOpacity
                  key={chip.id}
                  style={[styles.modalCard, { backgroundColor: chip.bg }]}
                  onPress={() => {
                    setShowModal(false);
                    router.push(chip.route as any);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.modalIconBox, { backgroundColor: chip.iconBg }]}>
                    <Ionicons name={chip.icon} size={18} color={chip.color} />
                  </View>
                  <View style={styles.modalCardMiddle}>
                    <Text style={styles.modalCardLabel}>{chip.label}</Text>
                    <Text style={styles.modalCardSub}>Tap to open {chip.label.toLowerCase()}</Text>
                  </View>
                  <View style={styles.modalCardRight}>
                    <Text style={[styles.modalCardValue, { color: chip.color }]}>
                      {chip.value}
                    </Text>
                    <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 1,
    paddingBottom: 2,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  heading: {
    fontFamily: FONTS.displayBold,
    fontSize: 12.5,
    color: '#1E293B',
    letterSpacing: -0.2,
  },
  headingRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  moreBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 9.5,
    color: '#2563EB',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  liveDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  grid: {
    paddingHorizontal: 16,
    gap: 6,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  card: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 5.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    gap: 2,
    ...SHADOWS.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: FONTS.displayEB,
    fontSize: 14,
    letterSpacing: -0.4,
    lineHeight: 18,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 9.5,
    color: '#64748B',
    letterSpacing: 0.05,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 24,
    maxHeight: '80%',
    ...SHADOWS.lg,
  } as any,
  modalDragPill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginVertical: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalScrollContent: {
    gap: 8,
    paddingBottom: 16,
  },
  modalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    gap: 12,
  },
  modalIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCardMiddle: {
    flex: 1,
  },
  modalCardLabel: {
    fontSize: 13.5,
    fontFamily: FONTS.bold,
    color: '#0F172A',
  },
  modalCardSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#64748B',
    marginTop: 1,
  },
  modalCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalCardValue: {
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
});
