import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { THEME as BASE_THEME } from '@/constants/theme';

const THEME = {
  ...BASE_THEME,
  colors: {
    text: COLORS.text,
    textSecondary: COLORS.textSecondary,
    background: COLORS.background,
    surface: COLORS.surface,
    divider: COLORS.border,
    border: COLORS.border,
  },
};
import type { SportsChallengeDto, SportType } from '@/types/api';

const SPORTS_FILTERS: { label: string; value: SportType | 'ALL'; emoji: string }[] = [
  { label: 'All',           value: 'ALL',          emoji: '⚡' },
  { label: 'Badminton',     value: 'BADMINTON',    emoji: '🏸' },
  { label: 'Cricket',       value: 'CRICKET',      emoji: '🏏' },
  { label: 'Table Tennis',  value: 'TABLE_TENNIS', emoji: '🏓' },
  { label: 'Tennis',        value: 'TENNIS',       emoji: '🎾' },
  { label: 'Football',      value: 'FOOTBALL',     emoji: '⚽' },
];

export default function SportsChallengesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedSport, setSelectedSport] = useState<SportType | 'ALL'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState<SportType>('BADMINTON');
  const [format, setFormat] = useState('');
  const [venue, setVenue] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');

  const { data: challenges = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sports-challenges', selectedSport],
    queryFn: () => sportsService.getChallenges(selectedSport === 'ALL' ? undefined : selectedSport),
  });

  const createMutation = useMutation({
    mutationFn: sportsService.createChallenge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sports-challenges'] });
      setShowCreateModal(false);
      resetForm();
      Alert.alert('Challenge Created', 'Your open challenge has been broadcasted to the community!');
    },
    onError: (err: any) => {
      Alert.alert('Failed', err?.message || 'Could not post challenge');
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (id: number) => sportsService.acceptChallenge(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['sports-challenges'] });
      Alert.alert(
        'Match Confirmed! 🤝',
        `You accepted ${updated.title} against ${updated.creatorName}. See you at ${updated.venue}!`
      );
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not accept challenge');
    },
  });

  function resetForm() {
    setTitle('');
    setSport('BADMINTON');
    setFormat('');
    setVenue('');
    setScheduledTime('');
    setNotes('');
  }

  function handleCreate() {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a challenge title (e.g., Badminton Singles Match)');
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      sport,
      format: format.trim() || 'Friendly Match',
      venue: venue.trim() || 'Community Arena',
      scheduledTime: scheduledTime.trim() || 'Upcoming',
      notes: notes.trim() || undefined,
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Community Challenges</Text>
          <Text style={styles.headerSub}>Open resident vs resident matchups</Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#FFF" />
          <Text style={styles.newBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {SPORTS_FILTERS.map((f) => {
            const active = selectedSport === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedSport(f.value)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13 }}>{f.emoji}</Text>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading challenges...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {challenges.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>⚡</Text>
              <Text style={styles.emptyTitle}>No open challenges yet</Text>
              <Text style={styles.emptySub}>Be the first to challenge a neighbor for a match!</Text>
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={() => setShowCreateModal(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyCtaText}>+ Post New Challenge</Text>
              </TouchableOpacity>
            </View>
          ) : (
            challenges.map((c: SportsChallengeDto) => {
              const isOpen = c.status === 'OPEN';
              return (
                <View key={c.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={[styles.emojiWrap, { backgroundColor: c.bg || '#F5F3FF' }]}>
                      <Text style={{ fontSize: 22 }}>{c.emoji || '🏅'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.cardTitle}>{c.title}</Text>
                      </View>
                      <Text style={styles.cardHost}>Posted by {c.creatorName} {c.creatorFlat ? `(${c.creatorFlat})` : ''}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: isOpen ? '#ECFDF5' : '#EEF2FF' }]}>
                      <Text style={[styles.statusText, { color: isOpen ? '#059669' : '#4F46E5' }]}>
                        {isOpen ? 'OPEN' : 'ACCEPTED'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={14} color="#64748B" />
                      <Text style={styles.detailText}>{c.scheduledTime || 'Flexible Time'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={14} color="#64748B" />
                      <Text style={styles.detailText} numberOfLines={1}>{c.venue || 'Clubhouse Arena'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="people-outline" size={14} color="#64748B" />
                      <Text style={styles.detailText}>{c.format}</Text>
                    </View>
                  </View>

                  {c.notes ? (
                    <Text style={styles.notesText}>💬 {c.notes}</Text>
                  ) : null}

                  {/* Actions */}
                  <View style={styles.cardBottom}>
                    {isOpen ? (
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => acceptMutation.mutate(c.id)}
                        disabled={acceptMutation.isPending}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="flash" size={14} color="#FFF" />
                        <Text style={styles.acceptBtnText}>Accept Challenge</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.acceptedBar}>
                        <Ionicons name="checkmark-circle" size={16} color="#059669" />
                        <Text style={styles.acceptedBarText}>
                          Accepted by {c.challengerName || 'Neighbor'} · Ready to play
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Create Challenge Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>New Open Challenge</Text>
                <Text style={styles.modalSub}>Invite neighbors for a pickup match</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} hitSlop={8}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Sport Selector */}
              <Text style={styles.inputLabel}>Select Sport</Text>
              <View style={styles.sportSelector}>
                {[
                  { key: 'BADMINTON', emoji: '🏸', label: 'Badminton' },
                  { key: 'CRICKET',   emoji: '🏏', label: 'Cricket' },
                  { key: 'TABLE_TENNIS', emoji: '🏓', label: 'TT' },
                  { key: 'TENNIS',    emoji: '🎾', label: 'Tennis' },
                  { key: 'FOOTBALL',  emoji: '⚽', label: 'Football' },
                ].map((s) => {
                  const sel = sport === s.key;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.sportPickBtn, sel && styles.sportPickBtnActive]}
                      onPress={() => setSport(s.key as SportType)}
                    >
                      <Text style={{ fontSize: 16 }}>{s.emoji}</Text>
                      <Text style={[styles.sportPickText, sel && styles.sportPickTextActive]}>{s.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Title */}
              <Text style={styles.inputLabel}>Challenge Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 1v1 Badminton Friendly Match"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />

              {/* Format */}
              <Text style={styles.inputLabel}>Format / Game Type</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 1v1 Friendly, 2v2 Doubles, 6v6 Box"
                placeholderTextColor="#94A3B8"
                value={format}
                onChangeText={setFormat}
              />

              {/* Venue */}
              <Text style={styles.inputLabel}>Preferred Venue</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Clubhouse Badminton Court 1"
                placeholderTextColor="#94A3B8"
                value={venue}
                onChangeText={setVenue}
              />

              {/* Time */}
              <Text style={styles.inputLabel}>Target Day & Time</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Today 7:30 PM, Saturday 8:00 AM"
                placeholderTextColor="#94A3B8"
                value={scheduledTime}
                onChangeText={setScheduledTime}
              />

              {/* Notes */}
              <Text style={styles.inputLabel}>Extra Notes (Skill Level / Equipment)</Text>
              <TextInput
                style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                placeholder="e.g. Intermediate level, bringing nylon shuttles"
                placeholderTextColor="#94A3B8"
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.createSubmitBtn}
              onPress={handleCreate}
              disabled={createMutation.isPending}
              activeOpacity={0.85}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.createSubmitText}>Post Open Challenge ⚡</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.surface,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  headerSub: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontFamily: FONTS.regular,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  newBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  filterBar: {
    backgroundColor: THEME.surface,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#64748B',
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    ...SHADOWS.sm,
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  cardHost: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11.5,
    color: '#475569',
    fontFamily: FONTS.medium,
  },
  notesText: {
    fontSize: 11.5,
    color: '#64748B',
    fontStyle: 'italic',
  },
  cardBottom: {
    marginTop: 2,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  acceptBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  acceptedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  acceptedBarText: {
    fontSize: 12,
    color: '#059669',
    fontFamily: FONTS.medium,
    fontWeight: '600',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  emptyCta: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
  },
  emptyCtaText: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  modalSub: {
    fontSize: 11.5,
    color: THEME.textSecondary,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  sportSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  sportPickBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: COLORS.primary,
  },
  sportPickText: {
    fontSize: 11.5,
    fontFamily: FONTS.medium,
    color: '#64748B',
  },
  sportPickTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  createSubmitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  createSubmitText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
});
