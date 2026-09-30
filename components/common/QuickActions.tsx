import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS, FONTS } from '@/constants/config';

export interface QuickActionItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  emoji: string;
  label: string;
  route: string;
  bg: string;
  color: string;
  category: 'Safety & Help' | 'Living & Bills' | 'Social & Sports' | 'Commerce & Food' | 'Facilities';
  badge?: string;
}

export const ALL_COMMUNITY_SERVICES: QuickActionItem[] = [
  // 9 Highlighted Grid Items (exact match to design-preview.html .qg)
  { id: 'dues',         emoji: '💳', icon: 'card-outline',              label: 'Dues',          route: '/finance',              bg: '#EEF2FF', color: '#4F46E5', category: 'Living & Bills' },
  { id: 'offers',       emoji: '🛍️', icon: 'pricetag-outline',          label: 'Offers',        route: '/offers',               bg: '#FEF3C7', color: '#D97706', category: 'Commerce & Food', badge: 'NEW' },
  { id: 'group_buying', emoji: '👜', icon: 'bag-handle-outline',         label: 'Group Buy',     route: '/group-buying',         bg: '#ECFDF5', color: '#059669', category: 'Commerce & Food' },
  { id: 'sports',       emoji: '🏆', icon: 'trophy-outline',            label: 'Sports',        route: '/sports',               bg: '#DCFCE7', color: '#059669', category: 'Social & Sports' },
  { id: 'commute',      emoji: '🚗', icon: 'car-sport-outline',         label: 'Commute',       route: '/commute',              bg: '#CFFAFE', color: '#0284C7', category: 'Social & Sports' },
  { id: 'governance',   emoji: '🏛️', icon: 'business-outline',          label: 'Governance',    route: '/governance',           bg: '#EDE9FE', color: '#7C3AED', category: 'Social & Sports', badge: 'NEW' },
  { id: 'academy',      emoji: '🎓', icon: 'school-outline',            label: 'Academy',       route: '/academy',              bg: '#F3E8FF', color: '#7C3AED', category: 'Social & Sports', badge: 'NEW' },
  { id: 'cpos',         emoji: '🏠', icon: 'home-outline',              label: 'Property',      route: '/cpos',                 bg: '#DCFCE7', color: '#059669', category: 'Living & Bills',  badge: 'NEW' },
  { id: 'jobs',         emoji: '💼', icon: 'briefcase-outline',         label: 'CPN Jobs',      route: '/cpn',                  bg: '#EFF6FF', color: '#2563EB', category: 'Social & Sports', badge: 'NEW' },

  { id: 'emergency',    emoji: '🚨', icon: 'alert-circle-outline',      label: 'Emergency SOS', route: '/emergency',            bg: '#FEE2E2', color: '#DC2626', category: 'Safety & Help',   badge: '24x7' },
  { id: 'ai_chat',      emoji: '✨', icon: 'sparkles-outline',          label: 'Mana AI',       route: '/ai-chat',              bg: '#EEF2FF', color: '#6366F1', category: 'Safety & Help',   badge: 'AI' },
  { id: 'helpdesk',     emoji: '🎧', icon: 'headset-outline',           label: 'Helpdesk',      route: '/helpdesk',             bg: '#FEF3C7', color: '#D97706', category: 'Safety & Help' },
  { id: 'visitors',     emoji: '🛡️', icon: 'shield-checkmark-outline', label: 'Visitors Gate', route: '/visitors',             bg: '#CFFAFE', color: '#0891B2', category: 'Safety & Help' },
  { id: 'services',     emoji: '🛠️', icon: 'construct-outline',        label: 'Home Services', route: '/services',             bg: '#FCE7F3', color: '#DB2777', category: 'Living & Bills' },
  { id: 'notices',      emoji: '📢', icon: 'megaphone-outline',        label: 'Notices',       route: '/admin/announcements',  bg: '#EDE9FE', color: '#7C3AED', category: 'Living & Bills' },
  { id: 'parking',      emoji: '🅿️', icon: 'car-outline',              label: 'Parking Slots', route: '/parking',              bg: '#E0E7FF', color: '#4338CA', category: 'Living & Bills' },
  { id: 'events',       emoji: '📅', icon: 'calendar-outline',         label: 'Events & Passes',route: '/tabs/events',          bg: '#EEF2FF', color: '#4F46E5', category: 'Social & Sports' },
  { id: 'trips',        emoji: '🧭', icon: 'compass-outline',          label: 'Community Trips',route: '/trips',               bg: '#CCFBF1', color: '#0D9488', category: 'Social & Sports' },
  { id: 'discover',     emoji: '✨', icon: 'sparkles-outline',         label: 'Discover',      route: '/discover',             bg: '#EDE9FE', color: '#7C3AED', category: 'Social & Sports' },
  { id: 'polls',        emoji: '📊', icon: 'bar-chart-outline',        label: 'Polls & Votes', route: '/polls',                bg: '#EDE9FE', color: '#7C3AED', category: 'Social & Sports' },
  { id: 'pets',         emoji: '🐾', icon: 'paw-outline',              label: 'Pet Care',      route: '/pets',                 bg: '#F3E8FF', color: '#9333EA', category: 'Social & Sports' },
  { id: 'market',       emoji: '🏪', icon: 'storefront-outline',       label: 'Marketplace',   route: '/tabs/marketplace',     bg: '#D1FAE5', color: '#059669', category: 'Commerce & Food' },
  { id: 'food',         emoji: '🍽️', icon: 'restaurant-outline',       label: 'Food & Kitchen',route: '/food',                 bg: '#FFE4E6', color: '#E11D48', category: 'Commerce & Food' },
  { id: 'auction',      emoji: '🏷️', icon: 'pricetag-outline',         label: 'Sports Auction',route: '/auction',              bg: '#ECFDF5', color: '#10B981', category: 'Commerce & Food' },
  { id: 'facilities',   emoji: '🏋️', icon: 'fitness-outline',          label: 'Amenities',     route: '/facilities',           bg: '#CCFBF1', color: '#0D9488', category: 'Facilities' },
];

const CATEGORY_ICONS: Record<QuickActionItem['category'], keyof typeof Ionicons.glyphMap> = {
  'Safety & Help':   'shield-checkmark-outline',
  'Living & Bills':  'home-outline',
  'Social & Sports': 'people-outline',
  'Commerce & Food': 'bag-handle-outline',
  'Facilities':      'fitness-outline',
};

export function QuickActions() {
  const router = useRouter();
  const [showAllModal, setShowAllModal] = useState(false);

  // Show top 4 in a row on the main dashboard, all others in See All modal
  const highlightedServices = ALL_COMMUNITY_SERVICES.slice(0, 4);

  const categories: Array<QuickActionItem['category']> = [
    'Safety & Help',
    'Living & Bills',
    'Social & Sports',
    'Commerce & Food',
    'Facilities',
  ];

  return (
    <View style={s.wrapper}>
      {/* Section Header */}
      <View style={s.headerRow}>
        <Text style={s.heading}>Community Services</Text>
        <TouchableOpacity
          style={s.seeAllBtn}
          onPress={() => setShowAllModal(true)}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Text style={s.seeAll}>See All ({ALL_COMMUNITY_SERVICES.length}) →</Text>
        </TouchableOpacity>
      </View>

      {/* Row of 4 Primary Services */}
      <View style={s.rowContainer}>
        {highlightedServices.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={s.card}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.75}
          >
            {action.badge && (
              <View style={s.badgePill}>
                <Text style={s.badgePillText}>{action.badge}</Text>
              </View>
            )}
            <View style={[s.iconBox, { backgroundColor: action.bg }]}>
              <Text style={s.emojiIcon}>{action.emoji}</Text>
            </View>
            <Text style={s.label} numberOfLines={1}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Full Services Hub Modal */}
      <Modal visible={showAllModal} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalContainer}>
          {/* Modal Header with gradient */}
          <LinearGradient
            colors={['#4338CA', '#4F46E5', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.modalHeader}
          >
            <View style={s.modalHeaderDecCircle} />
            <View>
              <Text style={s.modalTitle}>Community Hub</Text>
              <Text style={s.modalSub}>{ALL_COMMUNITY_SERVICES.length} services & amenities</Text>
            </View>
            <TouchableOpacity
              style={s.closeButton}
              onPress={() => setShowAllModal(false)}
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView contentContainerStyle={s.modalScroll} showsVerticalScrollIndicator={false}>
            {categories.map((cat) => {
              const items = ALL_COMMUNITY_SERVICES.filter((item) => item.category === cat);
              return (
                <View key={cat} style={s.categorySection}>
                  <View style={s.categoryHeader}>
                    <View style={s.categoryIconWrap}>
                      <Ionicons name={CATEGORY_ICONS[cat]} size={14} color={COLORS.primary} />
                    </View>
                    <Text style={s.categoryTitle}>{cat}</Text>
                    <Text style={s.categoryCount}>{items.length}</Text>
                  </View>
                  <View style={s.modalGrid}>
                    {items.map((action) => (
                      <TouchableOpacity
                        key={action.id}
                        style={s.modalGridCard}
                        onPress={() => {
                          setShowAllModal(false);
                          router.push(action.route as any);
                        }}
                        activeOpacity={0.75}
                      >
                        {action.badge && (
                          <View style={s.modalBadgePill}>
                            <Text style={s.modalBadgePillText}>{action.badge}</Text>
                          </View>
                        )}
                        <View style={[s.modalIconBox, { backgroundColor: action.bg }]}>
                          <Text style={s.modalEmojiIcon}>{action.emoji}</Text>
                        </View>
                        <Text style={s.modalGridLabel} numberOfLines={1}>
                          {action.label}
                        </Text>
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
    paddingTop: 10,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 2,
  },
  heading: {
    fontSize: 17.5,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
    fontFamily: FONTS.displayBold,
  },
  seeAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
  },

  // ── Row of 4 items ──
  rowContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 8,
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
    ...SHADOWS.sm,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiIcon: {
    fontSize: 16,
    textAlign: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 13,
    color: COLORS.text,
    textAlign: 'center',
    fontFamily: FONTS.semiBold,
  },
  badgePill: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: RADIUS.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
    zIndex: 2,
  },
  badgePillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },

  // ── Modal styles ──
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  modalHeaderDecCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -60,
    right: -40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    fontFamily: FONTS.displayEB,
    letterSpacing: -0.4,
  },
  modalSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
    fontFamily: FONTS.regular,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 22,
  },
  categorySection: {
    gap: 10,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.1,
    fontFamily: FONTS.bold,
  },
  categoryCount: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modalGridCard: {
    width: '31%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 88,
    justifyContent: 'center',
    position: 'relative',
    ...SHADOWS.sm,
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  modalEmojiIcon: {
    fontSize: 20,
    textAlign: 'center',
  },
  modalGridLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 15,
    fontFamily: FONTS.bold,
  },
  modalBadgePill: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EF4444',
    borderRadius: RADIUS.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
    zIndex: 2,
  },
  modalBadgePillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
});

