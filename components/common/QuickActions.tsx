import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { COLORS, RADIUS, SHADOWS, FONTS } from "@/constants/config";
import { useHubUsage } from "../../hooks/useHubUsage";
import { useAuth } from "@/hooks/useAuth";

/**
 * Maps a QuickActionItem.id → the community enabledModules[] keys that must be present
 * for this tile to be visible. If an ID has NO entry here, the tile is always visible.
 * If enabledModules is empty/undefined (no restrictions set by backend), everything shows.
 */
const MODULE_KEYS: Record<string, string[]> = {
  // Bills & Wealth
  dues:             ["FINANCE_MGMT", "MANA_PAY"],
  auto_debit:       ["FINANCE_MGMT", "MANA_PAY"],
  mana_pay:         ["MANA_PAY", "PAYMENTS"],
  recharge:         ["MANA_PAY", "PAYMENTS"],
  scan_pay:         ["MANA_PAY", "PAYMENTS"],
  send_money:       ["MANA_PAY", "PAYMENTS"],
  fd:               ["PERSONAL_FINANCE", "FINANCE_MGMT"],
  gold:             ["PERSONAL_FINANCE"],
  mutual_funds:     ["PERSONAL_FINANCE"],
  loans:            ["PERSONAL_FINANCE"],
  split_bill:       ["MANA_PAY", "PAYMENTS"],
  my_money:         ["PERSONAL_FINANCE", "FINANCE_MGMT"],
  upi_history:      ["MANA_PAY", "PAYMENTS"],
  society_treasury: ["FINANCE_MGMT"],
  budget:           ["FINANCE_MGMT"],

  // Facilities & Living
  calendar:         ["CALENDAR", "EVENTS"],
  vehicle_care:     ["HOME_SERVICES"],
  cpos:             ["CPOS"],
  projects:         ["CPOS", "FINANCE_MGMT"],
  inventory:        ["CPOS", "FINANCE_MGMT"],
  amc_maintenance:  ["CPOS", "HOME_SERVICES"],
  automation:       ["HOME_SERVICES"],
  submeters:        ["HOME_SERVICES"],

  // Social & Sports
  sports:           ["SPORTS"],
  events:           ["EVENTS"],
  movies:           ["ENTERTAINMENT"],
  trips:            ["EVENTS"],
  polls:            ["POLLS"],
  governance:       ["GOVERNANCE"],
  jobs:             ["JOBS"],
  cpn:              ["JOBS"],

  // Commerce & Food
  food:             ["FOOD_OS"],
  group_buying:     ["GROUP_BUYING"],
  auctions:         ["MARKETPLACE"],

  // Safety & Help
  healthguard:      ["HEALTH"],
  cctv:             ["SAFETY", "VISITORS"],
  broadcast:        ["ADMIN_HUB"],
  turnstiles:       ["VISITORS", "SAFETY"],
  school_bus:       ["VISITORS"],
};

export interface QuickActionItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  emoji: string;
  label: string;
  route: string;
  bg: string;
  color: string;
  category: "Safety & Help" | "Bills & Wealth" | "Facilities & Living" | "Social & Sports" | "Commerce & Food";
  badge?: string;
}

export const ALL_COMMUNITY_SERVICES: QuickActionItem[] = [
  // Safety & Help
  { id: "emergency",        emoji: "🚨", icon: "alert-circle-outline",      label: "Emergency SOS",  route: "/emergency",               bg: "#FEE2E2", color: "#DC2626", category: "Safety & Help",       badge: "24x7" },
  { id: "visitors",         emoji: "🛡️", icon: "shield-checkmark-outline", label: "Visitors Gate",  route: "/visitors",                bg: "#CFFAFE", color: "#0891B2", category: "Safety & Help" },
  { id: "staff",            emoji: "👨‍🍳", icon: "people-outline",           label: "Domestic Staff", route: "/staff",                   bg: "#F5F3FF", color: "#7C3AED", category: "Safety & Help" },
  { id: "school_bus",       emoji: "🚌", icon: "bus-outline",               label: "School Bus",     route: "/school-bus",              bg: "#FEF3C7", color: "#D97706", category: "Safety & Help",       badge: "LIVE" },
  { id: "turnstiles",       emoji: "🚪", icon: "hardware-chip-outline",     label: "Smart Gates",   route: "/access/turnstiles",        bg: "#E0F2FE", color: "#0284C7", category: "Safety & Help",       badge: "BIOMETRIC" },
  { id: "helpdesk",         emoji: "🎧", icon: "headset-outline",           label: "Helpdesk",      route: "/helpdesk",                 bg: "#FEF3C7", color: "#D97706", category: "Safety & Help" },
  { id: "insta_help",       emoji: "⚡", icon: "flash-outline",             label: "Insta-Help",    route: "/services/insta-help",      bg: "#FEF3C7", color: "#D97706", category: "Safety & Help",       badge: "15m" },
  { id: "health",           emoji: "🩺", icon: "medkit-outline",            label: "Health",        route: "/health",                   bg: "#F0FDFA", color: "#0D9488", category: "Safety & Help" },
  { id: "health_buddy",     emoji: "🥗", icon: "nutrition-outline",         label: "Health Buddy", route: "/wellness",                  bg: "#D1FAE5", color: "#10B981", category: "Safety & Help",       badge: "NEW" },
  { id: "healthguard",      emoji: "🚨", icon: "medical-outline",           label: "HealthGuard",   route: "/healthguard",              bg: "#FEE2E2", color: "#DC2626", category: "Safety & Help",       badge: "SOS" },
  { id: "ai_chat",          emoji: "✨", icon: "sparkles-outline",          label: "Mana AI",       route: "/ai-chat",                  bg: "#EEF2FF", color: "#6366F1", category: "Safety & Help",       badge: "AI" },
  { id: "safety",           emoji: "🛡️", icon: "shield-half-outline",      label: "Safety Center", route: "/safety",                   bg: "#0F172A", color: "#0F172A", category: "Safety & Help",       badge: "NEW" },
  { id: "insurance",        emoji: "🛡️", icon: "shield-checkmark-outline", label: "Mana Insurance", route: "/insurance",               bg: "#EFF6FF", color: "#2563EB", category: "Safety & Help",       badge: "NEW" },
  { id: "home_services",    emoji: "🏠", icon: "hammer-outline",           label: "Home Services",  route: "/home-services",           bg: "#FEF9C3", color: "#A16207", category: "Safety & Help",       badge: "NEW" },
  { id: "cctv",             emoji: "📷", icon: "videocam-outline",           label: "CCTV Monitor",   route: "/guard/cctv",               bg: "#0F172A", color: "#94A3B8", category: "Safety & Help" },
  { id: "directory",        emoji: "📋", icon: "people-circle-outline",      label: "Residents",      route: "/community/directory",      bg: "#EEF2FF", color: "#6366F1", category: "Safety & Help" },
  { id: "broadcast",        emoji: "📢", icon: "megaphone-outline",          label: "Broadcast",      route: "/admin/broadcast",          bg: "#FEE2E2", color: "#DC2626", category: "Safety & Help" },

  // Bills & Wealth
  { id: "dues",             emoji: "💳", icon: "card-outline",              label: "Dues",          route: "/finance",                  bg: "#EEF2FF", color: "#4F46E5", category: "Bills & Wealth" },
  { id: "auto_debit",       emoji: "🔄", icon: "repeat-outline",             label: "Auto-Pay",       route: "/payments/auto-debit",      bg: "#D1FAE5", color: "#059669", category: "Bills & Wealth",       badge: "NACH" },
  { id: "mana_pay",         emoji: "⚡", icon: "flash-outline",             label: "Mana Pay",      route: "/bbps",                     bg: "#EFF6FF", color: "#2563EB", category: "Bills & Wealth",       badge: "BBPS" },
  { id: "recharge",         emoji: "📱", icon: "phone-portrait-outline",     label: "Recharge",      route: "/recharge",                 bg: "#F0F9FF", color: "#0284C7", category: "Bills & Wealth",       badge: "NEW" },
  { id: "scan_pay",         emoji: "📷", icon: "qr-code-outline",           label: "Scan & Pay",    route: "/scan-and-pay",             bg: "#EFF6FF", color: "#2563EB", category: "Bills & Wealth",       badge: "UPI" },
  { id: "send_money",       emoji: "💸", icon: "paper-plane-outline",       label: "Send Money",    route: "/send-money",               bg: "#ECFDF5", color: "#059669", category: "Bills & Wealth",       badge: "P2P" },
  { id: "fd",               emoji: "🏦", icon: "business-outline",          label: "Fixed Deposit", route: "/fd",                       bg: "#EFF6FF", color: "#1D4ED8", category: "Bills & Wealth",       badge: "8.5%" },
  { id: "gold",             emoji: "🪙", icon: "sparkles-outline",          label: "Digital Gold",  route: "/gold",                     bg: "#FFFBEB", color: "#D97706", category: "Bills & Wealth",       badge: "24K" },
  { id: "mutual_funds",     emoji: "📈", icon: "trending-up-outline",       label: "Mutual Funds",  route: "/mutual-funds",             bg: "#F0FDF4", color: "#16A34A", category: "Bills & Wealth",       badge: "SIP" },
  { id: "loans",            emoji: "💰", icon: "cash-outline",              label: "Quick Loans",   route: "/loans",                    bg: "#FEF2F2", color: "#DC2626", category: "Bills & Wealth",       badge: "Pre-Appr" },
  { id: "split_bill",       emoji: "🍰", icon: "pie-chart-outline",         label: "Mana Split",    route: "/split-bill",               bg: "#F5F3FF", color: "#7C3AED", category: "Bills & Wealth",       badge: "NEW" },
  { id: "my_money",         emoji: "👛", icon: "wallet-outline",            label: "My Money",      route: "/personal-finance",         bg: "#ECFDF5", color: "#059669", category: "Bills & Wealth",       badge: "NEW" },
  { id: "upi_history",      emoji: "📜", icon: "receipt-outline",           label: "UPI Ledger",    route: "/upi-history",              bg: "#F1F5F9", color: "#475569", category: "Bills & Wealth" },
  { id: "society_treasury", emoji: "🏛️", icon: "business-outline",          label: "Society ERP",   route: "/finance/society-dashboard",bg: "#EEF2FF", color: "#4F46E5", category: "Bills & Wealth",       badge: "ERP" },
  { id: "budget",           emoji: "📑", icon: "bar-chart-outline",        label: "Budgeting",     route: "/finance/budget",           bg: "#FFF7ED", color: "#EA580C", category: "Bills & Wealth" },

  // Facilities & Living
  { id: "facilities",       emoji: "🏋️", icon: "fitness-outline",          label: "Bookings",      route: "/facilities",               bg: "#CCFBF1", color: "#0D9488", category: "Facilities & Living" },
  { id: "calendar",         emoji: "🗓️", icon: "calendar-outline",         label: "Master Calendar", route: "/calendar",              bg: "#EEF2FF", color: "#4F46E5", category: "Facilities & Living",  badge: "NEW" },
  { id: "notices",          emoji: "📢", icon: "newspaper-outline",        label: "Notices",       route: "/notices",                  bg: "#E0F2FE", color: "#0284C7", category: "Facilities & Living",  badge: "ACTIVE" },
  { id: "vehicle_care",     emoji: "🚗", icon: "car-sport-outline",         label: "Vehicle Care",  route: "/vehicle-care",             bg: "#EFF6FF", color: "#2563EB", category: "Facilities & Living",  badge: "WASH" },
  { id: "parking",          emoji: "🅿️", icon: "car-outline",              label: "Parking Slots", route: "/parking",                  bg: "#E0E7FF", color: "#4338CA", category: "Facilities & Living" },
  { id: "mobility",         emoji: "🚖", icon: "navigate-circle-outline",   label: "Mobility Hub",  route: "/mobility",                 bg: "#DBEAFE", color: "#2563EB", category: "Facilities & Living",  badge: "NEW" },
  { id: "commute",          emoji: "🚙", icon: "car-sport-outline",         label: "Commute",       route: "/commute",                  bg: "#CFFAFE", color: "#0284C7", category: "Facilities & Living" },
  { id: "cpos",             emoji: "🏠", icon: "home-outline",              label: "Property OS",   route: "/cpos",                     bg: "#DCFCE7", color: "#059669", category: "Facilities & Living",  badge: "CPOS" },
  { id: "services",         emoji: "🛠️", icon: "construct-outline",        label: "Home Services", route: "/services",                 bg: "#FCE7F3", color: "#DB2777", category: "Facilities & Living" },
  { id: "projects",         emoji: "🏗️", icon: "hammer-outline",            label: "Projects",      route: "/projects",                 bg: "#F5F3FF", color: "#7C3AED", category: "Facilities & Living",  badge: "NEW" },
  { id: "inventory",        emoji: "📦", icon: "cube-outline",              label: "Inventory",     route: "/inventory",                bg: "#FEF3C7", color: "#D97706", category: "Facilities & Living",  badge: "NEW" },
  { id: "amc_maintenance",  emoji: "⚙️", icon: "construct-outline",        label: "AMCs & Assets", route: "/inventory/maintenance",    bg: "#F0FDF4", color: "#16A34A", category: "Facilities & Living",  badge: "AMC" },
  { id: "automation",       emoji: "🤖", icon: "hardware-chip-outline",     label: "Smart Home",    route: "/automation",               bg: "#EDE9FE", color: "#7C3AED", category: "Facilities & Living",  badge: "IoT" },
  { id: "submeters",        emoji: "⚡", icon: "speedometer-outline",       label: "Sub-Meters",    route: "/iot/meters",               bg: "#ECFDF5", color: "#059669", category: "Facilities & Living" },

  // Social & Sports
  { id: "sports",           emoji: "🏆", icon: "trophy-outline",            label: "Sports",        route: "/sports",                   bg: "#DCFCE7", color: "#059669", category: "Social & Sports" },
  { id: "events",           emoji: "📅", icon: "calendar-outline",         label: "Events & Passes",route: "/tabs/events",              bg: "#EEF2FF", color: "#4F46E5", category: "Social & Sports" },
  { id: "movies",           emoji: "🎬", icon: "film-outline",              label: "Movie Night",   route: "/movies",                   bg: "#FEF2F2", color: "#E11D48", category: "Social & Sports",      badge: "CINEMA" },
  { id: "experiences",      emoji: "✨", icon: "ticket-outline",            label: "Experiences",   route: "/experiences",              bg: "#EDE9FE", color: "#7C3AED", category: "Social & Sports",      badge: "NEW" },
  { id: "governance",       emoji: "🏛️", icon: "business-outline",          label: "Governance",    route: "/governance",               bg: "#EDE9FE", color: "#7C3AED", category: "Social & Sports",      badge: "NEW" },
  { id: "academy",          emoji: "🎓", icon: "school-outline",            label: "Academy",       route: "/academy",                  bg: "#F3E8FF", color: "#9333EA", category: "Social & Sports",      badge: "NEW" },
  { id: "jobs",             emoji: "📢", icon: "megaphone-outline",         label: "Job Board",     route: "/jobs",                     bg: "#F3E8FF", color: "#7C3AED", category: "Social & Sports",      badge: "NEW" },
  { id: "cpn",              emoji: "💼", icon: "briefcase-outline",         label: "Pro Network",   route: "/cpn",                      bg: "#EFF6FF", color: "#2563EB", category: "Social & Sports",      badge: "CPN" },
  { id: "trips",            emoji: "🧭", icon: "compass-outline",          label: "Community Trips",route: "/trips",                   bg: "#CCFBF1", color: "#0D9488", category: "Social & Sports" },
  { id: "polls",            emoji: "📊", icon: "bar-chart-outline",        label: "Polls & Votes", route: "/polls",                    bg: "#EDE9FE", color: "#7C3AED", category: "Social & Sports" },
  { id: "pets",             emoji: "🐾", icon: "paw-outline",              label: "Pet Care",      route: "/pets",                     bg: "#F3E8FF", color: "#9333EA", category: "Social & Sports" },

  // Commerce & Food
  { id: "market",           emoji: "🏪", icon: "storefront-outline",       label: "Marketplace",   route: "/tabs/marketplace",         bg: "#D1FAE5", color: "#059669", category: "Commerce & Food" },
  { id: "offers",           emoji: "🛍️", icon: "pricetag-outline",          label: "Deals & Offers", route: "/offers",                   bg: "#FEF3C7", color: "#D97706", category: "Commerce & Food",      badge: "NEW" },
  { id: "group_buying",     emoji: "👜", icon: "bag-handle-outline",         label: "Group Buy",     route: "/group-buying",             bg: "#ECFDF5", color: "#059669", category: "Commerce & Food" },
  { id: "food",             emoji: "🍽️", icon: "restaurant-outline",       label: "Food & Kitchen",route: "/food",                     bg: "#FFE4E6", color: "#E11D48", category: "Commerce & Food" },
  { id: "auctions",         emoji: "🔨", icon: "hammer-outline",           label: "Auctions",      route: "/auction",                  bg: "#FEF3C7", color: "#B45309", category: "Commerce & Food",      badge: "NEW" },
  { id: "lost_found",       emoji: "🔍", icon: "search-outline",           label: "Lost & Found",  route: "/marketplace/lost-found",   bg: "#FEF2F2", color: "#DC2626", category: "Commerce & Food" },
  { id: "donations",        emoji: "🎁", icon: "gift-outline",             label: "Give Away",     route: "/marketplace/donations",    bg: "#FDF2F8", color: "#DB2777", category: "Commerce & Food" },
];

const CATEGORIES: Array<QuickActionItem["category"]> = [
  "Safety & Help",
  "Bills & Wealth",
  "Facilities & Living",
  "Social & Sports",
  "Commerce & Food",
];

export function QuickActions() {
  const router = useRouter();
  const { trackClick } = useHubUsage();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<QuickActionItem["category"]>("Safety & Help");
  const [showAllInCategory, setShowAllInCategory] = useState(false);

  // Layer 1: filter tiles by community enabledModules (graceful fallback if not set)
  const enabledModules: string[] = user?.enabledModules ?? [];
  const visibleServices = useMemo(() => {
    if (enabledModules.length === 0) return ALL_COMMUNITY_SERVICES; // no restrictions
    return ALL_COMMUNITY_SERVICES.filter((item) => {
      const keys = MODULE_KEYS[item.id];
      if (!keys) return true; // no module gate → always visible
      return keys.some((k) => enabledModules.includes(k));
    });
  }, [enabledModules]);

  const categoryActions = useMemo(() => {
    return visibleServices.filter((a) => a.category === activeCategory);
  }, [activeCategory, visibleServices]);

  const hasOverflow = categoryActions.length > 8;
  const displayedActions = hasOverflow && !showAllInCategory
    ? categoryActions.slice(0, 7)
    : categoryActions;

  return (
    <View style={s.wrapper}>
      {/* ── Heading Row (Figma style) ── */}
      <View style={s.headerRow}>
        <Text style={s.heading}>Quick Actions</Text>
        <Text style={s.serviceCount}>{visibleServices.length} services</Text>
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