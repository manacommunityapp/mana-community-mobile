import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Modal, Switch,
  RefreshControl, Alert, ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import { hrmService } from '@/services/hrmService';
import { useHrmOrg } from '@/hooks/useHrmOrg';
import type { MwDutyHandover, MwOperationalAssignment } from '@/types/hrm';

// ── Helpers ──────────────────────────────────────────────────────────

const MODULE_COLOR: Record<string, { bg: string; text: string }> = {
  POOL:        { bg: '#DBEAFE', text: '#1E40AF' },
  JOBS:        { bg: '#EDE9FE', text: '#5B21B6' },
  MANA_FRESH:  { bg: '#FEF3C7', text: '#92400E' },
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  ASSIGNED:    { bg: '#FEF9C3', text: '#713F12' },
  IN_PROGRESS: { bg: '#DBEAFE', text: '#1E40AF' },
  COMPLETED:   { bg: '#D1FAE5', text: '#065F46' },
  CANCELLED:   { bg: '#F1F5F9', text: '#64748B' },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── New Handover Modal ───────────────────────────────────────────────

function NewHandoverModal({ orgId, onClose }: { orgId: number; onClose: () => void }) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [pendingTasks, setPendingTasks] = useState('');
  const [equipmentStatus, setEquipmentStatus] = useState('');
  const [incidentFlag, setIncidentFlag] = useState(false);
  const [incidentDesc, setIncidentDesc] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => hrmService.createHandover(orgId, {
      handoverFromEmployeeId: fromId ? Number(fromId) : undefined,
      handoverToEmployeeId: toId ? Number(toId) : undefined,
      location: location || undefined,
      notes: notes || undefined,
      pendingTasks: pendingTasks || undefined,
      equipmentStatus: equipmentStatus || undefined,
      incidentFlag,
      incidentDesc: incidentFlag ? incidentDesc : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['handovers'] }); onClose(); },
    onError: () => Alert.alert('Error', 'Failed to create handover'),
  });

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalBox} contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
          <Text style={styles.modalTitle}>New Duty Handover</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>From Employee ID</Text>
              <TextInput value={fromId} onChangeText={setFromId} keyboardType="numeric"
                style={styles.input} placeholder="ID" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>To Employee ID</Text>
              <TextInput value={toId} onChangeText={setToId} keyboardType="numeric"
                style={styles.input} placeholder="ID" />
            </View>
          </View>
          <Text style={styles.label}>Location</Text>
          <TextInput value={location} onChangeText={setLocation} style={styles.input} placeholder="Branch / area" />
          <Text style={styles.label}>Notes</Text>
          <TextInput value={notes} onChangeText={setNotes} multiline numberOfLines={3}
            style={[styles.input, { height: 60, textAlignVertical: 'top' }]} placeholder="Handover notes..." />
          <Text style={styles.label}>Pending Tasks</Text>
          <TextInput value={pendingTasks} onChangeText={setPendingTasks} multiline numberOfLines={2}
            style={[styles.input, { height: 50, textAlignVertical: 'top' }]} placeholder="Outstanding items..." />
          <Text style={styles.label}>Equipment Status</Text>
          <TextInput value={equipmentStatus} onChangeText={setEquipmentStatus} style={styles.input} placeholder="All OK / details..." />
          <View style={[styles.row, { alignItems: 'center', gap: 10 }]}>
            <Switch value={incidentFlag} onValueChange={setIncidentFlag} trackColor={{ true: '#EF4444' }} />
            <Text style={{ ...FONTS.sm, color: incidentFlag ? '#DC2626' : COLORS.textSecondary, fontWeight: '600' }}>Flag Incident</Text>
          </View>
          {incidentFlag && (
            <>
              <Text style={styles.label}>Incident Description</Text>
              <TextInput value={incidentDesc} onChangeText={setIncidentDesc} multiline numberOfLines={2}
                style={[styles.input, { height: 50, textAlignVertical: 'top' }]} placeholder="Describe what happened..." />
            </>
          )}
          <View style={styles.modalBtns}>
            <TouchableOpacity onPress={onClose} style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => mutation.mutate()} disabled={mutation.isPending} style={styles.btnPrimary}>
              {mutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnPrimaryText}>Create</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Handover Card ────────────────────────────────────────────────────

function HandoverCard({ item, orgId }: { item: MwDutyHandover; orgId: number }) {
  const qc = useQueryClient();
  const ack = useMutation({
    mutationFn: () => hrmService.acknowledgeHandover(orgId, item.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['handovers'] }),
  });
  const fromName = item.handoverFrom ? `${item.handoverFrom.firstName} ${item.handoverFrom.lastName}` : '?';
  const toName = item.handoverTo ? `${item.handoverTo.firstName} ${item.handoverTo.lastName}` : '?';

  return (
    <View style={[styles.card, SHADOWS.sm, item.incidentFlag && { borderColor: '#FCA5A5', borderWidth: 1.5 }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{fromName} → {toName}</Text>
        {item.incidentFlag && (
          <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.badgeText, { color: '#991B1B' }]}>⚠ Incident</Text>
          </View>
        )}
      </View>
      {item.location && <Text style={styles.meta}>📍 {item.location}</Text>}
      {item.notes && <Text style={styles.meta} numberOfLines={2}>{item.notes}</Text>}
      {item.incidentFlag && item.incidentDesc && (
        <View style={{ backgroundColor: '#FEF2F2', borderRadius: RADIUS.sm, padding: 8 }}>
          <Text style={{ ...FONTS.xs, color: '#DC2626' }}>{item.incidentDesc}</Text>
        </View>
      )}
      <View style={[styles.row, { justifyContent: 'space-between', marginTop: 4 }]}>
        <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
        {item.acknowledged ? (
          <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.badgeText, { color: '#065F46' }]}>✓ Acknowledged</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={() => ack.mutate()} disabled={ack.isPending} style={styles.btnSmall}>
            <Text style={styles.btnSmallText}>{ack.isPending ? '...' : 'Acknowledge'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Assignment Row ────────────────────────────────────────────────────

function AssignmentRow({ item, orgId }: { item: MwOperationalAssignment; orgId: number }) {
  const qc = useQueryClient();
  const mc = MODULE_COLOR[item.sourceModule] ?? { bg: '#F1F5F9', text: '#475569' };
  const sc = STATUS_COLOR[item.status] ?? STATUS_COLOR.ASSIGNED;

  const startM = useMutation({
    mutationFn: () => hrmService.startAssignment(orgId, item.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
  const completeM = useMutation({
    mutationFn: () => hrmService.completeAssignment(orgId, item.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });

  return (
    <View style={[styles.card, SHADOWS.sm, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
      <View style={[styles.badge, { backgroundColor: mc.bg }]}>
        <Text style={[styles.badgeText, { color: mc.text }]}>{item.sourceModule}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.assignmentType || 'Assignment'} #{item.id}</Text>
        <Text style={styles.meta}>Emp #{item.employeeId}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: sc.bg }]}>
        <Text style={[styles.badgeText, { color: sc.text }]}>{item.status}</Text>
      </View>
      {item.status === 'ASSIGNED' && (
        <TouchableOpacity onPress={() => startM.mutate()} disabled={startM.isPending} style={[styles.btnSmall, { backgroundColor: '#DBEAFE' }]}>
          <Text style={[styles.btnSmallText, { color: '#1D4ED8' }]}>Start</Text>
        </TouchableOpacity>
      )}
      {item.status === 'IN_PROGRESS' && (
        <TouchableOpacity onPress={() => completeM.mutate()} disabled={completeM.isPending} style={[styles.btnSmall, { backgroundColor: '#D1FAE5' }]}>
          <Text style={[styles.btnSmallText, { color: '#065F46' }]}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────

export default function HandoverScreen() {
  const { activeOrgId } = useHrmOrg();
  const [tab, setTab] = useState<'handovers' | 'assignments'>('handovers');
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const handoversQ = useQuery({
    queryKey: ['handovers', activeOrgId],
    queryFn: () => hrmService.getHandovers(activeOrgId!, today()),
    enabled: !!activeOrgId && tab === 'handovers',
  });

  const assignmentsQ = useQuery({
    queryKey: ['assignments', activeOrgId, statusFilter],
    queryFn: () => hrmService.getOrgAssignments(activeOrgId!, undefined, statusFilter || undefined),
    enabled: !!activeOrgId && tab === 'assignments',
  });

  const renderHandover = useCallback(({ item }: { item: MwDutyHandover }) => (
    <HandoverCard item={item} orgId={activeOrgId!} />
  ), [activeOrgId]);

  const renderAssignment = useCallback(({ item }: { item: MwOperationalAssignment }) => (
    <AssignmentRow item={item} orgId={activeOrgId!} />
  ), [activeOrgId]);

  if (!activeOrgId) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ title: 'Duty Handover' }} />
        <Text style={{ color: COLORS.textSecondary }}>Select an organization.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Duty Handover' }} />

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['handovers', 'assignments'] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'handovers' ? 'Handovers' : 'Assignments'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'handovers' && (
        <>
          <View style={styles.headerRow}>
            <Text style={styles.sectionLabel}>Today's Handovers</Text>
            <TouchableOpacity onPress={() => setShowNew(true)} style={styles.btnPrimary}>
              <Text style={styles.btnPrimaryText}>+ New</Text>
            </TouchableOpacity>
          </View>
          {handoversQ.isLoading ? (
            <ActivityIndicator style={styles.loader} color={COLORS.primary} />
          ) : (
            <FlatList
              data={handoversQ.data ?? []}
              keyExtractor={(i) => String(i.id)}
              renderItem={renderHandover}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={handoversQ.isFetching} onRefresh={() => handoversQ.refetch()} />}
              ListEmptyComponent={<Text style={styles.empty}>No handovers today.</Text>}
            />
          )}
        </>
      )}

      {tab === 'assignments' && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
            {['', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].map((s) => (
              <TouchableOpacity key={s} onPress={() => setStatusFilter(s)}
                style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, statusFilter === s && { color: '#fff' }]}>{s || 'All'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {assignmentsQ.isLoading ? (
            <ActivityIndicator style={styles.loader} color={COLORS.primary} />
          ) : (
            <FlatList
              data={assignmentsQ.data ?? []}
              keyExtractor={(i) => String(i.id)}
              renderItem={renderAssignment}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={assignmentsQ.isFetching} onRefresh={() => assignmentsQ.refetch()} />}
              ListEmptyComponent={<Text style={styles.empty}>No assignments found.</Text>}
            />
          )}
        </>
      )}

      {showNew && <NewHandoverModal orgId={activeOrgId} onClose={() => setShowNew(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: COLORS.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderColor: COLORS.primary },
  tabText: { ...FONTS.sm, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  sectionLabel: { ...FONTS.sm, fontWeight: '600', color: COLORS.text },
  filterRow: { maxHeight: 48 },
  filterChip: { borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 6 },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { ...FONTS.xs, color: COLORS.textSecondary },
  list: { padding: 16, gap: 10 },
  loader: { marginTop: 40 },
  empty: { textAlign: 'center', marginTop: 40, color: COLORS.textSecondary, ...FONTS.sm },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, ...FONTS.sm, fontWeight: '600', color: COLORS.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  meta: { ...FONTS.xs, color: COLORS.textSecondary },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { ...FONTS.xs, fontWeight: '600' },
  btnSmall: { borderRadius: RADIUS.sm, backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 5 },
  btnSmallText: { ...FONTS.xs, color: '#fff', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: 20, maxHeight: '90%',
  },
  modalTitle: { ...FONTS.base, fontWeight: '700', color: COLORS.text },
  label: { ...FONTS.xs, color: COLORS.textSecondary, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 8, ...FONTS.sm, color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  btnPrimary: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  btnPrimaryText: { ...FONTS.sm, color: '#fff', fontWeight: '600' },
  btnSecondary: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, alignItems: 'center' },
  btnSecondaryText: { ...FONTS.sm, color: COLORS.text },
});
