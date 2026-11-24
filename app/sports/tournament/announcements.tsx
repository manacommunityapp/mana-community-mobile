import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { COLORS } from '@/constants/config';
import { safeFormat } from '@/utils/dateUtils';

type Tab = 'announcements' | 'gallery' | 'timeline';

export default function TournamentAnnouncementsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const tournamentId = Number(id);
  const [tab, setTab] = useState<Tab>('announcements');

  const { data: announcements, isLoading: aLoad } = useQuery({
    queryKey: ['tournament-announcements', tournamentId],
    queryFn:  () => sportsService.getTournamentAnnouncements(tournamentId),
  });
  const { data: gallery, isLoading: gLoad } = useQuery({
    queryKey: ['tournament-gallery', tournamentId],
    queryFn:  () => sportsService.getTournamentGallery(tournamentId),
  });
  const { data: timeline, isLoading: tLoad } = useQuery({
    queryKey: ['tournament-timeline', tournamentId],
    queryFn:  () => sportsService.getTournamentTimeline(tournamentId),
  });

  const isLoading = aLoad || gLoad || tLoad;

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: 'announcements', label: 'Updates', emoji: '📣' },
    { key: 'gallery',       label: 'Gallery',  emoji: '🖼️' },
    { key: 'timeline',      label: 'Timeline', emoji: '📅' },
  ];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Tournament Info</Text>
      </View>

      {/* Tab bar */}
      <View style={s.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={s.tabEmoji}>{t.emoji}</Text>
            <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Announcements */}
          {tab === 'announcements' && (
            (announcements?.length ?? 0) === 0 ? (
              <EmptyState emoji="📣" text="No announcements yet" />
            ) : (
              announcements!.map((a) => (
                <View key={a.id} style={s.card}>
                  <View style={s.cardHeader}>
                    {a.icon ? <Text style={s.cardIcon}>{a.icon}</Text> : null}
                    <Text style={s.cardTitle}>{a.title}</Text>
                  </View>
                  {a.content ? <Text style={s.cardBody}>{a.content}</Text> : null}
                  {a.createdAt && (
                    <Text style={s.cardDate}>{safeFormat(a.createdAt, 'dd MMM yyyy · HH:mm')}</Text>
                  )}
                </View>
              ))
            )
          )}

          {/* Gallery */}
          {tab === 'gallery' && (
            (gallery?.length ?? 0) === 0 ? (
              <EmptyState emoji="🖼️" text="No photos yet" />
            ) : (
              <View style={s.grid}>
                {gallery!.map((img) => (
                  <View key={img.id} style={[s.gridItem, img.bgColor ? { backgroundColor: img.bgColor } : {}]}>
                    <Image
                      source={{ uri: img.imageUrl }}
                      style={s.gridImage}
                      resizeMode="cover"
                    />
                    {img.title ? (
                      <View style={s.gridOverlay}>
                        <Text style={s.gridTitle} numberOfLines={1}>{img.title}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )
          )}

          {/* Timeline */}
          {tab === 'timeline' && (
            (timeline?.length ?? 0) === 0 ? (
              <EmptyState emoji="📅" text="No timeline entries" />
            ) : (
              timeline!.map((entry, index) => (
                <View key={entry.id} style={s.timelineRow}>
                  <View style={s.timelineLine}>
                    <View style={s.timelineDot} />
                    {index < (timeline!.length - 1) && <View style={s.timelineConnector} />}
                  </View>
                  <View style={s.timelineContent}>
                    <Text style={s.timelineDate}>{entry.dateLabel || (entry.entryDate ? safeFormat(entry.entryDate, 'dd MMM yyyy') : '')}</Text>
                    <Text style={s.timelineTitle}>{entry.title}</Text>
                    {entry.description ? <Text style={s.timelineDesc}>{entry.description}</Text> : null}
                  </View>
                </View>
              ))
            )
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={es.wrap}>
      <Text style={es.icon}>{emoji}</Text>
      <Text style={es.text}>{text}</Text>
    </View>
  );
}
const es = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  icon: { fontSize: 40 },
  text: { fontSize: 14, color: COLORS.textMuted },
});

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.background },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:             { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:            { fontSize: 18, fontFamily: 'Outfit-Bold', fontWeight: '700', color: COLORS.text, flex: 1 },
  tabs:             { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:              { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12 },
  tabActive:        { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabEmoji:         { fontSize: 15 },
  tabLabel:         { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabLabelActive:   { color: COLORS.primary },
  scroll:           { padding: 16, gap: 12 },
  // announcements
  card:             { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  cardHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon:         { fontSize: 20 },
  cardTitle:        { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  cardBody:         { fontSize: 13, color: COLORS.text, lineHeight: 20 },
  cardDate:         { fontSize: 11, color: COLORS.textMuted },
  // gallery
  grid:             { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem:         { width: '48%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  gridImage:        { width: '100%', height: '100%' },
  gridOverlay:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 5 },
  gridTitle:        { fontSize: 11, fontWeight: '600', color: '#fff' },
  // timeline
  timelineRow:      { flexDirection: 'row', gap: 12 },
  timelineLine:     { alignItems: 'center', width: 20 },
  timelineDot:      { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary, marginTop: 4 },
  timelineConnector:{ flex: 1, width: 2, backgroundColor: COLORS.border, marginVertical: 4 },
  timelineContent:  { flex: 1, paddingBottom: 20, gap: 2 },
  timelineDate:     { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  timelineTitle:    { fontSize: 15, fontWeight: '700', color: COLORS.text },
  timelineDesc:     { fontSize: 13, color: COLORS.text, lineHeight: 19, marginTop: 2 },
});
