import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  bazaarService, BazaarStall, StallSize, BazaarCategory,
} from '@/services/bazaarService';
import { FONTS, RADIUS, SHADOWS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';

const ACCENT       = '#F97316';
const ACCENT_LIGHT = '#FFF7ED';
const ACCENT_BORDER = '#FED7AA';

const CATEGORY_EMOJI: Record<BazaarCategory, string> = {
  FLEA_MARKET: '🛍️', FOOD_COURT: '🍜', CRAFT_FAIR: '🎨',
  MELA: '🎡', GARAGE_SALE: '🏷️', OTHER: '🏪',
};

const SIZE_LABEL: Record<StallSize, string> = {
  SMALL: 'Small', MEDIUM: 'Medium', LARGE: 'Large',
};

const STALL_SIZE_PX: Record<StallSize, number> = {
  SMALL: 44, MEDIUM: 60, LARGE: 76,
};

type Tab = 'stalls' | 'info';

function StallBox({
  stall,
  onPress,
}: {
  stall: BazaarStall;
  onPress: (stall: BazaarStall) => void;
}) {
  const size = STALL_SIZE_PX[stall.size];

  const { bg, border, textColor, icon } = useMemo(() => {
    switch (stall.status) {
      case 'AVAILABLE':   return { bg: '#fff', border: ACCENT_BORDER, textColor: ACCENT, icon: null };
      case 'MY_BOOKING':  return { bg: '#DCFCE7', border: '#86EFAC', textColor: '#15803D', icon: 'checkmark-circle' as const };
      case 'BOOKED':      return { bg: '#F3F4F6', border: '#D1D5DB', textColor: '#9CA3AF', icon: 'lock-closed' as const };
      case 'BLOCKED':     return { bg: '#E5E7EB', border: '#9CA3AF', textColor: '#6B7280', icon: 'ban' as const };
    }
  }, [stall.status]);

  const isSelectable = stall.status === 'AVAILABLE';

  return (
    <TouchableOpacity
      disabled={!isSelectable}
      onPress={() => onPress(stall)}
      style={[
        s.stall,
        { width: size, height: size, backgroundColor: bg, borderColor: border },
        isSelectable && s.stallSelectable,
      ]}
      activeOpacity={0.75}
    >
      {icon ? (
        <Ionicons name={icon} size={stall.size === 'SMALL' ? 14 : 18} color={textColor} />
      ) : (
        <Text style={[s.stallNum, { color: textColor, fontSize: stall.size === 'SMALL' ? 9 : 11 }]}>
          {stall.stallNumber}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function StallGrid({
  stalls,
  onSelect,
}: {
  stalls: BazaarStall[];
  onSelect: (stall: BazaarStall) => void;
}) {
  const rows = useMemo(() => {
    const map = new Map<number, BazaarStall[]>();
    for (const s of stalls) {
      if (!map.has(s.row)) map.set(s.row, []);
      map.get(s.row)!.push(s);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([, cells]) => cells.sort((a, b) => a.column - b.column));
  }, [stalls]);

  if (stalls.length === 0) {
    return (
      <View style={s.gridEmpty}>
        <Text style={s.gridEmptyText}>Stall layout not available yet</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.gridScroll}>
      <View style={s.grid}>
        {rows.map((row, ri) => (
          <View key={ri} style={s.gridRow}>
            {row.map(stall => (
              <StallBox key={stall.id} stall={stall} onPress={onSelect} />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Legend() {
  const items = [
    { color: '#fff', border: ACCENT_BORDER, label: 'Available' },
    { color: '#DCFCE7', border: '#86EFAC', label: 'My Booking' },
    { color: '#F3F4F6', border: '#D1D5DB', label: 'Booked' },
    { color: '#E5E7EB', border: '#9CA3AF', label: 'Blocked' },
  ];
  return (
    <View style={s.legend}>
      {items.map(i => (
        <View key={i.label} style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: i.color, borderColor: i.border }]} />
          <Text style={s.legendLabel}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function BazaarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();

  const [tab, setTab]                 = useState<Tab>('stalls');
  const [selectedStall, setSelectedStall] = useState<BazaarStall | null>(null);
  const [stallCategory, setStallCategory] = useState('');
  const [notes, setNotes]             = useState('');

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['bazaar-event', id],
    queryFn: () => bazaarService.getEventById(id!),
    enabled: !!id,
  });

  const { data: stalls = [], isLoading: stallsLoading } = useQuery({
    queryKey: ['bazaar-stalls', id],
    queryFn: () => bazaarService.getStallLayout(id!),
    enabled: !!id,
  });

  const bookMutation = useMutation({
    mutationFn: () =>
      bazaarService.bookStall({
        bazaarId: id!,
        stallId: selectedStall!.id,
        stallCategory,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bazaar-stalls', id] });
      qc.invalidateQueries({ queryKey: ['bazaar-events'] });
      qc.invalidateQueries({ queryKey: ['bazaar-my-bookings'] });
      setSelectedStall(null);
      setStallCategory('');
      setNotes('');
      Alert.alert('🎉 Stall Booked!', `Stall ${selectedStall?.stallNumber} is reserved for you. Check My Bookings for details.`);
    },
    onError: (err: any) => {
      Alert.alert('Booking Failed', err?.message || 'Could not book stall. Please try again.');
    },
  });

  const handleConfirm = () => {
    if (!stallCategory.trim()) {
      Alert.alert('Required', 'Please enter what you plan to sell.');
      return;
    }
    bookMutation.mutate();
  };

  if (eventLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}><ActivityIndicator color={ACCENT} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Text style={s.errorText}>Event not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.backLink}>
            <Text style={{ color: ACCENT, fontFamily: FONTS.displaySemi }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayDate = (() => {
    try {
      return new Date(event.date).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch { return event.date; }
  })();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={THEME.text} />
        </TouchableOpacity>
        <Text style={s.topBarTitle} numberOfLines={1}>{event.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Hero banner */}
      <View style={s.hero}>
        <Text style={s.heroEmoji}>{CATEGORY_EMOJI[event.category]}</Text>
        <View style={s.heroInfo}>
          <Text style={s.heroTitle}>{event.title}</Text>
          <Text style={s.heroMeta}>{displayDate} · {event.startTime}–{event.endTime}</Text>
          <Text style={s.heroVenue}>{event.venue}</Text>
        </View>
        <View style={s.heroStalls}>
          <Text style={s.heroStallNum}>{event.availableStalls}</Text>
          <Text style={s.heroStallLabel}>free stalls</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['stalls', 'info'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'stalls' ? '🗺️  Stall Layout' : 'ℹ️  Details'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {tab === 'stalls' ? (
        <View style={{ flex: 1 }}>
          {stallsLoading ? (
            <View style={s.center}><ActivityIndicator color={ACCENT} /></View>
          ) : (
            <>
              <StallGrid stalls={stalls} onSelect={setSelectedStall} />
              <Legend />
              <View style={s.stallHint}>
                <Ionicons name="hand-left-outline" size={14} color={THEME.muted} />
                <Text style={s.stallHintText}>Tap an available stall to book it</Text>
              </View>
            </>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.infoContent} showsVerticalScrollIndicator={false}>
          <InfoRow icon="calendar-outline" label="Date" value={displayDate} />
          <InfoRow icon="time-outline"    label="Time" value={`${event.startTime} – ${event.endTime}`} />
          <InfoRow icon="location-outline" label="Venue" value={event.venue} />
          <InfoRow icon="pricetag-outline" label="Stall Price" value={`₹${event.stallPrice.toLocaleString('en-IN')} per stall`} />
          <InfoRow icon="storefront-outline" label="Available" value={`${event.availableStalls} of ${event.totalStalls} stalls`} />
          {event.description ? (
            <View style={s.descBox}>
              <Text style={s.descTitle}>About this Bazaar</Text>
              <Text style={s.descText}>{event.description}</Text>
            </View>
          ) : null}
          {event.tags && event.tags.length > 0 && (
            <View style={s.tagsWrap}>
              {event.tags.map(tag => (
                <View key={tag} style={s.tag}>
                  <Text style={s.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Booking modal */}
      <Modal
        visible={!!selectedStall}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedStall(null)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedStall(null)}
        />
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Book Stall {selectedStall?.stallNumber}</Text>

          <View style={s.modalInfoRow}>
            <View style={s.modalInfoItem}>
              <Text style={s.modalInfoLabel}>Size</Text>
              <Text style={s.modalInfoValue}>{selectedStall ? SIZE_LABEL[selectedStall.size] : ''}</Text>
            </View>
            <View style={s.modalInfoItem}>
              <Text style={s.modalInfoLabel}>Price</Text>
              <Text style={[s.modalInfoValue, { color: ACCENT }]}>
                ₹{selectedStall?.price.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          <Text style={s.modalFieldLabel}>What will you sell? *</Text>
          <TextInput
            style={s.modalInput}
            placeholder="e.g. Handmade jewellery, Clothes, Books..."
            placeholderTextColor={THEME.muted}
            value={stallCategory}
            onChangeText={setStallCategory}
          />

          <Text style={s.modalFieldLabel}>Notes (optional)</Text>
          <TextInput
            style={[s.modalInput, s.modalInputMulti]}
            placeholder="Any special requirements..."
            placeholderTextColor={THEME.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[s.modalBtn, bookMutation.isPending && { opacity: 0.6 }]}
            onPress={handleConfirm}
            disabled={bookMutation.isPending}
          >
            {bookMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.modalBtnText}>Confirm Booking · ₹{selectedStall?.price.toLocaleString('en-IN')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.modalCancel} onPress={() => setSelectedStall(null)}>
            <Text style={s.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIconWrap}>
        <Ionicons name={icon} size={16} color={ACCENT} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: THEME.background },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:      { fontFamily: FONTS.displaySemi, fontSize: 16, color: THEME.muted, marginBottom: 12 },
  backLink:       { padding: 8 },
  topBar:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: THEME.border },
  backBtn:        { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.lg, backgroundColor: THEME.surfaceMuted },
  topBarTitle:    { flex: 1, fontFamily: FONTS.displayBold, fontSize: 16, color: THEME.text, textAlign: 'center', marginHorizontal: 8 },
  hero:           { backgroundColor: ACCENT_LIGHT, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: ACCENT_BORDER },
  heroEmoji:      { fontSize: 42 },
  heroInfo:       { flex: 1 },
  heroTitle:      { fontFamily: FONTS.displayBold, fontSize: 15, color: THEME.text, marginBottom: 3 },
  heroMeta:       { fontFamily: FONTS.displayReg, fontSize: 12, color: THEME.muted },
  heroVenue:      { fontFamily: FONTS.displayReg, fontSize: 12, color: THEME.muted, marginTop: 2 },
  heroStalls:     { alignItems: 'center' },
  heroStallNum:   { fontFamily: FONTS.displayBold, fontSize: 24, color: ACCENT },
  heroStallLabel: { fontFamily: FONTS.displayReg, fontSize: 11, color: THEME.muted },
  tabs:           { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: THEME.border },
  tab:            { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive:      { borderBottomWidth: 2, borderBottomColor: ACCENT },
  tabText:        { fontFamily: FONTS.displaySemi, fontSize: 13, color: THEME.muted },
  tabTextActive:  { color: ACCENT },
  gridScroll:     { padding: SPACING.lg },
  grid:           { gap: 6 },
  gridRow:        { flexDirection: 'row', gap: 6 },
  gridEmpty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  gridEmptyText:  { fontFamily: FONTS.displayReg, fontSize: 14, color: THEME.muted },
  stall:          { alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.sm, borderWidth: 1.5 },
  stallSelectable:{ ...SHADOWS.sm },
  stallNum:       { fontFamily: FONTS.displayBold },
  legend:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:      { width: 14, height: 14, borderRadius: 3, borderWidth: 1.5 },
  legendLabel:    { fontFamily: FONTS.displayReg, fontSize: 12, color: THEME.muted },
  stallHint:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  stallHintText:  { fontFamily: FONTS.displayReg, fontSize: 12, color: THEME.muted },
  infoContent:    { padding: SPACING.lg, gap: 4 },
  infoRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: THEME.border },
  infoIconWrap:   { width: 32, height: 32, borderRadius: RADIUS.md, backgroundColor: ACCENT_LIGHT, alignItems: 'center', justifyContent: 'center' },
  infoLabel:      { fontFamily: FONTS.displayReg, fontSize: 12, color: THEME.muted, marginBottom: 2 },
  infoValue:      { fontFamily: FONTS.displaySemi, fontSize: 14, color: THEME.text },
  descBox:        { marginTop: 16, backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: THEME.border },
  descTitle:      { fontFamily: FONTS.displayBold, fontSize: 14, color: THEME.text, marginBottom: 8 },
  descText:       { fontFamily: FONTS.displayReg, fontSize: 14, color: THEME.muted, lineHeight: 21 },
  tagsWrap:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag:            { backgroundColor: ACCENT_LIGHT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: ACCENT_BORDER },
  tagText:        { fontFamily: FONTS.displayReg, fontSize: 12, color: ACCENT },
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: THEME.border, alignSelf: 'center', marginBottom: 16 },
  modalTitle:     { fontFamily: FONTS.displayBold, fontSize: 18, color: THEME.text, marginBottom: 14 },
  modalInfoRow:   { flexDirection: 'row', gap: 12, marginBottom: 16 },
  modalInfoItem:  { flex: 1, backgroundColor: THEME.surfaceMuted, borderRadius: RADIUS.lg, padding: SPACING.md },
  modalInfoLabel: { fontFamily: FONTS.displayReg, fontSize: 12, color: THEME.muted, marginBottom: 2 },
  modalInfoValue: { fontFamily: FONTS.displayBold, fontSize: 16, color: THEME.text },
  modalFieldLabel:{ fontFamily: FONTS.displaySemi, fontSize: 13, color: THEME.text, marginBottom: 6, marginTop: 4 },
  modalInput:     { borderWidth: 1, borderColor: THEME.border, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 10, fontFamily: FONTS.displayReg, fontSize: 14, color: THEME.text, backgroundColor: '#fff', marginBottom: 10 },
  modalInputMulti:{ height: 80, textAlignVertical: 'top' },
  modalBtn:       { backgroundColor: ACCENT, borderRadius: RADIUS.xl, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  modalBtnText:   { fontFamily: FONTS.displayBold, fontSize: 15, color: '#fff' },
  modalCancel:    { alignItems: 'center', paddingVertical: 14 },
  modalCancelText:{ fontFamily: FONTS.displaySemi, fontSize: 14, color: THEME.muted },
});
