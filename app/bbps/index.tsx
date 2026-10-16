import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { THEME, FONTS, SHADOWS } from '@/constants/config';
import { billerService, BillerCategory, BillerDto } from '@/services/billerService';

const CATEGORIES: { key: BillerCategory; label: string; icon: string; color: string; bg: string }[] = [
  { key: 'ELECTRICITY', label: 'Electricity', icon: '⚡', color: '#D97706', bg: '#FFFBEB' },
  { key: 'GAS',         label: 'Gas',         icon: '🔥', color: '#DC2626', bg: '#FEF2F2' },
  { key: 'WATER',       label: 'Water',       icon: '💧', color: '#0284C7', bg: '#E0F2FE' },
  { key: 'BROADBAND',   label: 'Broadband',   icon: '📡', color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'DTH',         label: 'DTH / Cable', icon: '📺', color: '#0F766E', bg: '#F0FDFA' },
];

export default function BBPSBillerPickerScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<BillerCategory>('ELECTRICITY');
  const [search, setSearch] = useState('');

  const { data: billers = [], isLoading } = useQuery({
    queryKey: ['bbps-billers', activeCategory],
    queryFn: () => billerService.getBillersByCategory(activeCategory),
    staleTime: 5 * 60 * 1000,
  });

  const filteredBillers = search.trim()
    ? billers.filter(b =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.state.toLowerCase().includes(search.toLowerCase())
      )
    : billers;

  const handleSelectBiller = useCallback((biller: BillerDto) => {
    router.push({
      pathname: '/bbps/fetch-bill',
      params: {
        billerId: biller.id,
        billerName: biller.name,
        billerShortName: biller.shortName,
        billerState: biller.state,
        consumerIdLabel: biller.consumerIdLabel,
        consumerIdHint: biller.consumerIdHint,
        consumerIdLength: biller.consumerIdLength ? String(biller.consumerIdLength) : '',
      },
    });
  }, [router]);

  const activeCat = CATEGORIES.find(c => c.key === activeCategory)!;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/finance')}
        >
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerTitleBox}>
          <Text style={s.headerTitle}>Pay Utility Bills</Text>
          <Text style={s.headerSub}>BBPS · Bharat Bill Payment System</Text>
        </View>
        <View style={[s.bbpsBadge]}>
          <Text style={s.bbpsBadgeText}>BBPS</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* BBPS Trust Banner */}
        <View style={s.trustBanner}>
          <Ionicons name="shield-checkmark" size={16} color={THEME.brandDark} />
          <Text style={s.trustText}>
            Powered by NPCI Bharat BillPay · 70+ billers across India · Instant digital receipt
          </Text>
        </View>

        {/* Category Grid */}
        <Text style={s.sectionLabel}>Bill Category</Text>
        <View style={s.categoryGrid}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[s.categoryCard, activeCategory === cat.key && { borderColor: THEME.brand, backgroundColor: THEME.brandLight }]}
              onPress={() => { setActiveCategory(cat.key); setSearch(''); }}
              activeOpacity={0.75}
            >
              <Text style={s.categoryIcon}>{cat.icon}</Text>
              <Text style={[s.categoryLabel, activeCategory === cat.key && { color: THEME.brandDark }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search Bar */}
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={THEME.textSecondary} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder={`Search ${activeCat.label} providers…`}
            placeholderTextColor={THEME.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={THEME.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Biller List */}
        <Text style={s.sectionLabel}>
          {activeCat.label} Providers
          {filteredBillers.length > 0 && <Text style={s.sectionCount}> · {filteredBillers.length}</Text>}
        </Text>

        {isLoading ? (
          <View style={s.loaderBox}>
            <ActivityIndicator size="small" color={THEME.brand} />
            <Text style={s.loaderText}>Loading billers…</Text>
          </View>
        ) : filteredBillers.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="search-outline" size={32} color={THEME.textMuted} />
            <Text style={s.emptyText}>No providers found for "{search}"</Text>
          </View>
        ) : (
          <View style={s.billerList}>
            {filteredBillers.map((biller, idx) => (
              <TouchableOpacity
                key={biller.id}
                style={[s.billerRow, idx < filteredBillers.length - 1 && s.billerRowBorder]}
                onPress={() => handleSelectBiller(biller)}
                activeOpacity={0.7}
              >
                <View style={[s.billerIconBox, { backgroundColor: activeCat.bg }]}>
                  <Text style={s.billerIconText}>{biller.icon}</Text>
                </View>
                <View style={s.billerInfo}>
                  <Text style={s.billerName}>{biller.name}</Text>
                  <Text style={s.billerState}>{biller.state} · {biller.consumerIdLabel}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={THEME.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent / Popular — static hint */}
        {!search && (
          <View style={s.hintCard}>
            <Ionicons name="information-circle-outline" size={15} color={THEME.indigo} />
            <Text style={s.hintText}>
              Select your electricity board, enter the Consumer / RR / CA number printed on your last bill, and we will fetch the live amount.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.surfaceMuted,
  },
  headerTitleBox: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  headerSub: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular },
  bbpsBadge: {
    backgroundColor: THEME.amberLight,
    borderWidth: 1,
    borderColor: THEME.amber,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  bbpsBadgeText: { fontSize: 10, fontWeight: '800', color: THEME.amber, fontFamily: FONTS.bold },
  scrollContent: { padding: 16, gap: 14 },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.brandLight,
    borderWidth: 1,
    borderColor: THEME.brandBorder,
    borderRadius: 10,
    padding: 10,
  },
  trustText: { flex: 1, fontSize: 11.5, color: THEME.brandDark, fontFamily: FONTS.medium },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.semiBold,
    marginBottom: 2,
  },
  sectionCount: { color: THEME.textSecondary, fontWeight: '500' },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '18%',
    minWidth: 58,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: THEME.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME.border,
    gap: 4,
  },
  categoryIcon: { fontSize: 22 },
  categoryLabel: { fontSize: 10, fontWeight: '600', color: THEME.textSecondary, textAlign: 'center', fontFamily: FONTS.semiBold },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchIcon: { marginRight: 2 },
  searchInput: { flex: 1, fontSize: 14, color: THEME.textPrimary, fontFamily: FONTS.regular },
  loaderBox: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  loaderText: { fontSize: 13, color: THEME.textSecondary },
  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyText: { fontSize: 13, color: THEME.textSecondary, textAlign: 'center' },
  billerList: {
    backgroundColor: THEME.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  billerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  billerRowBorder: { borderBottomWidth: 1, borderBottomColor: THEME.border },
  billerIconBox: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  billerIconText: { fontSize: 18 },
  billerInfo: { flex: 1 },
  billerName: { fontSize: 13.5, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  billerState: { fontSize: 11.5, color: THEME.textSecondary, marginTop: 2, fontFamily: FONTS.regular },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: THEME.indigoLight,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  hintText: { flex: 1, fontSize: 12, color: THEME.indigo, fontFamily: FONTS.regular, lineHeight: 18 },
});
