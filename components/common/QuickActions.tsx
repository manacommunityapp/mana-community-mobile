import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  // Safety & Help
  { id: "emergency",        emoji: "🚨", icon: "alert-circle-outline",      label: "Emergency SOS", route: "/emergency",                bg: "#FEE2E2", color: "#DC2626", category: "Safety & Help",   badge: "24x7" },
  { id: "visitors",         emoji: "🛡️", icon: "shield-checkmark-outline", label: "Visitors Gate", route: "/visitors",                 bg: "#CFFAFE", color: "#0891B2", category: "Safety & Help" },
  { id: "turnstiles",       emoji: "🎟️", icon: "qr-code-outline",           label: "Turnstiles",    route: "/access/turnstiles",        bg: "#E0F2FE", color: "#0284C7", category: "Safety & Help" },
  { id: "helpdesk",         emoji: "🎧", icon: "headset-outline",           label: "Helpdesk",      route: "/helpdesk",                 bg: "#FEF3C7", color: "#D97706", category: "Safety & Help" },
  { id: "insta_help",       emoji: "⚡", icon: "flash-outline",             label: "Insta-Help",    route: "/services/insta-help",      bg: "#FEF3C7", color: "#D97706", category: "Safety & Help",   badge: "15m" },
  { id: "health",           emoji: "🩺", icon: "medkit-outline",            label: "Health",        route: "/health",                   bg: "#F0FDFA", color: "#0D9488", category: "Safety & Help" },
  { id: "health_buddy",     emoji: "🥗", icon: "nutrition-outline",         label: "Health Buddy", route: "/wellness",                  bg: "#D1FAE5", color: "#10B981", category: "Safety & Help",   badge: "NEW" },
  { id: "ai_chat",          emoji: "✨", icon: "sparkles-outline",          label: "Mana AI",       route: "/ai-chat",                  bg: "#EEF2FF", color: "#6366F1", category: "Safety & Help",   badge: "AI" },
  { id: "safety",           emoji: "🛡️", icon: "shield-half-outline",      label: "Safety Center", route: "/safety",                   bg: "#0F172A", color: "#0F172A", category: "Safety & Help",   badge: "NEW" },
  { id: "insurance",        emoji: "🛡️", icon: "shield-checkmark-outline", label: "Mana Insurance", route: "/insurance",               bg: "#EFF6FF", color: "#2563EB", category: "Safety & Help",   badge: "NEW" },
  { id: "home_services",    emoji: "🏠", icon: "hammer-outline",           label: "Home Services",  route: "/home-services",           bg: "#FEF9C3", color: "#A16207", category: "Safety & Help",   badge: "NEW" },

  // Living & Bills
  { id: "dues",             emoji: "💳", icon: "card-outline",              label: "Dues",          route: "/finance",                  bg: "#EEF2FF", color: "#4F46E5", category: "Living & Bills" },
  { id: "mana_pay",         emoji: "⚡", icon: "flash-outline",             label: "Mana Pay",      route: "/bbps",                     bg: "#EFF6FF", color: "#2563EB", category: "Living & Bills",  badge: "BBPS" },
  { id: "recharge",         emoji: "📱", icon: "phone-portrait-outline",     label: "Recharge",      route: "/recharge",                 bg: "#F0F9FF", color: "#0284C7", category: "Living & Bills",  badge: "NEW" },
  { id: "my_money",         emoji: "💰", icon: "wallet-outline",            label: "My Money",      route: "/personal-finance",         bg: "#ECFDF5", color: "#059669", category: "Living & Bills",  badge: "NEW" },
  { id: "society_treasury", emoji: "🏦", icon: "business-outline",          label: "Society ERP",   route: "/finance/society-dashboard",bg: "#EEF2FF", color: "#4F46E5", category: "Living & Bills",  badge: "ERP" },
  { id: "budget",           emoji: "📑", icon: "bar-chart-outline",        label: "Budgeting",     route: "/finance/budget",           bg: "#FFF7ED", color: "#EA580C", category: "Living & Bills" },
  { id: "parking",          emoji: "🅿️", icon: "car-outline",              label: "Parking Slots", route: "/parking",                  bg: "#E0E7FF", color: "#4338CA", category: "Living & Bills" },
  { id: "services",         emoji: "🛠️", icon: "construct-outline",        label: "Home Services", route: "/services",                 bg: "#FCE7F3", color: "#DB2777", category: "Living & Bills" },
  { id: "projects",         emoji: "🏗️", icon: "hammer-outline",            label: "Projects",      route: "/projects",                 bg: "#F5F3FF", color: "#7C3AED", category: "Living & Bills",  badge: "NEW" },
  { id: "cpos",             emoji: "🏠", icon: "home-outline",              label: "Property OS",   route: "/cpos",                     bg: "#DCFCE7", color: "#059669", category: "Living & Bills",  badge: "NEW" },

  // Facilities
  { id: "inventory",        emoji: "📦", icon: "cube-outline",              label: "Inventory",     route: "/inventory",                bg: "#FEF3C7", color: "#D97706", category: "Facilities",      badge: "NEW" },
  { id: "amc_maintenance",  emoji: "⚙️", icon: "construct-outline",        label: "AMCs & Assets", route: "/inventory/maintenance",    bg: "#F0FDF4", color: "#16A34A", category: "Facilities",      badge: "AMC" },
  { id: "automation",       emoji: "🤖", icon: "hardware-chip-outline",     label: "Smart Home",    route: "/automation",               bg: "#EDE9FE", color: "#7C3AED", category: "Facilities",      badge: "IoT" },
  { id: "submeters",        emoji: "⚡", icon: "speedometer-outline",       label: "Sub-Meters",    route: "/iot/meters",               bg: "#ECFDF5", color: "#059669", category: "Facilities" },
  { id: "facilities",       emoji: "🏋️", icon: "fitness-outline",          label: "Amenities",     route: "/facilities",               bg: "#CCFBF1", color: "#0D9488", category: "Facilities" },

  // Social & Sports
  { id: "sports",           emoji: "🏆", icon: "trophy-outline",            label: "Sports",        route: "/sports",                   bg: "#DCFCE7", color: "#059669", category: "Social & Sports" },
  { id: "events",           emoji: "📅", icon: "calendar-outline",         label: "Events & Passes",route: "/tabs/events",              bg: "#EEF2FF", color: "#4F46E5", category: "Social & Sports" },
  { id: "mobility",         emoji: "🚖", icon: "navigate-circle-outline",   label: "Mobility Hub",  route: "/mobility",                 bg: "#DBEAFE", color: "#2563EB", category: "Social & Sports", badge: "NEW" },
  { id: "commute",          emoji: "🚗", icon: "car-sport-outline",         label: "Commute",       route: "/commute",                  bg: "#CFFAFE", color: "#0284C7", category: "Social & Sports" },
  { id: "governance",       emoji: "🏛️", icon: "business-outline",          label: "Governance",    route: "/governance",               bg: "#EDE9FE", color: "#7C3AED", category: "Social & Sports", badge: "NEW" },
  { id: "academy",          emoji: "🎓", icon: "school-outline",            label: "Academy",       route: "/academy",                  bg: "#F3E8FF", color: "#9333EA", category: "Social & Sports", badge: "NEW" },
  { id: "jobs",             emoji: "📢", icon: "megaphone-outline",         label: "Job Board",     route: "/jobs",                     bg: "#F3E8FF", color: "#7C3AED", category: "Social & Sports", badge: "NEW" },
  { id: "cpn",              emoji: "💼", icon: "briefcase-outline",         label: "Pro Network",   route: "/cpn",                      bg: "#EFF6FF", color: "#2563EB", category: "Social & Sports", badge: "CPN" },
  { id: "trips",            emoji: "🧭", icon: "compass-outline",          label: "Community Trips",route: "/trips",                   bg: "#CCFBF1", color: "#0D9488", category: "Social & Sports" },
  { id: "polls",            emoji: "📊", icon: "bar-chart-outline",        label: "Polls & Votes", route: "/polls",                    bg: "#EDE9FE", color: "#7C3AED", category: "Social & Sports" },
  { id: "pets",             emoji: "🐾", icon: "paw-outline",              label: "Pet Care",      route: "/pets",                     bg: "#F3E8FF", color: "#9333EA", category: "Social & Sports" },

  // Commerce & Food
  { id: "market",           emoji: "🏪", icon: "storefront-outline",       label: "Marketplace",   route: "/tabs/marketplace",         bg: "#D1FAE5", color: "#059669", category: "Commerce & Food" },
  { id: "offers",           emoji: "🛍️", icon: "pricetag-outline",          label: "Offers",        route: "/offers",                   bg: "#FEF3C7", color: "#D97706", category: "Commerce & Food", badge: "NEW" },
  { id: "group_buying",     emoji: "👜", icon: "bag-handle-outline",         label: "Group Buy",     route: "/group-buying",             bg: "#ECFDF5", color: "#059669", category: "Commerce & Food" },
  { id: "lost_found",       emoji: "🔍", icon: "search-outline",           label: "Lost & Found",  route: "/marketplace/lost-found",   bg: "#FEF2F2", color: "#DC2626", category: "Commerce & Food" },
  { id: "donations",        emoji: "🎁", icon: "gift-outline",             label: "Give Away",     route: "/marketplace/donations",    bg: "#FDF2F8", color: "#DB2777", category: "Commerce & Food" },
  { id: "food",             emoji: "🍽️", icon: "restaurant-outline",       label: "Food & Kitchen",route: "/food",                     bg: "#FFE4E6", color: "#E11D48", category: "Commerce & Food" },
  { id: "auctions",         emoji: "🔨", icon: "hammer-outline",           label: "Auctions",      route: "/auction",                  bg: "#FEF3C7", color: "#B45309", category: "Commerce & Food", badge: "NEW" },
];

const CATEGORIES: Array<QuickActionItem["category"]> = [
  "Safety & Help",
  "Living & Bills",
  "Facilities",
  "Social & Sports",
  "Commerce & Food",
];

export function QuickActions() {
  const router = useRouter();
  const { trackClick } = useHubUsage();
  const [activeCategory, setActiveCategory] = useState<QuickActionItem["category"]>("Safety & Help");
  const [showAllInCategory, setShowAllInCategory] = useState(false);

  const categoryActions = useMemo(() => {
    return ALL_COMMUNITY_SERVICES.filter((a) => a.category === activeCategory);
  }, [activeCategory]);

  const hasOverflow = categoryActions.length > 8;
  const displayedActions = hasOverflow && !showAllInCategory
    ? categoryActions.slice(0, 7)
    : categoryActions;

  return (
    <View style={s.wrapper}>
      {/* ── Heading Row (Figma style) ── */}
      <View style={s.headerRow}>
        <Text style={s.heading}>Quick Actions</Text>
        <Text style={s.serviceCount}>{ALL_COMMUNITY_SERVICES.length} services</Text>
      </View>

      {/* ── Category Filter Pills (Horizontal Scroll) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.categoriesScroll}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => {
                setActiveCategory(cat);
                setShowAllInCategory(false);
              }}
              activeOpacity={0.75}
              style={[s.categoryChip, !isActive && s.categoryChipInactive]}
            >
              {isActive ? (
                <LinearGradient
                  colors={["#4F46E5", "#7C3AED"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.categoryChipActiveGradient}
                >
                  <Text style={s.categoryChipActiveText}>{cat}</Text>
                </LinearGradient>
              ) : (
                <Text style={s.categoryChipInactiveText}>{cat}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── 4-Column Quick Actions Grid Card ── */}
      <View style={s.gridCard}>
        <View style={s.grid}>
          {displayedActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={s.actionItem}
              onPress={() => {
                trackClick(action.id, action.label);
                router.push(action.route as any);
              }}
              activeOpacity={0.75}
            >
              {/* Squircle Icon Container */}
              <View
                style={[
                  s.iconSquircle,
                  {
                    backgroundColor: `${action.color}15`,
                    borderColor: `${action.color}25`,
                  },
                ]}
              >
                <Ionicons name={action.icon} size={17} color={action.color} />

                {/* Floating Badge */}
                {action.badge && (
                  <View style={[s.badgeTag, { backgroundColor: action.color }]}>
                    <Text style={s.badgeTagText}>{action.badge}</Text>
                  </View>
                )}
              </View>

              {/* Label */}
              <Text style={s.actionLabel} numberOfLines={2}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* ── 8th Div / End of Grid: See All / Show Less Tile ── */}
          {hasOverflow && (
            <TouchableOpacity
              style={s.actionItem}
              onPress={() => setShowAllInCategory((prev) => !prev)}
              activeOpacity={0.75}
            >
              <View style={[s.iconSquircle, s.moreIconSquircle]}>
                <Ionicons
                  name={showAllInCategory ? "chevron-up" : "grid-outline"}
                  size={16}
                  color="#4F46E5"
                />
              </View>
              <Text style={[s.actionLabel, s.moreLabel]} numberOfLines={2}>
                {showAllInCategory ? "Show less" : `See all\n(${categoryActions.length})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: "#475569",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  serviceCount: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: "#64748B",
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  categoryChipInactive: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  categoryChipInactiveText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: "#64748B",
  },
  categoryChipActiveGradient: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  categoryChipActiveText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: "#FFFFFF",
  },
  gridCard: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E8F0",
    paddingHorizontal: 8,
    paddingVertical: 8,
    ...SHADOWS.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  actionItem: {
    width: "25%",
    alignItems: "center",
    gap: 3,
  },
  iconSquircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badgeTag: {
    position: "absolute",
    top: -4,
    right: -5,
    paddingHorizontal: 4,
    paddingVertical: 0.5,
    borderRadius: RADIUS.full,
  },
  badgeTagText: {
    fontSize: 7,
    fontFamily: FONTS.displayBold,
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.1,
  },
  actionLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 11.5,
    paddingHorizontal: 1,
    height: 23,
  },
  moreIconSquircle: {
    backgroundColor: "#EEF2FF",
    borderColor: "#C7D2FE",
  },
  moreLabel: {
    color: "#4F46E5",
    fontFamily: FONTS.semiBold,
  },
});