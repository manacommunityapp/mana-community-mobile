import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, TextInput, Modal, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS } from '@/constants/config';

interface LostFoundItem {
  id: string;
  type: 'LOST' | 'FOUND';
  title: string;
  location: string;
  date: string;
  description: string;
  reportedBy: string;
  contact: string;
  status: 'OPEN' | 'RESOLVED';
}

const INITIAL_ITEMS: LostFoundItem[] = [
  {
    id: 'LF-101',
    type: 'LOST',
    title: 'Blue Car Key Fob (Hyundai)',
    location: 'Basement Parking B2, near Pillar 14',
    date: 'Today, 2:30 PM',
    description: 'Black and silver key fob with blue silicone cover and small teddy bear keychain.',
    reportedBy: 'Kavita Roy (A-804)',
    contact: '+91 98451 00234',
    status: 'OPEN',
  },
  {
    id: 'LF-102',
    type: 'FOUND',
    title: 'Kids Titan Watch (Pink)',
    location: 'Children Play Area Bench',
    date: 'Yesterday, 6:00 PM',
    description: 'Pink strap digital sports watch found on the wooden bench next to swings. Handed to Tower B Security.',
    reportedBy: 'Security Guard Ram',
    contact: 'Tower B Main Desk',
    status: 'OPEN',
  },
  {
    id: 'LF-103',
    type: 'FOUND',
    title: 'Reading Glasses with Brown Leather Case',
    location: 'Clubhouse Library Room',
    date: '02 Oct, 11:00 AM',
    description: 'Rectangular gold-rimmed glasses in brown case. Deposited with clubhouse manager.',
    reportedBy: 'Clubhouse Reception',
    contact: 'Clubhouse Desk',
    status: 'RESOLVED',
  },
  {
    id: 'LF-104',
    type: 'LOST',
    title: 'Gym Water Bottle (Black Hydroflask)',
    location: 'Clubhouse Gymnasium / Treadmill area',
    date: '01 Oct, 8:00 AM',
    description: 'Matte black 1-litre bottle with red sticker.',
    reportedBy: 'Rahul Verma (C-302)',
    contact: '+91 98765 43210',
    status: 'OPEN',
  },
];

export default function LostFoundScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | 'LOST' | 'FOUND'>('ALL');
  const [items, setItems] = useState<LostFoundItem[]>(INITIAL_ITEMS);
  const [modalVisible, setModalVisible] = useState(false);

  const [type, setType] = useState<'LOST' | 'FOUND'>('LOST');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');

  const filtered = items.filter(item => {
    if (filter === 'ALL') return true;
    return item.type === filter;
  });

  const handleCreate = () => {
    if (!title.trim() || !location.trim()) {
      Alert.alert('Incomplete', 'Please provide title and location.');
      return;
    }
    const newItem: LostFoundItem = {
      id: `LF-${Math.floor(100 + Math.random() * 900)}`,
      type,
      title: title.trim(),
      location: location.trim(),
      date: 'Just now',
      description: description.trim() || 'No additional details provided.',
      reportedBy: 'You (Current Resident)',
      contact: contact.trim() || 'Via in-app chat',
      status: 'OPEN',
    };
    setItems([newItem, ...items]);
    setModalVisible(false);
    setTitle('');
    setLocation('');
    setDescription('');
    setContact('');
    Alert.alert('Posted', `Your ${type.toLowerCase()} item report has been published to all residents.`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Lost & Found</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {(['ALL', 'LOST', 'FOUND'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f === 'ALL' ? 'All Items' : f === 'LOST' ? '🔴 Lost Items' : '🟢 Found Items'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isLost = item.type === 'LOST';
          const isResolved = item.status === 'RESOLVED';

          return (
            <View style={[styles.card, isResolved && { opacity: 0.65 }]}>
              <View style={styles.cardTop}>
                <View style={[styles.typeBadge, isLost ? styles.lostBadge : styles.foundBadge]}>
                  <Text style={[styles.typeBadgeText, isLost ? styles.lostBadgeText : styles.foundBadgeText]}>
                    {item.type}
                  </Text>
                </View>
                {isResolved && (
                  <View style={styles.resolvedBadge}>
                    <Ionicons name="checkmark-done" size={12} color="#059669" />
                    <Text style={styles.resolvedBadgeText}>Returned / Resolved</Text>
                  </View>
                )}
                <Text style={styles.itemDate}>{item.date}</Text>
              </View>

              <Text style={styles.itemTitle}>{item.title}</Text>

              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#EF4444" />
                <Text style={styles.locationText}>{item.location}</Text>
              </View>

              <Text style={styles.descText}>{item.description}</Text>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.reportedBy}>Reported by: {item.reportedBy}</Text>
                  <Text style={styles.contact}>Contact: {item.contact}</Text>
                </View>

                {!isResolved && (
                  <TouchableOpacity
                    style={styles.claimBtn}
                    onPress={() => Alert.alert('Claim / Verify', `Contact ${item.contact} or security desk to verify ownership?`, [
                      { text: 'Cancel' },
                      { text: 'Contact / Claim', onPress: () => Alert.alert('Request Sent', 'The reporter has been notified of your claim!') }
                    ])}
                  >
                    <Text style={styles.claimBtnText}>{isLost ? 'Found This?' : 'Claim Item'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No lost & found notices</Text>
            <Text style={styles.emptySub}>Report missing or found items in the community</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Lost or Found Item</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'LOST' && styles.typeBtnLostActive]}
                onPress={() => setType('LOST')}
              >
                <Text style={[styles.typeBtnText, type === 'LOST' && styles.typeBtnTextActive]}>I Lost Something</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'FOUND' && styles.typeBtnFoundActive]}
                onPress={() => setType('FOUND')}
              >
                <Text style={[styles.typeBtnText, type === 'FOUND' && styles.typeBtnTextActive]}>I Found Something</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Item Name / Headline</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Set of keys with blue lanyard"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Last Seen Location / Found Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Near Tower A swimming pool area"
              placeholderTextColor="#94A3B8"
              value={location}
              onChangeText={setLocation}
            />

            <Text style={styles.inputLabel}>Item Details & Color</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe distinguishing marks, brand, or case..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.inputLabel}>Contact Phone / Desk</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +91 98xxx xxxxx or Guard Desk"
              placeholderTextColor="#94A3B8"
              value={contact}
              onChangeText={setContact}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
              <Text style={styles.submitBtnText}>Post Notice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8 },
  filterChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: '800' },
  lostBadge: { backgroundColor: '#FEE2E2' },
  lostBadgeText: { color: '#DC2626', fontSize: 10, fontWeight: '800' },
  foundBadge: { backgroundColor: '#DCFCE7' },
  foundBadgeText: { color: '#059669', fontSize: 10, fontWeight: '800' },
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  resolvedBadgeText: { fontSize: 10, color: '#059669', fontWeight: '700', marginLeft: 4 },
  itemDate: { fontSize: 11, color: '#94A3B8' },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  locationText: { fontSize: 12, color: '#475569', marginLeft: 4, fontWeight: '500' },
  descText: { fontSize: 12, color: '#64748B', lineHeight: 17, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  reportedBy: { fontSize: 11, color: '#475569', fontWeight: '600' },
  contact: { fontSize: 11, color: '#64748B', marginTop: 2 },
  claimBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  claimBtnText: { color: '#4F46E5', fontSize: 12, fontWeight: '700' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 12, color: '#64748B', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  typeSelector: { flexDirection: 'row', marginBottom: 14 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: '#F1F5F9', marginHorizontal: 4 },
  typeBtnLostActive: { backgroundColor: '#FEE2E2' },
  typeBtnFoundActive: { backgroundColor: '#DCFCE7' },
  typeBtnText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  typeBtnTextActive: { color: '#0F172A' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 5 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0F172A', marginBottom: 12 },
  textArea: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, fontSize: 13, color: '#0F172A', textAlignVertical: 'top', height: 70, marginBottom: 12 },
  submitBtn: { backgroundColor: '#4F46E5', paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
