import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS, FONTS } from '@/constants/config';

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
  { id: 'emergency', icon: 'alert-circle-outline', label: 'Emergency SOS', route: '/emergency', bg: '#FEE2E2', color: '#DC2626', category: 'Safety & Help', badge: '24x7' },
  { id: 'helpdesk', icon: 'headset-outline', label: 'Helpdesk', route: '/helpdesk', bg: '#FEF3C7', color: '#D97706', category: 'Safety & Help' },
  { id: 'visitors', icon: 'shield-checkmark-outline', label: 'Visitors Gate', route: '/visitors', bg: '#CFFAFE', color: '#0891B2', category: 'Safety & Help' },

  // Living & Essentials
  { id: 'dues', icon: 'card-outline', label: 'Dues', route: '/finance', bg: '#EEF2FF', color: '#4F46E5', category: 'Living & Bills', badge: 'Bills' },
  { id: 'services', icon: 'construct-outline', label: 'Home Services', route: '/services', bg: '#FCE7F3', color: '#DB2777', category: 'Living & Bills' },
  { id: 'notices', icon: 'megaphone-outline', label: 'Notices', route: '/admin/announcements', bg: '#EDE9FE', color: '#7C3AED', category: 'Living & Bills' },
  { id: 'parking', icon: 'car-outline', label: 'Parking Slots', route: '/parking', bg: '#E0E7FF', color: '#4338CA', category: 'Living & Bills' },
  { id: 'cpos', icon: 'home-outline', label: 'Property', route: '/cpos', bg: '#DCFCE7', color: '#059669', category: 'Living & Bills', badge: 'NEW' },

  // Social & Community
  { id: 'events', icon: 'calendar-outline', label: 'Events & Passes', route: '/tabs/events', bg: '#EEF2FF', color: '#4F46E5', category: 'Social & Sports' },
  { id: 'sports', icon: 'trophy-outline', label: 'Sports', route: '/sports', bg: '#DCFCE7', color: '#059669', category: 'Social & Sports' },
  { id: 'trips', icon: 'compass-outline', label: 'Community Trips', route: '/trips', bg: '#CCFBF1', color: '#0D9488', category: 'Social & Sports' },
  { id: 'discover', icon: 'sparkles-outline', label: 'Discover', route: '/discover', bg: '#EDE9FE', color: '#7C3AED', category: 'Social & Sports' },
  { id: 'governance', icon: 'business-outline', label: 'Governance', route: '/governance', bg: '#EDE9FE', color: '#7C3AED', category: 'Social & Sports', badge: 'NEW' },
  { id: 'academy', icon: 'school-outline', label: 'Academy', route: '/academy', bg: '#F3E8FF', color: '#7C3AED', category: 'Social & Sports', badge: 'NEW' },
  { id: 'polls', icon: 'bar-chart-outline', label: 'Polls & Votes', route: '/polls', bg: '#EDE9FE', color: '#7C3AED', category: 'Social & Sports' },
  { id: 'jobs', icon: 'briefcase-outline', label: 'CPN Jobs', route: '/cpn', bg: '#EFF6FF', color: '#2563EB', category: 'Social & Sports', badge: 'NEW' },
  { id: 'commute', icon: 'car-sport-outline', label: 'Commute', route: '/commute', bg: '#CFFAFE', color: '#0284C7', category: 'Social & Sports' },
  { id: 'pets', icon: 'paw-outline', label: 'Pet Care', route: '/pets', bg: '#F3E8FF', color: '#9333EA', category: 'Social & Sports' },

  // Commerce & Food
  { id: 'offers', icon: 'pricetag-outline', label: 'Offers', route: '/offers', bg: '#FEF3C7', color: '#D97706', category: 'Commerce & Food', badge: 'NEW' },
  { id: 'market', icon: 'storefront-outline', label: 'Marketplace', route: '/tabs/marketplace', bg: '#D1FAE5', color: '#059669', category: 'Commerce & Food' },
  { id: 'group_buying', icon: 'bag-handle-outline', label: 'Group Buy', route: '/group-buying', bg: '#ECFDF5', color: '#059669', category: 'Commerce & Food' },
  { id: 'food', icon: 'restaurant-outline', label: 'Food & Kitchen', route: '/food', bg: '#FFE4E6', color: '#E11D48', category: 'Commerce & Food' },
  { id: 'auction', icon: 'pricetag-outline', label: 'Sports Auction', route: '/auction', bg: '#ECFDF5', color: '#10B981', category: 'Commerce & Food' },

  // Facilities
  { id: 'facilities', icon: 'fitness-outline', label: 'Amenities Booking', route: '/facilities', bg: '#CCFBF1', color: '#0D9488', category: 'Facilities' },
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

  const highlightedServices = [
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'dues')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'offers')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'group_buying')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'sports')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'governance')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'academy')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'cpos')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'jobs')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'helpdesk')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'visitors')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'facilities')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'food')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'trips')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'commute')!,
    ALL_COMMUNITY_SERVICES.find((s) => s.id === 'pets')!,
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
        <TouchableOpacity
          style={s.seeAllBtn}
          onPress={() => setShowAllModal(true)}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Text style={s.seeAll}>All {ALL_COMMUNITY_SERVICES.length}</Text>
          <Ionicons name="grid-outline" size={12} color={COLORS.primary} />
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
              <Ionicons name={action.icon} size={20} color={action.color} />
              {action.badge && (
                <View style={[s.miniBadge, { backgroundColor: action.color }]}>
                  <Text style={s.miniBadgeText}>{action.badge}</Text>
                </View>
              )}
            </View>
            <Text style={s.label} numberOfLines={2}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
                  <View style={s.grid}>
                    {items.map((action) => (
                      <TouchableOpacity
                        key={action.id}
                        style={s.gridCard}
                        onPress={() => {
                          setShowAllModal(false);
                          router.push(action.route as any);
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={[s.gridIconCircle, { backgroundColor: action.bg }]}>
                          <Ionicons name={action.icon} size={22} color={action.color} />
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
    paddingTop: 8,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 16.5,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.2,
    fontFamily: FONTS.displayBold,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  scroll: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    gap: 3,
  },
  item: {
    alignItems: 'center',
    width: 58,
    gap: 3,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...SHADOWS.sm,
  },
  miniBadge: {
    position: 'absolute',
    top: -3,
    right: -4,
    borderRadius: RADIUS.full,
    paddingHorizontal: 3.5,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  miniBadgeText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '800',
    fontFamily: FONTS.bold,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 13,
    fontFamily: FONTS.semiBold,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    width: '31%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 96,
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  gridIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: FONTS.bold,
  },
  gridBadge: {
    marginTop: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gridBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: FONTS.bold,
  },
});
