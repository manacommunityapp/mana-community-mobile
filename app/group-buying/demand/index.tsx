import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS, GRADIENTS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import VendorOfferCard from '@/components/group-buying/VendorOfferCard';
import type { DemandRequest, VendorOffer } from '@/types/groupBuying';

const CATEGORIES = ['All', 'Grocery', 'Fresh', 'Dairy', 'Home', 'Personal Care', 'Festival', 'Electronics'];

export default function DemandBoard() {
  const queryClient = useQueryClient();
  const [selectedCat, setSelectedCat] = useState('All');
  const [search, setSearch] = useState('');
  const [showPropose, setShowPropose] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<DemandRequest | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('Grocery');
  const [newDesc, setNewDesc] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newPriceMin, setNewPriceMin] = useState('');
  const [newPriceMax, setNewPriceMax] = useState('');
  const [newBrand, setNewBrand] = useState('');

  const { data: demands = [], isLoading, refetch } = useQuery({
    queryKey: ['demand-board'],
    queryFn: groupBuyingService.getDemandBoard,
  });

  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const upvoteMutation = useMutation({
    mutationFn: groupBuyingService.upvoteDemand,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['demand-board'] }),
  });

  const createMutation = useMutation({
    mutationFn: groupBuyingService.createDemand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demand-board'] });
      setShowPropose(false);
      setNewTitle(''); setNewDesc(''); setNewQty(''); setNewPriceMin(''); setNewPriceMax(''); setNewBrand('');
    },
    onError: () => Alert.alert('Error', 'Could not submit demand. Try again.'),
  });

  const filtered = demands.filter(d => {
    const catOk = selectedCat === 'All' || d.category === selectedCat;
    const searchOk = !search || d.title.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk;
  });

  const open = filtered.filter(d => d.status === 'OPEN');
  const withOffers = filtered.filter(d => d.status === 'VENDOR_OFFERED');
  const approved = filtered.filter(d => ['APPROVED','LIVE','FULFILLED'].includes(d.status));

  const STATUS_COLOR: Record<string, string> = {
    OPEN: '#2563EB', VENDOR_OFFERED: '#D97706', APPROVED: '#059669', LIVE: '#7C3AED', FULFILLED: '#64748B',
  };
  const STATUS_LABEL: Record<string, string> = {
    OPEN: 'Collecting Support', VENDOR_OFFERED: 'Vendor Offers Available',
    APPROVED: 'Approved — Deal Coming', LIVE: 'Now Live!', FULFILLED: 'Fulfilled',
  };

  function DemandCard({ item }: { item: DemandRequest }) {
    const target = item.targetUpvotes ?? 25;
    const progress = Math.min(1, item.upvotes / target);
    const color = STATUS_COLOR[item.status] ?? COLORS.primary;
    return (
      <TouchableOpacity style={s.card} onPress={() => setSelectedDemand(item)} activeOpacity={0.85}>
        <View style={s.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={[s.statusPill, { backgroundColor: color + '18' }]}>
              <Text style={[s.statusText, { color }]}>{STATUS_LABEL[item.status]}</Text>
            </View>
            <Text style={s.cardTitle}>{item.title}</Text>
            {item.description ? <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
          </View>
          <TouchableOpacity
            style={[s.upvoteBtn, item.hasUpvoted && s.upvoteBtnActive]}
            onPress={() => upvoteMutation.mutate(item.id)}
            disabled={upvoteMutation.isPending}
          >
            <Ionicons name={item.hasUpvoted ? 'thumbs-up' : 'thumbs-up-outline'} size={16} color={item.hasUpvoted ? '#fff' : COLORS.primary} />
            <Text style={[s.upvoteCount, item.hasUpvoted && s.upvoteCountActive]}>{item.upvotes}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.cardMeta}>
          <Text style={s.metaItem}>👥 {item.interestedResidents} residents</Text>
          <Text style={s.metaItem}>📦 {item.expectedQty} units expected</Text>
          {item.preferredPriceMin && <Text style={s.metaItem}>💰 ₹{item.preferredPriceMin}–₹{item.preferredPriceMax}</Text>}
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: (Math.round(progress * 100) + '%') as any, backgroundColor: color }]} />
        </View>
        <Text style={s.progressLabel}>{item.upvotes}/{target} votes · {Math.max(0, target - item.upvotes)} more to trigger vendor outreach</Text>
        {item.vendorOffers.length > 0 && (
          <View style={s.offerTeaser}>
            <Ionicons name="storefront-outline" size={14} color={COLORS.primary} />
            <Text style={s.offerTeaserText}>{item.vendorOffers.length} vendor offer{item.vendorOffers.length > 1 ? 's' : ''} available — tap to compare</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      <LinearGradient colors={GRADIENTS.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={s.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>Community Demand Board</Text>
            <Text style={s.heroSub}>Propose what you need. When enough neighbours agree, we bring vendors to you.</Text>
          </View>
          <TouchableOpacity style={s.proposeBtn} onPress={() => setShowPropose(true)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.proposeBtnText}>Propose</Text>
          </TouchableOpacity>
        </View>
        <View style={s.heroStats}>
          <StatBox num={String(demands.length)} label="Demands" />
          <View style={s.heroDiv} />
          <StatBox num={String(withOffers.length)} label="With Offers" />
          <View style={s.heroDiv} />
          <StatBox num={String(demands.reduce((a, d) => a + d.upvotes, 0))} label="Total Votes" />
        </View>
      </LinearGradient>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
        <TextInput style={s.searchInput} placeholder="Search demands..." placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity key={cat} style={[s.catChip, selectedCat === cat && s.catChipActive]} onPress={() => setSelectedCat(cat)}>
            <Text style={[s.catChipText, selectedCat === cat && s.catChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <>
          {withOffers.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>⚡ Vendor Offers Available ({withOffers.length})</Text>
              {withOffers.map(d => <DemandCard key={d.id} item={d} />)}
            </View>
          )}
          {open.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>📢 Collecting Community Support ({open.length})</Text>
              {open.map(d => <DemandCard key={d.id} item={d} />)}
            </View>
          )}
          {approved.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>✅ Approved & Live ({approved.length})</Text>
              {approved.map(d => <DemandCard key={d.id} item={d} />)}
            </View>
          )}
          {filtered.length === 0 && (
            <View style={s.center}>
              <Ionicons name="bulb-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No demands found</Text>
              <Text style={s.emptySub}>Be the first to propose a product for your community!</Text>
              <TouchableOpacity style={s.proposeBtn2} onPress={() => setShowPropose(true)}>
                <Text style={s.proposeBtnText}>Propose a Product</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      <View style={{ height: 32 }} />

      {/* Propose Modal */}
      <Modal visible={showPropose} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <ScrollView style={s.modalCard} contentContainerStyle={{ paddingBottom: 32 }}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Propose a Product</Text>
              <TouchableOpacity onPress={() => setShowPropose(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={s.fieldLabel}>Product / Service Name *</Text>
            <TextInput style={s.field} placeholder="e.g. Basmati Rice 5KG" placeholderTextColor={COLORS.textMuted} value={newTitle} onChangeText={setNewTitle} />
            <Text style={s.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {['Grocery','Fresh','Dairy','Home','Personal Care','Festival','Electronics'].map(c => (
                <TouchableOpacity key={c} style={[s.catChip, newCat === c && s.catChipActive]} onPress={() => setNewCat(c)}>
                  <Text style={[s.catChipText, newCat === c && s.catChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={s.fieldLabel}>Description (optional)</Text>
            <TextInput style={[s.field, s.fieldMulti]} placeholder="Pack size, brand preference, use case..." placeholderTextColor={COLORS.textMuted} value={newDesc} onChangeText={setNewDesc} multiline numberOfLines={3} />
            <View style={s.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Expected Qty</Text>
                <TextInput style={s.field} placeholder="e.g. 50" placeholderTextColor={COLORS.textMuted} value={newQty} onChangeText={setNewQty} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Preferred Brand</Text>
                <TextInput style={s.field} placeholder="Optional" placeholderTextColor={COLORS.textMuted} value={newBrand} onChangeText={setNewBrand} />
              </View>
            </View>
            <View style={s.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Price Min (₹)</Text>
                <TextInput style={s.field} placeholder="500" placeholderTextColor={COLORS.textMuted} value={newPriceMin} onChangeText={setNewPriceMin} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Price Max (₹)</Text>
                <TextInput style={s.field} placeholder="600" placeholderTextColor={COLORS.textMuted} value={newPriceMax} onChangeText={setNewPriceMax} keyboardType="numeric" />
              </View>
            </View>
            <TouchableOpacity
              style={[s.submitBtn, (!newTitle.trim() || createMutation.isPending) && { opacity: 0.5 }]}
              onPress={() => {
                if (!newTitle.trim()) { Alert.alert('Required', 'Product name is required.'); return; }
                createMutation.mutate({ title: newTitle.trim(), category: newCat, description: newDesc.trim() || undefined, expectedQty: newQty ? parseInt(newQty) : undefined, preferredPriceMin: newPriceMin ? parseInt(newPriceMin) : undefined, preferredPriceMax: newPriceMax ? parseInt(newPriceMax) : undefined, preferredBrand: newBrand.trim() || undefined });
              }}
              disabled={!newTitle.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Submit Demand</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Demand Detail / Vendor Offers Modal */}
      <Modal visible={!!selectedDemand} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <ScrollView style={s.modalCard} contentContainerStyle={{ paddingBottom: 32 }}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle} numberOfLines={2}>{selectedDemand?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedDemand(null)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {selectedDemand && (
              <>
                <View style={s.demandMeta}>
                  <MetaRow icon="people-outline" label={selectedDemand.interestedResidents + ' residents interested'} />
                  <MetaRow icon="cube-outline" label={selectedDemand.expectedQty + ' units expected'} />
                  {selectedDemand.preferredPriceMin ? <MetaRow icon="pricetag-outline" label={'₹' + selectedDemand.preferredPriceMin + '–₹' + selectedDemand.preferredPriceMax + ' preferred'} /> : null}
                  {selectedDemand.preferredBrand ? <MetaRow icon="storefront-outline" label={'Brand: ' + selectedDemand.preferredBrand} /> : null}
                </View>
                {selectedDemand.vendorOffers.length > 0 ? (
                  <View style={{ gap: 10, marginTop: 12 }}>
                    <Text style={s.offersTitle}>Vendor Offers (sorted by price)</Text>
                    {[...selectedDemand.vendorOffers].sort((a, b) => (a.offeredPrice ?? a.pricePerUnit ?? 0) - (b.offeredPrice ?? b.pricePerUnit ?? 0)).map(offer => (
                      <VendorOfferCard key={offer.id} offer={offer} onSelect={() => { setSelectedDemand(null); }} />
                    ))}
                  </View>
                ) : (
                  <View style={s.noOffers}>
                    <Ionicons name="time-outline" size={32} color={COLORS.textMuted} />
                    <Text style={s.noOffersText}>No vendor offers yet. We'll notify you when vendors respond!</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StatBox({ num, label }: { num: string; label: string }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statNum}>{num}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function MetaRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={s.metaRow}>
      <Ionicons name={icon as any} size={14} color={COLORS.textMuted} />
      <Text style={s.metaRowText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 32 },
  hero: { padding: 20, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4, lineHeight: 18 },
  proposeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  proposeBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  heroStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 10 },
  heroDiv: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  catScroll: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, flexDirection: 'row', gap: 8 },
  catChip: { borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  catChipTextActive: { color: '#fff', fontWeight: '700' },
  section: { paddingHorizontal: SPACING.md, marginTop: SPACING.md, gap: SPACING.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  proposeBtn2: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 12 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, gap: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  cardHeader: { flexDirection: 'row', gap: 10 },
  statusPill: { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardDesc: { fontSize: 13, color: COLORS.textMuted, marginTop: 3 },
  upvoteBtn: { width: 48, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.primary, paddingVertical: 8 },
  upvoteBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  upvoteCount: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  upvoteCountActive: { color: '#fff' },
  cardMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaItem: { fontSize: 12, color: COLORS.textSecondary },
  progressTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 11, color: COLORS.textMuted },
  offerTeaser: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 8, padding: 8 },
  offerTeaserText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.background, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, flex: 1, marginRight: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  field: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text, marginBottom: 12 },
  fieldMulti: { height: 80, textAlignVertical: 'top' },
  fieldRow: { flexDirection: 'row', gap: 10 },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  demandMeta: { gap: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: 12 },
  metaRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  metaRowText: { fontSize: 13, color: COLORS.text },
  offersTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  noOffers: { alignItems: 'center', gap: 12, padding: 32 },
  noOffersText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
});