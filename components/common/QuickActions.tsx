import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/config';

export interface QuickActionItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  bg: string;
  color: string;
  category: 'Safety & Help' | 'Living & Bills' | 'Social & Sports' | 'Commerce & Food' | 'Facilities';
  badge?: string;
}

export const ALL_COMMUNITY_SERVICES: QuickActionItem[] = [
  // Safety & Emergency
  { id: 'emergency', icon: 'alert-circle', label: 'Emergency SOS', route: '/emergency', bg: '#FEE2E2', color: '#DC2626', category: 'Safety & Help', badge: '24x7' },
  { id: 'helpdesk', icon: 'headset', label: 'Helpdesk', route: '/helpdesk', bg: '#E0E7FF', color: '#4F46E5', category: 'Safety & Help' },
  { id: 'visitors', icon: 'shield-checkmark', label: 'Visitors Gate', route: '/visitors', bg: '#DBEAFE', color: '#2563EB', category: 'Safety & Help' },

  // Living & Essentials
  { id: 'dues', icon: 'card', label: 'Maintenance Dues', route: '/finance', bg: '#FEF3C7', color: '#D97706', category: 'Living & Bills', badge: 'Bills' },
  { id: 'services', icon: 'construct', label: 'Home Services', route: '/services', bg: '#FCE7F3', color: '#DB2777', category: 'Living & Bills' },
  { id: 'notices', icon: 'megaphone', label: 'Notices', route: '/admin/announcements', bg: '#EDE9FE', color: '#7C3AED', category: 'Living & Bills' },
  { id: 'parking', icon: 'car', label: 'Parking Slots', route: '/parking', bg: '#E0E7FF', color: '#4338CA', category: 'Living & Bills' },

  // Social & Community
  { id: 'events', icon: 'calendar', label: 'Events & Passes', route: '/tabs/events', bg: '#EEF2FF', color: '#4F46E5', category: 'Social & Sports' },
  { id: 'sports', icon: 'trophy', label: 'Sports & Leagues', route: '/sports', bg: '#FEF3C7', color: '#D97706', category: 'Social & Sports' },
  { id: 'trips', icon: 'compass', label: 'Community Trips', route: '/trips', bg: '#CCFBF1', color: '#0D9488', category: 'Social & Sports' },
  { id: 'discover', icon: 'sparkles', label: 'Discover Neighbors', route: '/discover', bg: '#EDE9FE', color: '#7C3AED', category: 'Social & Sports' },
  { id: 'polls', icon: 'stats-chart', label: 'Polls & Votes', route: '/polls', bg: '#FFF7ED', color: '#EA580C', category: 'Social & Sports' },
  { id: 'jobs', icon: 'briefcase', label: 'Jobs & CPN', route: '/jobs', bg: '#EFF6FF', color: '#2563EB', category: 'Social & Sports' },
  { id: 'commute', icon: 'car-sport', label: 'Carpool & Rides', route: '/commute', bg: '#F3E8FF', color: '#7C3AED', category: 'Social & Sports' },
  { id: 'pets', icon: 'paw', label: 'Pet Care', route: '/pets', bg: '#FCE7F3', color: '#DB2777', category: 'Social & Sports' },

  // Commerce & Food
  { id: 'market', icon: 'storefront', label: 'Marketplace', route: '/tabs/marketplace', bg: '#D1FAE5', color: '#059669', category: 'Commerce & Food' },
  { id: 'group_buying', icon: 'bag-handle', label: 'Group Buying', route: '/group-buying', bg: '#ECFDF5', color: '#059669', category: 'Commerce & Food', badge: 'Save ₹' },
  { id: 'food', icon: 'restaurant', label: 'Food & Kitchen', route: '/food', bg: '#FFE4E6', color: '#E11D48', category: 'Commerce & Food' },
  { id: 'auction', icon: 'pricetag', label: 'Sports Auction', route: '/auction', bg: '#ECFDF5', color: '#10B981', category: 'Commerce & Food' },

  // Facilities
  { id: 'facilities', icon: 'fitness', label: 'Amenities Booking', route: '/facilities', bg: '#CCFBF1', color: '#0D9488', category: 'Facilities' },
];

export function QuickActions() {
  const router = useRouter();
  const [showAllModal, setShowAllModal] = useState(false);

  // Top 10 popular highlights in horizontal scroll
  const highlightedServices = [
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'emergency')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'dues')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'group_buying')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'events')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'sports')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'services')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'market')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'trips')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'helpdesk')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'facilities')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'food')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'visitors')!,
  ].filter(Boolean);

  const categories: Array<QuickActionItem['category']> = [
    'Safety & Help',
    'Living & Bills',
    'Social & Sports',
    'Commerce & Food',
    'Facilities',
  ];

  return (
    <View style={s.wrapper}>
      <View style={s.headerRow}>
        <Text style={s.heading}>Community Services</Text>
        <TouchableOpacity onPress={() => setShowAllModal(true)} activeOpacity={0.7} hitSlop={8}>
          <Text style={s.seeAll}>See All ({ALL_COMMUNITY_SERVICES.length}) →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {highlightedServices.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={s.item}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.7}
          >
            <View style={[s.iconCircle, { backgroundColor: action.bg }]}>
              <Ionicons name={action.icon} size={22} color={action.color} />
              {action.badge && (
                <View style={s.miniBadge}>
                  <Text style={s.miniBadgeText}>{action.badge}</Text>
                </View>
              )}
            </View>
            <Text style={s.label} numberOfLines={1}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Full Services Hub Modal ── */}
      <Modal visible={showAllModal} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <View>
              <Text style={s.modalTitle}>{"Community Hub & Services"}</Text>
              <Text style={s.modalSub}>All amenities, modules, and utilities</Text>
            </View>
            <TouchableOpacity
              style={s.closeButton}
              onPress={() => setShowAllModal(false)}
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalScroll} showsVerticalScrollIndicator={false}>
            {categories.map((cat) => {
              const items = ALL_COMMUNITY_SERVICES.filter((item) => item.category === cat);
              return (
                <View key={cat} style={s.categorySection}>
                  <Text style={s.categoryTitle}>{cat}</Text>
                  <View style={s.grid}>
                    {items.map((action) => (
                      <TouchableOpacity
                        key={action.id}
                        style={s.gridCard}
                        onPress={() => {
                          setShowAllModal(false);
                          router.push(action.route as any);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[s.gridIconCircle, { backgroundColor: action.bg }]}>
                          <Ionicons name={action.icon} size={24} color={action.color} />
                        </View>
                        <Text style={s.gridLabel} numberOfLines={2}>
                          {action.label}
                        </Text>
                        {action.badge && (
                          <View style={[s.gridBadge, { backgroundColor: action.bg }]}>
                            <Text style={[s.gridBadgeText, { color: action.color }]}>
                              {action.badge}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    paddingTop: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
  },
  scroll: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  item: {
    alignItems: 'center',
    width: 76,
    gap: 6,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...SHADOWS.sm,
  },
  miniBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: RADIUS.full,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  miniBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
  },
  modalScroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  categorySection: {
    gap: 10,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    width: '31%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 100,
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  gridBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  gridBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
