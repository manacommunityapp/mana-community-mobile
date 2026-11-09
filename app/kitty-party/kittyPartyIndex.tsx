import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { kittyPartyService } from '@/services/kittyPartyService';
import { KittyPartyCircleCard } from '@/components/kittyPartyCircleCard';
import type { KittyPartyCircleSummary } from '@/types/kittyPartyTypes';

const DISCOVER_CATEGORIES = [
  { code: '', label: 'All' },
  { code: 'KITTY_PARTY', label: 'Kitty' },
  { code: 'LADIES_CLUB', label: 'Ladies Club' },
  { code: 'BOOK_CLUB', label: 'Book Club' },
  { code: 'FITNESS_SPORTS', label: 'Fitness' },
  { code: 'SENIOR_CITIZENS', label: 'Seniors' },
  { code: 'GENERAL_SOCIAL', label: 'Social' },
];

export default function KittyPartyIndexScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');
  const [discoverCategory, setDiscoverCategory] = useState('');

  const switchTab = (tab: 'my' | 'discover') => {
    if (tab === 'my') setDiscoverCategory('');
    setActiveTab(tab);
  };
  const [circles, setCircles] = useState<KittyPartyCircleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab, discoverCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'my') {
        const res = await kittyPartyService.getMyCircles();
        setCircles(res?.content || []);
      } else {
        const res = await kittyPartyService.discoverCircles(discoverCategory || undefined);
        setCircles(res?.content || []);
      }
    } catch (e) {
      console.error('Failed to load mobile kitty circles', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerRow}>
          <View>
            <Text style={styles.tagline}>MANA SOCIAL CIRCLES</Text>
            <Text style={styles.bannerTitle}>Mana Kitty & Circles</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/kitty-party/kittyPartyCreateScreen')}
            activeOpacity={0.8}
          >
            <Text style={styles.createButtonText}>+ Create</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.bannerSubtitle}>
          Join trusted neighborhood kitty parties, record monthly savings rotations, and play live Housie!
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.activeTab]}
          onPress={() => switchTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
            My Circles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => switchTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
            Discover Circles
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category filter chips — shown only on Discover tab */}
      {activeTab === 'discover' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChipsContent}
          style={styles.categoryChipsBar}
        >
          {DISCOVER_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.code}
              style={[styles.categoryChip, discoverCategory === cat.code && styles.categoryChipActive]}
              onPress={() => setDiscoverCategory(cat.code)}
            >
              <Text style={[styles.categoryChipText, discoverCategory === cat.code && styles.categoryChipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Circle List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#DB2777" style={styles.loader} />
        ) : circles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👭</Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'my' ? 'No Circles Joined' : 'No Circles Found'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'my'
                ? 'Create your first kitty party or discover groups in your community.'
                : 'Check back soon or start a new circle for your friends.'}
            </Text>
            {activeTab === 'my' && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/kitty-party/kittyPartyCreateScreen')}
              >
                <Text style={styles.emptyButtonText}>Create a Circle</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          circles.map((circle) => (
            <KittyPartyCircleCard
              key={circle.id}
              circle={circle}
              onPress={() =>
                router.push({
                  pathname: '/kitty-party/kittyPartyDetailsScreen',
                  params: { id: circle.id },
                })
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  banner: {
    backgroundColor: '#BE185D',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FBCFE8',
    letterSpacing: 1,
    marginBottom: 2,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#FCE7F3',
    lineHeight: 16,
    marginTop: 4,
  },
  createButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  createButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#BE185D',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
    gap: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  activeTab: {
    backgroundColor: '#BE185D',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  loader: {
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#BE185D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  categoryChipsBar: {
    marginBottom: 4,
  },
  categoryChipsContent: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  categoryChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryChipActive: {
    backgroundColor: '#BE185D',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
});
