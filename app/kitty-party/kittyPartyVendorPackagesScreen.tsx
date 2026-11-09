import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { kittyPartyService } from '@/services/kittyPartyService';
import type { KittyPartyVendorPackage, VendorPackageCategory } from '@/types/kittyPartyTypes';

const CATEGORIES: { label: string; value: string; emoji: string }[] = [
  { label: 'All Packages', value: 'ALL', emoji: '🛍️' },
  { label: 'Catering', value: 'CATERING', emoji: '🍽️' },
  { label: 'Cakes & Pastries', value: 'CAKES_DESSERTS', emoji: '🎂' },
  { label: 'Theme Decor', value: 'BALLOON_DECOR', emoji: '🎈' },
  { label: 'Hosts & Emcees', value: 'EMCEE_ENTERTAINMENT', emoji: '🎤' },
  { label: 'Photography', value: 'PHOTOGRAPHY', emoji: '📸' },
];

export default function KittyPartyVendorPackagesScreen() {
  const { id: paramId, circleId: paramCircleId } = useLocalSearchParams<{ id?: string; circleId?: string }>();
  const circleId = Number(paramId || paramCircleId || 0);

  const [packages, setPackages] = useState<KittyPartyVendorPackage[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedMenuId, setExpandedMenuId] = useState<number | null>(null);

  const fetchPackages = async (cat?: string) => {
    try {
      setLoading(true);
      const res = await kittyPartyService.getVendorPackages(circleId, cat);
      setPackages(res || []);
    } catch (err) {
      console.error('Failed to load mobile vendor packages', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (circleId) {
      fetchPackages(activeCategory);
    }
  }, [circleId, activeCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPackages(activeCategory);
  };

  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'No contact phone number provided for this vendor.');
      return;
    }
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call.');
    });
  };

  const handleInquire = async (pkg: KittyPartyVendorPackage) => {
    try {
      const res = await kittyPartyService.inquireVendorPackage({
        packageId: pkg.id,
        notes: `Mobile resident inquiry from Social Circle ID: ${circleId}`,
      });
      Alert.alert('Inquiry Sent! 🎉', res.message || 'Vendor partner has received your meetup request.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to submit inquiry');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />}
    >
      {/* Header Banner */}
      <View style={styles.bannerCard}>
        <View style={styles.badgePill}>
          <Text style={styles.badgePillText}>🛍️ LOCAL MARKETPLACE</Text>
        </View>
        <Text style={styles.bannerTitle}>Curated Party Vendors</Text>
        <Text style={styles.bannerSubtitle}>
          Verified caterers, custom bakers, balloon stylists, and Housie hosts with transparent group packages.
        </Text>
      </View>

      {/* Horizontal Category Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.value;
          return (
            <TouchableOpacity
              key={cat.value}
              onPress={() => setActiveCategory(cat.value)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={styles.chipEmoji}>{cat.emoji}</Text>
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Packages List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Fetching packages...</Text>
        </View>
      ) : packages.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyTitle}>No packages in this category</Text>
          <Text style={styles.emptySubtitle}>Select 'All Packages' to explore available society vendor options.</Text>
        </View>
      ) : (
        packages.map((pkg) => {
          const isExpanded = expandedMenuId === pkg.id;
          return (
            <View key={pkg.id} style={styles.pkgCard}>
              <View style={styles.pkgHeaderRow}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{pkg.category.replace('_', ' ')}</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={styles.starIcon}>⭐</Text>
                  <Text style={styles.ratingText}>{pkg.rating || 4.8}</Text>
                </View>
              </View>

              <Text style={styles.pkgName}>{pkg.packageName}</Text>
              <Text style={styles.pkgDesc}>{pkg.description}</Text>

              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Estimated Price:</Text>
                <Text style={styles.priceValue}>{pkg.priceRange || 'Custom Quote'}</Text>
              </View>

              {/* Sample Menu / Deliverables */}
              {pkg.sampleMenu && (
                <View style={styles.menuSection}>
                  <TouchableOpacity
                    onPress={() => setExpandedMenuId(isExpanded ? null : pkg.id)}
                    style={styles.toggleMenuBtn}
                  >
                    <Text style={styles.toggleMenuText}>
                      {isExpanded ? '▲ Hide Inclusions' : '▼ View Package Inclusions'}
                    </Text>
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.inclusionsBox}>
                      <Text style={styles.inclusionsText}>{pkg.sampleMenu}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                {pkg.contactPhone && (
                  <TouchableOpacity onPress={() => handleCall(pkg.contactPhone)} style={styles.callBtn}>
                    <Text style={styles.callBtnText}>📞 Call Host</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleInquire(pkg)} style={styles.inquireBtn}>
                  <Text style={styles.inquireBtnText}>✨ Book Inquiry</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  contentContainer: { padding: 16, paddingBottom: 40 },
  centerContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 10, fontSize: 13, color: '#64748B' },
  bannerCard: {
    backgroundColor: '#059669',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#059669',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  badgePillText: { color: '#D1FAE5', fontSize: 11, fontWeight: '800' },
  bannerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  bannerSubtitle: { color: '#D1FAE5', fontSize: 13, lineHeight: 18 },
  chipsScroll: { marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  chipEmoji: { marginRight: 6, fontSize: 13 },
  chipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  chipTextActive: { color: '#FFFFFF' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#334155' },
  emptySubtitle: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 },
  pkgCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  pkgHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryBadgeText: { color: '#166534', fontSize: 11, fontWeight: '800' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  starIcon: { fontSize: 11, marginRight: 3 },
  ratingText: { fontSize: 11, fontWeight: '800', color: '#B45309' },
  pkgName: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  pkgDesc: { fontSize: 12, color: '#475569', lineHeight: 17, marginBottom: 10 },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  priceLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  priceValue: { fontSize: 13, fontWeight: '900', color: '#047857' },
  menuSection: { marginBottom: 12 },
  toggleMenuBtn: { paddingVertical: 4 },
  toggleMenuText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  inclusionsBox: { backgroundColor: '#EEF2FF', padding: 10, borderRadius: 10, marginTop: 6 },
  inclusionsText: { fontSize: 11, color: '#3730A3', lineHeight: 16 },
  actionsRow: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  callBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  callBtnText: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  inquireBtn: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  inquireBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
});
