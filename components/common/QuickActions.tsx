import { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS, RADIUS, SHADOWS, FONTS } from "@/constants/config";
import { useHubUsage } from "../../hooks/useHubUsage";

export interface QuickActionItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  emoji: string;
  label: string;
  route: string;
  bg: string;
  color: string;
  category: "Safety & Help" | "Living & Bills" | "Social & Sports" | "Commerce & Food" | "Facilities";
  badge?: string;
}

export const ALL_COMMUNITY_SERVICES: QuickActionItem[] = [
  // Primary Highlighted Services
  { id: "health",           emoji: "🩺", icon: "medkit-outline",            label: "Health",        route: "/health",                   bg: "#F0FDFA", color: "#0D9488", category: "Safety & Help",   badge: "NEW" },
  { id: "my_money",         emoji: "💰", icon: "wallet-outline",            label: "My Money",      route: "/personal-finance",         bg: "#ECFDF5", color: "#059669", category: "Living & Bills",  badge: "NEW" },
  { id: "dues",             emoji: "💳", icon: "card-outline",              label: "Dues",          route: "/finance",                  bg: "#EEF2FF", color: "#4F46E5", category: "Living & Bills" },
  { id: "society_treasury", emoji: "🏦", icon: "business-outline",          label: "Society ERP",   route: "/finance/society-dashboard",bg: "#EEF2FF", color: "#4F46E5", category: "Living & Bills",  badge: "ERP" },
  { id: "budget",           emoji: "📑", icon: "bar-chart-outline",        label: "Budgeting",     route: "/finance/budget",           bg: "#FFF7ED", color: "#EA580C", category: "Living & Bills" },
  { id: "inventory",        emoji: "📦", icon: "cube-outline",              label: "Inventory",     route: "/inventory",                bg: "#FEF3C7", color: "#D97706", category: "Facilities",      badge: "NEW" },
  { id: "amc_maintenance",  emoji: "⚙️", icon: "construct-outline",        label: "AMCs & Assets", route: "/inventory/maintenance",    bg: "#F0FDF4", color: "#16A34A", category: "Facilities",      badge: "AMC" },
  { id: "projects",         emoji: "🏗️", icon: "hammer-outline",            label: "Projects",      route: "/projects",                 bg: "#F5F3FF", color: "#7C3AED", category: "Living & Bills",  badge: "NEW" },
  { id: "group_buying",     emoji: "👜", icon: "bag-handle-outline",         label: "Group Buy",     route: "/group-buying",             bg: "#ECFDF5", color: "#059669", category: "Commerce & Food" },
  { id: "offers",           emoji: "🛍️", icon: "pricetag-outline",          label: "Offers",        route: "/offers",                   bg: "#FEF3C7", color: "#D97706", category: "Commerce & Food", badge: "NEW" },
  { id: "emergency",        emoji: "🚨", icon: "alert-circle-outline",      label: "Emergency SOS", route: "/emergency",                bg: "#FEE2E2", color: "#DC2626", category: "Safety & Help",   badge: "24x7" },
  { id: "ai_chat",          emoji: "✨", icon: "sparkles-outline",          label: "Mana AI",       route: "/ai-chat",                  bg: "#EEF2FF", color: "#6366F1", category: "Safety & Help",   badge: "AI" },
  { id: "visitors",         emoji: "🛡️", icon: "shield-checkmark-outline", label: "Visitors Gate", route: "/visitors",                 bg: "#CFFAFE", color: "#0891B2", category: "Safety & Help" },
  { id: "sports",           emoji: "🏆", icon: "trophy-outline",            label: "Sports",        route: "/sports",                   bg: "#DCFCE7", color: "#059669", category: "Social & Sports" },
  { id: "commute",          emoji: "🚗", icon: "car-sport-outline",         label: "Commute",       route: "/commute",                  bg: "#CFFAFE", color: "#0284C7", category: "Social & Sports" },
  { id: "governance",       emoji: "🏛️", icon: "business-outline",          label: "Governance",    route: "/governance",               bg: "#EDE9FE", color: "#7C3AED", category: "Social & Sports", badge: "NEW" },
  { id: "academy",          emoji: "🎓", icon: "school-outline",            label: "Academy",       route: "/academy",                  bg: "#F3E8FF", color: "#7C3AED", category: "Social & Sports", badge: "NEW" },
  { id: "cpos",             emoji: "🏠", icon: "home-outline",              label: "Property OS",   route: "/cpos",                     bg: "#DCFCE7", color: "#059669", category: "Living & Bills",  badge: "NEW" },
  { id: "jobs",             emoji: "💼", icon: "briefcase-outline",         label: "CPN Jobs",      route: "/cpn",                      bg: "#EFF6FF", color: "#2563EB", category: "Social & Sports", badge: "NEW" },
  { id: "helpdesk",         emoji: "🎧", icon: "headset-outline",           label: "Helpdesk",      route: "/helpdesk",                 bg: "#FEF3C7", color: "#D97706", category: "Safety & Help" },
  { id: "services",         emoji: "🛠️", icon: "construct-outline",        label: "Home Services", route: "/services",                 bg: "#FCE7F3", color: "#DB2777", category: "Living & Bills" },
  { id: "parking",          emoji: "🅿️", icon: "car-outline",              label: "Parking Slots", route: "/parking",                  bg: "#E0E7FF", color: "#4338CA", category: "Living & Bills" },
  { id: "events",           emoji: "📅", icon: "calendar-outline",         label: "Events & Passes",route: "/tabs/events",              bg: "#EEF2FF", color: "#4F46E5", category: "Social & Sports" },
  { id: "trips",            emoji: "🧭", icon: "compass-outline",          label: "Community Trips",route: "/trips",                   bg: "#CCFBF1", color: "#0D9488", category: "Social & Sports" },
  { id: "polls",            emoji: "📊", icon: "bar-chart-outline",        label: "Polls & Votes", route: "/polls",                    bg: "#EDE9FE", color: "#7C3AED", category: "Social & Sports" },
  { id: "pets",             emoji: "🐾", icon: "paw-outline",              label: "Pet Care",      route: "/pets",                     bg: "#F3E8FF", color: "#9333EA", category: "Social & Sports" },
  { id: "market",           emoji: "🏪", icon: "storefront-outline",       label: "Marketplace",   route: "/tabs/marketplace",         bg: "#D1FAE5", color: "#059669", category: "Commerce & Food" },
  { id: "lost_found",       emoji: "🔍", icon: "search-outline",           label: "Lost & Found",  route: "/marketplace/lost-found",   bg: "#FEF2F2", color: "#DC2626", category: "Commerce & Food" },
  { id: "donations",        emoji: "🎁", icon: "gift-outline",             label: "Give Away",     route: "/marketplace/donations",    bg: "#FDF2F8", color: "#DB2777", category: "Commerce & Food" },
  { id: "food",             emoji: "🍽️", icon: "restaurant-outline",       label: "Food & Kitchen",route: "/food",                     bg: "#FFE4E6", color: "#E11D48", category: "Commerce & Food" },
  { id: "facilities",       emoji: "🏋️", icon: "fitness-outline",          label: "Amenities",     route: "/facilities",               bg: "#CCFBF1", color: "#0D9488", category: "Facilities" },
  { id: "safety",           emoji: "🛡️", icon: "shield-half-outline",      label: "Safety Center", route: "/safety",                   bg: "#0F172A", color: "#F8FAFC", category: "Safety & Help",   badge: "NEW" },
];

function getBadgeBg(badge?: string): string {
  switch (badge) {
    case 'NEW': return '#DCFCE7';
    case 'ERP': return '#EDE9FE';
    case 'AMC': return '#FEF3C7';
    case '24x7': return '#FEE2E2';
    case 'AI': return '#EEF2FF';
    default: return '#F1F5F9';
  }
}

export function QuickActions() {
  const router = useRouter();
  const [showAllModal, setShowAllModal] = useState(false);
  const { topHubIds, trackClick } = useHubUsage();

  const highlightedServices = useMemo(() => {
    if (topHubIds.length === 0) return ALL_COMMUNITY_SERVICES.slice(0, 5);
    const personalized = topHubIds
      .map(id => ALL_COMMUNITY_SERVICES.find(s => s.id === id))
      .filter(Boolean) as QuickActionItem[];
    if (personalized.length >= 5) return personalized.slice(0, 5);
    const remaining = ALL_COMMUNITY_SERVICES.filter(s => !topHubIds.includes(s.id));
    return [...personalized, ...remaining].slice(0, 5);
  }, [topHubIds]);

  const categories: Array<QuickActionItem["category"]> = [
    "Safety & Help",
    "Living & Bills",
    "Social & Sports",
    "Commerce & Food",
    "Facilities",
  ];

  return (
    <View style={s.wrapper}>
      <View style={s.headerRow}>
        <Text style={s.heading}>Community Hubs</Text>
        <TouchableOpacity
          style={s.seeAllBtn}
          onPress={() => setShowAllModal(true)}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Text style={s.seeAll}>All Hubs ({ALL_COMMUNITY_SERVICES.length}) →</Text>
        </TouchableOpacity>
      </View>

      <View style={s.rowContainer}>
        {highlightedServices.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={s.card}
            onPress={() => {
              trackClick(action.id, action.label);
              router.push(action.route as any);
            }}
            activeOpacity={0.8}
          >
            {action.badge && (
              <View style={[s.badgePill, { backgroundColor: getBadgeBg(action.badge) }]}>
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

      <Modal
        visible={showAllModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAllModal(false)}
      >
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <View style={s.modalHeaderTitleRow}>
              <View style={s.brandDot} />
              <Text style={s.modalTitle}>All Community Services</Text>
            </View>
            <TouchableOpacity
              style={s.closeBtn}
              onPress={() => setShowAllModal(false)}
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalScroll} showsVerticalScrollIndicator={false}>
            {categories.map((cat) => {
              const items = ALL_COMMUNITY_SERVICES.filter((a) => a.category === cat);
              if (!items.length) return null;
              return (
                <View key={cat} style={s.catBlock}>
                  <Text style={s.catTitle}>{cat}</Text>
                  <View style={s.catGrid}>
                    {items.map((action) => (
                      <TouchableOpacity
                        key={action.id}
                        style={s.gridCard}
                        onPress={() => {
                          trackClick(action.id, action.label);
                          setShowAllModal(false);
                          setTimeout(() => router.push(action.route as any), 200);
                        }}
                        activeOpacity={0.78}
                      >
                        {action.badge && (
                          <View style={[s.badgePill, { backgroundColor: getBadgeBg(action.badge) }]}>
                            <Text style={s.badgePillText}>{action.badge}</Text>
                          </View>
                        )}
                        <View style={[s.gridIconBox, { backgroundColor: action.bg }]}>
                          <Text style={s.gridEmoji}>{action.emoji}</Text>
                        </View>
                        <Text style={s.gridLabel} numberOfLines={2}>
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
    paddingTop: 8,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 2,
  },
  heading: {
    fontSize: 16.5,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.3,
    fontFamily: FONTS.displayBold,
  },
  seeAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  seeAll: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  rowContainer: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 8,
    justifyContent: "space-between",
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: RADIUS.lg,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    position: "relative",
    ...SHADOWS.card,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiIcon: {
    fontSize: 18,
    textAlign: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    fontFamily: FONTS.medium,
  },
  badgePill: {
    position: "absolute",
    top: 4,
    right: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeNew: { backgroundColor: "#DCFCE7" },
  badge247: { backgroundColor: "#FEE2E2" },
  badgeAi:  { backgroundColor: "#EEF2FF" },
  badgePillText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  modalHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    padding: 16,
    gap: 20,
  },
  catBlock: {
    gap: 10,
  },
  catTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontFamily: FONTS.semiBold,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridCard: {
    width: "31%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 6,
    position: "relative",
    ...SHADOWS.card,
  },
  gridIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  gridEmoji: {
    fontSize: 22,
  },
  gridLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    fontFamily: FONTS.medium,
  },
});