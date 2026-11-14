import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import { hrmService } from '@/services/hrmService';
import { useHrmOrg } from '@/hooks/useHrmOrg';
import type { MwPoolListing, MwPoolApplication, PoolListingStatus, PoolApplicationStatus } from '@/types/hrm';

// ── Status colors ────────────────────────────────────────────────────

const LISTING_STATUS_COLOR: Record<PoolListingStatus, { bg: string; text: string }> = {
  OPEN:   { bg: '#D1FAE5', text: '#065F46' },
  FILLED: { bg: '#DBEAFE', text: '#1E40AF' },
  CLOSED: { bg: '#F1F5F9', text: '#64748B' },
};

const APP_STATUS_COLOR: Record<PoolApplicationStatus, { bg: string; text: string }> = {
  APPLIED:   { bg: '#FEF9C3', text: '#713F12' },
  ACCEPTED:  { bg: '#D1FAE5', text: '#065F46' },
  REJECTED:  { bg: '#FEE2E2', text: '#991B1B' },
  WITHDRAWN: { bg: '#F1F5F9', text: '#64748B' },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Listing Card ─────────────────────────────────────────────────────

function ListingCard({
  item,
  onPress,
  onClose,
  showActions,
}: {
  item: MwPoolListing;
  onPress?: () => void;
  onClose?: () => void;
  showActions: boolean;
}) {
  const sc = LISTING_STATUS_COLOR[item.status] ?? LISTING_STATUS_COLOR.CLOSED;
  return (
    <View style={[styles.card, SHADOWS.sm]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={[styles.badge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>📅 {fmt(item.shiftDate)}</Text>
        <Text style={styles.metaText}>⏰ {item.shiftStart}–{item.shiftEnd}</Text>
        {item.location ? <Text style={styles.metaText}>📍 {item.location}</Text> : null}
        {item.payRate ? (
          <Text style={styles.metaText}>
            💰 ₹{item.payRate}/{item.payType === 'HOURLY' ? 'hr' : item.payType === 'DAILY' ? 'day' : 'fixed'}
          </Text>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.fillBadge}>
          <Text style={styles.fillText}>👥 {item.acceptedCount}/{item.maxWorkers}</Text>
        </View>
        {showActions && (
          <View style={styles.cardActions}>
            {onPress && (
              <TouchableOpacity style={styles.btnSecondary} onPress={onPress}>
                <Text style={styles.btnSecondaryText}>Applicants</Text>
              </TouchableOpacity>
            )}
            {onClose && item.status !== 'CLOSED' && (
              <TouchableOpacity style={styles.btnDanger} onPress={onClose}>
                <Text style={styles.btnDangerText}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ── Open Shifts Tab (employer) ───────────────────────────────────────

function OpenShiftsTab({ orgId }: { orgId: number }) {
  const qc = useQueryClient();
  const [selectedListing, setSelectedListing] = useState<MwPoolListing | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { data: listings = [], isLoading, refetch } = useQuery<MwPoolListing[]>({
    queryKey: ['pool-listings', orgId],
    queryFn: () => hrmService.getPoolListings(orgId),
  });

  const { data: applications = [], isLoading: appsLoading } = useQuery<MwPoolApplication[]>({
    queryKey: ['pool-applications', orgId, selectedListing?.id],
    queryFn: () => hrmService.getListingApplications(orgId, selectedListing!.id),
    enabled: !!selectedListing,
  });

  const closeMut = useMutation({
    mutationFn: (listingId: number) => hrmService.closePoolListing(orgId, listingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pool-listings', orgId] }),
    onError: () => Alert.alert('Error', 'Failed to close listing'),
  });

  const respondMut = useMutation({
    mutationFn: ({ appId, action }: { appId: number; action: 'accept' | 'reject' }) =>
      hrmService.respondToPoolApplication(orgId, selectedListing!.id, appId, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pool-applications', orgId, selectedListing?.id] });
      qc.invalidateQueries({ queryKey: ['pool-listings', orgId] });
    },
    onError: () => Alert.alert('Error', 'Failed to respond to application'),
  });

  if (isLoading) {
    return <ActivityIndicator style={styles.centered} color={COLORS.primary} />;
  }

  return (
    <>
      <FlatList
        data={listings}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No shift listings yet</Text>
            <Text style={styles.emptyHint}>Use "Post Shift" tab to create one</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ListingCard
            item={item}
            showActions
            onPress={() => { setSelectedListing(item); setModalVisible(true); }}
            onClose={() => Alert.alert('Close Listing', 'Mark this listing as closed?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Close', style: 'destructive', onPress: () => closeMut.mutate(item.id) },
            ])}
          />
        )}
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedListing?.title}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {appsLoading ? (
            <ActivityIndicator style={styles.centered} color={COLORS.primary} />
          ) : applications.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No applications yet</Text>
            </View>
          ) : (
            <FlatList
              data={applications}
              keyExtractor={a => String(a.id)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item: app }) => {
                const sc = APP_STATUS_COLOR[app.status as PoolApplicationStatus] ?? APP_STATUS_COLOR.APPLIED;
                return (
                  <View style={[styles.appRow, SHADOWS.sm]}>
                    <View style={styles.appAvatar}>
                      <Text style={styles.appAvatarText}>{app.manaUserId}</Text>
                    </View>
                    <View style={styles.appInfo}>
                      <Text style={styles.appName}>Worker #{app.manaUserId}</Text>
                      {app.workerNote ? <Text style={styles.appNote} numberOfLines={1}>{app.workerNote}</Text> : null}
                    </View>
                    {app.status === 'APPLIED' ? (
                      <View style={styles.appButtons}>
                        <TouchableOpacity
                          style={[styles.btnSmall, { backgroundColor: '#10B981' }]}
                          onPress={() => respondMut.mutate({ appId: app.id, action: 'accept' })}
                          disabled={respondMut.isPending}
                        >
                          <Text style={styles.btnSmallText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.btnSmall, { backgroundColor: '#EF4444' }]}
                          onPress={() => respondMut.mutate({ appId: app.id, action: 'reject' })}
                          disabled={respondMut.isPending}
                        >
                          <Text style={styles.btnSmallText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.badgeText, { color: sc.text }]}>{app.status}</Text>
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

// ── Post Shift Tab ───────────────────────────────────────────────────

function PostShiftTab({ orgId }: { orgId: number }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '', shiftDate: '', shiftStart: '09:00', shiftEnd: '17:00',
    location: '', payRate: '', payType: 'HOURLY', maxWorkers: '1',
    requiredSkills: '', description: '',
  });

  const createMut = useMutation({
    mutationFn: () => hrmService.createPoolListing(orgId, {
      title: form.title, shiftDate: form.shiftDate, shiftStart: form.shiftStart, shiftEnd: form.shiftEnd,
      location: form.location || undefined, payRate: form.payRate ? Number(form.payRate) : undefined,
      payType: form.payType as 'HOURLY' | 'DAILY' | 'FIXED', maxWorkers: Number(form.maxWorkers),
      requiredSkills: form.requiredSkills || undefined, description: form.description || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pool-listings', orgId] });
      Alert.alert('Posted!', 'Shift listing created successfully.');
      setForm({ title: '', shiftDate: '', shiftStart: '09:00', shiftEnd: '17:00', location: '', payRate: '', payType: 'HOURLY', maxWorkers: '1', requiredSkills: '', description: '' });
    },
    onError: () => Alert.alert('Error', 'Failed to post shift'),
  });

  function submit() {
    if (!form.title.trim() || !form.shiftDate.trim()) {
      Alert.alert('Required', 'Title and shift date are required'); return;
    }
    createMut.mutate();
  }

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
      <View style={styles.formGroup}>
        <Text style={styles.fieldLabel}>Shift Title *</Text>
        <TextInput style={styles.input} value={form.title} onChangeText={v => setForm(p => ({ ...p, title: v }))}
          placeholder="e.g. Weekend Security Guard" placeholderTextColor={COLORS.textMuted} />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.fieldLabel}>Shift Date * (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={form.shiftDate} onChangeText={v => setForm(p => ({ ...p, shiftDate: v }))}
          placeholder="2025-12-01" placeholderTextColor={COLORS.textMuted} />
      </View>
      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Start (HH:MM)</Text>
          <TextInput style={styles.input} value={form.shiftStart} onChangeText={v => setForm(p => ({ ...p, shiftStart: v }))}
            placeholder="09:00" placeholderTextColor={COLORS.textMuted} />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>End (HH:MM)</Text>
          <TextInput style={styles.input} value={form.shiftEnd} onChangeText={v => setForm(p => ({ ...p, shiftEnd: v }))}
            placeholder="17:00" placeholderTextColor={COLORS.textMuted} />
        </View>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.fieldLabel}>Location</Text>
        <TextInput style={styles.input} value={form.location} onChangeText={v => setForm(p => ({ ...p, location: v }))}
          placeholder="e.g. Chennai HQ" placeholderTextColor={COLORS.textMuted} />
      </View>
      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Pay Rate (₹)</Text>
          <TextInput style={styles.input} value={form.payRate} onChangeText={v => setForm(p => ({ ...p, payRate: v }))}
            placeholder="0" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Max Workers</Text>
          <TextInput style={styles.input} value={form.maxWorkers} onChangeText={v => setForm(p => ({ ...p, maxWorkers: v }))}
            placeholder="1" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
        </View>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.fieldLabel}>Required Skills</Text>
        <TextInput style={[styles.input, styles.textarea]} value={form.requiredSkills}
          onChangeText={v => setForm(p => ({ ...p, requiredSkills: v }))}
          placeholder="e.g. First Aid, Security Licence" placeholderTextColor={COLORS.textMuted}
          multiline numberOfLines={2} />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput style={[styles.input, styles.textarea]} value={form.description}
          onChangeText={v => setForm(p => ({ ...p, description: v }))}
          placeholder="Describe the shift duties..." placeholderTextColor={COLORS.textMuted}
          multiline numberOfLines={3} />
      </View>
      <TouchableOpacity style={[styles.btnPrimary, createMut.isPending && styles.btnDisabled]}
        onPress={submit} disabled={createMut.isPending}>
        {createMut.isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.btnPrimaryText}>Post Shift</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── My Board Tab (worker) ────────────────────────────────────────────

function MyBoardTab() {
  const qc = useQueryClient();
  const [subTab, setSubTab] = useState<'browse' | 'applications'>('browse');
  const [applyTarget, setApplyTarget] = useState<number | null>(null);
  const [applyNote, setApplyNote] = useState('');

  const { data: openListings = [], isLoading: browseLoading, refetch: refetchBrowse } = useQuery<MwPoolListing[]>({
    queryKey: ['pool-open'],
    queryFn: () => hrmService.getOpenPoolListings(),
  });

  const { data: myApps = [], isLoading: appsLoading, refetch: refetchApps } = useQuery<MwPoolApplication[]>({
    queryKey: ['my-pool-applications'],
    queryFn: () => hrmService.getMyPoolApplications(),
  });

  const appliedIds = new Set(myApps.map(a => a.listingId));

  const applyMut = useMutation({
    mutationFn: ({ listingId, note }: { listingId: number; note?: string }) =>
      hrmService.applyToPoolListing(listingId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-pool-applications'] });
      qc.invalidateQueries({ queryKey: ['pool-open'] });
      setApplyTarget(null);
      setApplyNote('');
      Alert.alert('Applied!', 'Your application has been submitted.');
    },
    onError: () => Alert.alert('Error', 'Failed to apply'),
  });

  const consentMut = useMutation({
    mutationFn: (appId: number) => hrmService.consentToContract(appId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-pool-applications'] }); Alert.alert('Done', 'Consent recorded.'); },
    onError: () => Alert.alert('Error', 'Failed to record consent'),
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.subTabBar}>
        {(['browse', 'applications'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.subTabBtn, subTab === t && styles.subTabBtnActive]}
            onPress={() => setSubTab(t)}>
            <Text style={[styles.subTabText, subTab === t && styles.subTabTextActive]}>
              {t === 'browse' ? 'Browse' : `My Apps (${myApps.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {subTab === 'browse' && (
        browseLoading ? (
          <ActivityIndicator style={styles.centered} color={COLORS.primary} />
        ) : (
          <FlatList
            data={openListings}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={false} onRefresh={refetchBrowse} tintColor={COLORS.primary} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No open shifts available</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.card, SHADOWS.sm]}>
                <ListingCard item={item} showActions={false} />
                <View style={styles.applySection}>
                  {appliedIds.has(item.id) ? (
                    <Text style={styles.appliedText}>✓ Applied</Text>
                  ) : applyTarget === item.id ? (
                    <View style={styles.applyForm}>
                      <TextInput
                        style={styles.input}
                        value={applyNote}
                        onChangeText={setApplyNote}
                        placeholder="Add a note (optional)"
                        placeholderTextColor={COLORS.textMuted}
                        multiline
                      />
                      <View style={styles.formRow}>
                        <TouchableOpacity
                          style={[styles.btnPrimary, { flex: 1 }, applyMut.isPending && styles.btnDisabled]}
                          onPress={() => applyMut.mutate({ listingId: item.id, note: applyNote || undefined })}
                          disabled={applyMut.isPending}
                        >
                          <Text style={styles.btnPrimaryText}>{applyMut.isPending ? '...' : 'Confirm'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={() => setApplyTarget(null)}>
                          <Text style={styles.btnSecondaryText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.btnPrimary} onPress={() => setApplyTarget(item.id)}>
                      <Text style={styles.btnPrimaryText}>Apply</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          />
        )
      )}

      {subTab === 'applications' && (
        appsLoading ? (
          <ActivityIndicator style={styles.centered} color={COLORS.primary} />
        ) : (
          <FlatList
            data={myApps}
            keyExtractor={a => String(a.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={false} onRefresh={refetchApps} tintColor={COLORS.primary} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No applications yet</Text>
                <Text style={styles.emptyHint}>Browse and apply to open shifts</Text>
              </View>
            }
            renderItem={({ item: app }) => {
              const sc = APP_STATUS_COLOR[app.status as PoolApplicationStatus] ?? APP_STATUS_COLOR.APPLIED;
              return (
                <View style={[styles.appRow, SHADOWS.sm]}>
                  <View style={styles.appInfo}>
                    <Text style={styles.appName}>Listing #{app.listingId}</Text>
                    <Text style={styles.appNote}>Applied {fmt(app.appliedAt)}</Text>
                    {app.employerNote ? <Text style={[styles.appNote, { fontStyle: 'italic' }]}>"{app.employerNote}"</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.badgeText, { color: sc.text }]}>{app.status}</Text>
                    </View>
                    {app.status === 'ACCEPTED' && (
                      <TouchableOpacity
                        style={[styles.btnSmall, { backgroundColor: '#10B981' }]}
                        onPress={() => consentMut.mutate(app.id)}
                        disabled={consentMut.isPending}
                      >
                        <Text style={styles.btnSmallText}>Consent</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )
      )}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────

type Tab = 'shifts' | 'post' | 'board';

export default function WorkforcePoolScreen() {
  const { activeOrgId } = useHrmOrg();
  const [activeTab, setActiveTab] = useState<Tab>('shifts');

  const TABS: { id: Tab; label: string }[] = [
    { id: 'shifts', label: 'Open Shifts' },
    { id: 'post',   label: 'Post Shift' },
    { id: 'board',  label: 'My Board' },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Workforce Pool', headerShown: true }} />

      <View style={styles.tabBar}>
        {TABS.map(({ id, label }) => (
          <TouchableOpacity
            key={id}
            style={[styles.tabBtn, activeTab === id && styles.tabBtnActive]}
            onPress={() => setActiveTab(id)}
          >
            <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {!activeOrgId && activeTab !== 'board' ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Select an organization to continue</Text>
          </View>
        ) : (
          <>
            {activeTab === 'shifts' && activeOrgId && <OpenShiftsTab orgId={activeOrgId} />}
            {activeTab === 'post' && activeOrgId && <PostShiftTab orgId={activeOrgId} />}
            {activeTab === 'board' && <MyBoardTab />}
          </>
        )}
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.borderSlate },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },
  subTabBar: { flexDirection: 'row', backgroundColor: COLORS.backgroundAlt, margin: 12, borderRadius: RADIUS.md, padding: 3 },
  subTabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm },
  subTabBtnActive: { backgroundColor: COLORS.surface },
  subTabText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textSecondary },
  subTabTextActive: { color: COLORS.primary },
  listContent: { padding: 12, gap: 10 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, marginBottom: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.text },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  metaText: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  cardActions: { flexDirection: 'row', gap: 8 },
  fillBadge: { backgroundColor: COLORS.backgroundAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  fillText: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textSecondary },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  badgeText: { fontSize: 10, fontFamily: FONTS.semiBold, textTransform: 'uppercase' },
  btnPrimary: { backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADIUS.md, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontFamily: FONTS.semiBold },
  btnDisabled: { opacity: 0.5 },
  btnSecondary: { borderWidth: 1, borderColor: COLORS.border, paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADIUS.md, alignItems: 'center' },
  btnSecondaryText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textSecondary },
  btnDanger: { borderWidth: 1, borderColor: '#EF4444', paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADIUS.md, alignItems: 'center' },
  btnDangerText: { fontSize: 12, fontFamily: FONTS.medium, color: '#EF4444' },
  btnSmall: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm },
  btnSmallText: { fontSize: 11, fontFamily: FONTS.semiBold, color: '#fff' },
  tabContent: { flex: 1 },
  formContent: { padding: 16, gap: 2, paddingBottom: 40 },
  formGroup: { marginBottom: 12 },
  formRow: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderSlate, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.text },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyText: { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: 4 },
  emptyHint: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textMuted, textAlign: 'center' },
  applySection: { marginTop: 10 },
  applyForm: { gap: 8 },
  appliedText: { fontSize: 13, fontFamily: FONTS.semiBold, color: '#10B981' },
  appRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12, marginBottom: 8 },
  appAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.backgroundAlt, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  appAvatarText: { fontSize: 11, fontFamily: FONTS.semiBold, color: COLORS.textSecondary },
  appInfo: { flex: 1 },
  appName: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.text },
  appNote: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
  appButtons: { flexDirection: 'row', gap: 6 },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderSlate },
  modalTitle: { fontSize: 16, fontFamily: FONTS.semiBold, color: COLORS.text, flex: 1 },
  modalClose: { padding: 4 },
  modalCloseText: { fontSize: 16, color: COLORS.textSecondary },
});
