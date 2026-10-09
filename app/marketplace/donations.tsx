import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS } from '@/constants/config';

interface DonationItem {
  id: string;
  title: string;
  category: string;
  condition: string;
  donorName: string;
  tower: string;
  description: string;
  status: 'AVAILABLE' | 'CLAIMED';
}

const DONATION_ITEMS: DonationItem[] = [
  {
    id: 'DON-1',
    title: 'Wooden Study Table & Chair Set',
    category: 'Furniture',
    condition: 'Gently Used',
    donorName: 'Anil Gupta',
    tower: 'Tower B - 1102',
    description: 'Solid pine wood study desk with 2 drawers. Perfect for kids study room. Self pickup from Tower B.',
    status: 'AVAILABLE',
  },
  {
    id: 'DON-2',
    title: 'CBSE Class 10 & 11 Reference Books',
    category: 'Books & Education',
    condition: 'Like New',
    donorName: 'Sneha R.',
    tower: 'Tower A - 504',
    description: 'RD Sharma, NCERT Exemplars and HC Verma Physics books. Free for any student in need.',
    status: 'AVAILABLE',
  },
  {
    id: 'DON-3',
    title: 'Baby Stroller / Pram (Chicco)',
    category: 'Baby & Kids',
    condition: 'Good',
    donorName: 'Priya & Vikram',
    tower: 'Tower D - 302',
    description: 'Foldable stroller, thoroughly sanitized. All wheels and brakes fully functional.',
    status: 'CLAIMED',
  },
  {
    id: 'DON-4',
    title: 'Indoor Ceramic Planters (Set of 4)',
    category: 'Home & Garden',
    condition: 'New',
    donorName: 'Radhika S.',
    tower: 'Tower C - 701',
    description: 'White ceramic pots with drainage plates. Great for balcony plants or succulents.',
    status: 'AVAILABLE',
  },
];

export default function DonationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<DonationItem[]>(DONATION_ITEMS);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Free Giveaways & Donations</Text>
        <TouchableOpacity
          style={styles.postBtn}
          onPress={() => router.push({ pathname: '/marketplace/create', params: { type: 'DONATION' } } as any)}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Community Free Cycle</Text>
        <Text style={styles.bannerSub}>Give unused household items a second life within your society.</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isClaimed = item.status === 'CLAIMED';

          return (
            <View style={[styles.card, isClaimed && { opacity: 0.6 }]}>
              <View style={styles.cardTop}>
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>100% FREE</Text>
                </View>
                <View style={[styles.statusBadge, isClaimed ? styles.claimedBadge : styles.availBadge]}>
                  <Text style={[styles.statusBadgeText, isClaimed ? styles.claimedText : styles.availText]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemCategory}>{item.category} • {item.condition}</Text>
              <Text style={styles.itemDesc}>{item.description}</Text>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.donorText}>Donor: {item.donorName}</Text>
                  <Text style={styles.towerText}>Pickup: {item.tower}</Text>
                </View>

                {!isClaimed && (
                  <TouchableOpacity
                    style={styles.claimBtn}
                    onPress={() => Alert.alert('Claim Item', `Would you like to request "${item.title}" from ${item.donorName}?`, [
                      { text: 'Cancel' },
                      { text: 'Claim Giveaway', onPress: () => Alert.alert('Success', 'Claim request sent to the donor!') }
                    ])}
                  >
                    <Ionicons name="gift-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.claimBtnText}>Claim Item</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No giveaways available right now</Text>
            <Text style={styles.emptySub}>Post a donation item to help a neighbor</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  postBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
  banner: { marginHorizontal: 16, backgroundColor: '#ECFDF5', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 12 },
  bannerTitle: { fontSize: 14, fontWeight: '800', color: '#065F46' },
  bannerSub: { fontSize: 12, color: '#047857', marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  freeBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  freeBadgeText: { color: '#059669', fontSize: 11, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  availBadge: { backgroundColor: '#EEF2FF' },
  availText: { color: '#4F46E5', fontSize: 10, fontWeight: '700' },
  claimedBadge: { backgroundColor: '#F1F5F9' },
  claimedText: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  itemCategory: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 6 },
  itemDesc: { fontSize: 12, color: '#334155', lineHeight: 17, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  donorText: { fontSize: 11, color: '#0F172A', fontWeight: '600' },
  towerText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  claimBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  claimBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 12, color: '#64748B', marginTop: 4 },
});
