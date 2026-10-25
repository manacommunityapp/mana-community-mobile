import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '@/hooks/useAuth';
import { sportsTrainerService, SportsTrainerDto, TrainerSlotDto } from '@/services/sportsTrainerService';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function TrainerProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const communityId = (user as any)?.communityId ?? (user as any)?.community?.id;

  // Fetch all trainers and find this one (avoids a separate endpoint)
  const { data: trainers = [], isLoading: loadingTrainers } = useQuery({
    queryKey:  ['sports-trainers', communityId],
    queryFn:   () => sportsTrainerService.listApproved(communityId),
    enabled:   !!communityId,
    staleTime: 2 * 60 * 1000,
  });
  const trainer: SportsTrainerDto | undefined = trainers.find(t => String(t.id) === id);

  const { data: slots = [], isLoading: loadingSlots, refetch, isRefetching } = useQuery({
    queryKey:  ['trainer-slots', id],
    queryFn:   () => sportsTrainerService.getSlots(Number(id)),
    enabled:   !!id,
    staleTime: 60 * 1000,
  });

  const openSlots  = slots.filter(s => s.status === 'OPEN');
  const isLoading  = loadingTrainers || loadingSlots;

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!trainer) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <View style={s.empty}>
          <Text style={s.emptyText}>Trainer not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Trainer Profile</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Profile hero */}
        <View style={s.hero}>
          {trainer.profilePicUrl ? (
            <Image source={{ uri: trainer.profilePicUrl }} style={s.heroAvatar} contentFit="cover" />
          ) : (
            <View style={[s.heroAvatar, s.heroAvatarFallback]}>
              <Text style={{ fontSize: 44 }}>🏅</Text>
            </View>
          )}
          <Text style={s.heroName}>{trainer.fullName}</Text>
          <View style={s.heroBadge}>
            <Text style={s.heroBadgeText}>{trainer.sport}</Text>
          </View>
          {trainer.certBody && (
            <View style={s.certRow}>
              <Ionicons name="ribbon" size={13} color={COLORS.primary} />
              <Text style={s.certText}>
                {trainer.certBody}{trainer.certYear ? ` · ${trainer.certYear}` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Info cards */}
        <View style={s.infoGrid}>
          {trainer.experienceYears ? (
            <View style={s.infoCard}>
              <Ionicons name="time-outline" size={18} color={COLORS.primary} />
              <Text style={s.infoValue}>{trainer.experienceYears}y</Text>
              <Text style={s.infoLabel}>Experience</Text>
            </View>
          ) : null}
          {trainer.ageGroupsCoached ? (
            <View style={s.infoCard}>
              <Ionicons name="people-outline" size={18} color={COLORS.primary} />
              <Text style={s.infoValue}>{trainer.ageGroupsCoached}</Text>
              <Text style={s.infoLabel}>Age Groups</Text>
            </View>
          ) : null}
          <View style={s.infoCard}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
            <Text style={s.infoValue}>{openSlots.length}</Text>
            <Text style={s.infoLabel}>Open Slots</Text>
          </View>
        </View>

        {/* Bio */}
        {trainer.bio ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>About</Text>
            <Text style={s.bio}>{trainer.bio}</Text>
          </View>
        ) : null}

        {/* Slots */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Available Slots</Text>
          {openSlots.length === 0 ? (
            <View style={s.noSlots}>
              <Text style={s.noSlotsText}>No open slots right now</Text>
            </View>
          ) : (
            openSlots.map(slot => (
              <SlotRow key={slot.id} slot={slot} onBook={() =>
                router.push({
                  pathname: '/sports/trainer/book/[slotId]',
                  params: { slotId: slot.id, trainerName: trainer.fullName },
                })
              } />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SlotRow({ slot, onBook }: { slot: TrainerSlotDto; onBook: () => void }) {
  const spots = slot.maxCapacity - slot.bookedCount;
  return (
    <View style={ss.row}>
      <View style={ss.left}>
        <Text style={ss.date}>{formatDate(slot.slotDate)}</Text>
        <Text style={ss.time}>{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</Text>
        <View style={ss.meta}>
          <View style={ss.chip}>
            <Ionicons name={slot.slotType === 'GROUP' ? 'people-outline' : 'person-outline'} size={10} color={COLORS.textMuted} />
            <Text style={ss.chipText}>{slot.slotType === 'GROUP' ? `${spots} spots` : '1-on-1'}</Text>
          </View>
          {slot.venueName && (
            <View style={ss.chip}>
              <Ionicons name="location-outline" size={10} color={COLORS.textMuted} />
              <Text style={ss.chipText}>{slot.venueName}</Text>
            </View>
          )}
          {slot.price > 0 && (
            <View style={ss.chip}>
              <Text style={ss.chipText}>₹{slot.price}</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity style={ss.bookBtn} onPress={onBook} activeOpacity={0.8}>
        <Text style={ss.bookBtnText}>Book</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: COLORS.background },
  header:            {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle:       { fontSize: 16, fontWeight: '700', color: COLORS.text },
  hero:              { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  heroAvatar:        { width: 90, height: 90, borderRadius: 22, marginBottom: 12 },
  heroAvatarFallback:{ backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  heroName:          { fontSize: 20, fontWeight: '800', color: COLORS.text },
  heroBadge:         {
    backgroundColor: COLORS.primaryLight, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 6,
  },
  heroBadgeText:     { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  certRow:           { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  certText:          { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  infoGrid:          { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  infoCard:          {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderSlate,
    gap: 4, ...SHADOWS.sm,
  },
  infoValue:         { fontSize: 14, fontWeight: '800', color: COLORS.text },
  infoLabel:         { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  section:           { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle:      { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  bio:               { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  noSlots:           { alignItems: 'center', paddingVertical: 24 },
  noSlotsText:       { fontSize: 13, color: COLORS.textMuted },
  empty:             { alignItems: 'center', paddingTop: 80 },
  emptyText:         { fontSize: 15, color: COLORS.textMuted },
});

const ss = StyleSheet.create({
  row:       {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.borderSlate,
    ...SHADOWS.sm,
  },
  left:      { flex: 1, gap: 3 },
  date:      { fontSize: 13, fontWeight: '700', color: COLORS.text },
  time:      { fontSize: 12, color: COLORS.textSecondary },
  meta:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip:      {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.backgroundAlt, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  chipText:  { fontSize: 10, color: COLORS.textMuted },
  bookBtn:   {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 9,
  },
  bookBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
