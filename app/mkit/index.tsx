import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SHADOWS } from '@/constants/config';

interface ToolItem {
  id: string;
  route: string;
  title: string;
  subtitle: string;
  category: 'finance' | 'travel' | 'productivity' | 'utility' | 'home' | 'security';
  icon: any;
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons';
  color: string;
  bgColor: string;
  badge?: string;
}

const TOOLS: ToolItem[] = [
  {
    id: 'emi-sip',
    route: '/mkit/emi-sip',
    title: 'EMI & SIP Calculators',
    subtitle: 'Loan EMI, interest breakdown & SIP wealth accumulation',
    category: 'finance',
    icon: 'calculator',
    iconFamily: 'Ionicons',
    color: '#4F46E5',
    bgColor: '#EEF2FF',
    badge: 'Popular',
  },
  {
    id: 'staff-salary',
    route: '/mkit/staff-salary',
    title: 'Staff & Maid Salary',
    subtitle: 'Daily wage rate, leave deductions & WhatsApp salary slip',
    category: 'home',
    icon: 'account-check-outline',
    iconFamily: 'MaterialCommunityIcons',
    color: '#059669',
    bgColor: '#D1FAE5',
    badge: 'Essential',
  },
  {
    id: 'land-converter',
    route: '/mkit/land-converter',
    title: 'Indian Land Converter',
    subtitle: 'Sq Ft, Sq Yards (Gaj), Guntha, Cents, Acres & Property Value',
    category: 'utility',
    icon: 'compass-outline',
    iconFamily: 'MaterialCommunityIcons',
    color: '#2563EB',
    bgColor: '#DBEAFE',
    badge: 'New',
  },
  {
    id: 'fuel-mileage',
    route: '/mkit/fuel-mileage',
    title: 'Fuel & Mileage',
    subtitle: 'Trip fuel cost, carpool seat split & mileage checker',
    category: 'travel',
    icon: 'gas-station',
    iconFamily: 'MaterialCommunityIcons',
    color: '#D97706',
    bgColor: '#FEF3C7',
    badge: 'Carpool',
  },
  {
    id: 'bill-split',
    route: '/mkit/bill-split',
    title: 'Bill Splitter & Tip',
    subtitle: 'Split restaurant bills, tax/GST, tip & WhatsApp share',
    category: 'utility',
    icon: 'receipt-outline',
    iconFamily: 'Ionicons',
    color: '#0D9488',
    bgColor: '#CCFBF1',
  },
  {
    id: 'pomodoro',
    route: '/mkit/pomodoro',
    title: 'Pomodoro Focus Timer',
    subtitle: '25/5/15 min intervals, session log & vibration chime',
    category: 'productivity',
    icon: 'timer-outline',
    iconFamily: 'Ionicons',
    color: '#E11D48',
    bgColor: '#FFE4E6',
    badge: 'Focus',
  },
  {
    id: 'qr-studio',
    route: '/mkit/qr-studio',
    title: 'QR Code Studio',
    subtitle: 'Instant scannable QR for UPI payments, WiFi & web links',
    category: 'utility',
    icon: 'qrcode',
    iconFamily: 'MaterialCommunityIcons',
    color: '#4F46E5',
    bgColor: '#EEF2FF',
  },
  {
    id: 'paint-calc',
    route: '/mkit/paint-calc',
    title: 'Paint & Wall Estimator',
    subtitle: 'Room area, door/window deductions, coats & can sizes',
    category: 'home',
    icon: 'format-paint',
    iconFamily: 'MaterialCommunityIcons',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
  },
  {
    id: 'electricity-calc',
    route: '/mkit/electricity-calc',
    title: 'Electricity & Power Cost',
    subtitle: 'Appliance wattage, monthly kWh units & bill estimate',
    category: 'home',
    icon: 'flash-outline',
    iconFamily: 'Ionicons',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  {
    id: 'password-gen',
    route: '/mkit/password-gen',
    title: 'Password Generator',
    subtitle: 'Cryptographic random passwords & PINs with entropy score',
    category: 'security',
    icon: 'key-outline',
    iconFamily: 'Ionicons',
    color: '#6366F1',
    bgColor: '#EEF2FF',
  },
];

export default function MKitDashboardScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');

  const filtered = TOOLS.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.subtitle.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCat === 'all' || t.category === selectedCat;
    return matchSearch && matchCat;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>ManaKit • Everyday Tools</Text>
          <Text style={styles.headerSubtitle}>10 smart utilities for daily living</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Card */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerBadge}>
            <Ionicons name="sparkles" size={14} color="#FBBF24" />
            <Text style={styles.bannerBadgeText}>10 Tools Included</Text>
          </View>
          <Text style={styles.bannerHeading}>
            Why install multiple apps when ONE app does it all?
          </Text>
          <Text style={styles.bannerDesc}>
            Simpler, faster, and 100% offline. Zero server lag.
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            placeholder="Search all 10 tools & calculators..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        {/* Category Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {[
            { id: 'all', label: 'All 10' },
            { id: 'finance', label: 'Finance' },
            { id: 'home', label: 'Home & Staff' },
            { id: 'utility', label: 'Utilities & Land' },
            { id: 'productivity', label: 'Focus' },
            { id: 'travel', label: 'Travel' },
            { id: 'security', label: 'Security' },
          ].map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setSelectedCat(c.id)}
              style={[
                styles.chip,
                selectedCat === c.id && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCat === c.id && styles.chipTextActive,
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tool Cards */}
        <View style={styles.toolList}>
          {filtered.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.toolCard}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.toolIconWrap, { backgroundColor: item.bgColor }]}>
                {item.iconFamily === 'Ionicons' ? (
                  <Ionicons name={item.icon} size={24} color={item.color} />
                ) : (
                  <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                )}
              </View>

              <View style={styles.toolTextWrap}>
                <View style={styles.toolTitleRow}>
                  <Text style={styles.toolTitle}>{item.title}</Text>
                  {item.badge && (
                    <View style={styles.toolBadge}>
                      <Text style={styles.toolBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.toolSubtitle} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.md,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  bannerBadgeText: {
    color: '#E0E7FF',
    fontSize: 11,
    fontWeight: '700',
  },
  bannerHeading: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 6,
  },
  bannerDesc: {
    color: '#C7D2FE',
    fontSize: 13,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  chipRow: {
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  toolList: {
    gap: 12,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
    ...SHADOWS.sm,
  },
  toolIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTextWrap: {
    flex: 1,
  },
  toolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  toolBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  toolBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  toolSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});
