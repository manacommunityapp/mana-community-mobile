import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventTaskService } from '@/services/eventTaskService';
import { useAppBack } from '@/hooks/useAppBack';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const PHASES = ['Planning', 'Pre-Event', 'Event Day', 'Post-Event'];

export default function EventTasksScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const eventId = Number(id);

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState(PRIORITIES[1]);
  const [phase, setPhase] = useState(PHASES[0]);
  const [assignee, setAssignee] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const { goBack } = useAppBack({
    fallbackRoute: id ? `/events/${id}` : '/events',
    onBeforeBack: () => {
      if (showAdd) {
        setShowAdd(false);
        return true;
      }
    },
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['event-tasks', eventId],
    queryFn: () => eventTaskService.getAll(eventId),
    enabled: !!eventId,
  });

  const toggleMutation = useMutation({
    mutationFn: (taskId: number) => eventTaskService.toggleDone(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-tasks', eventId] });
    },
  });

  const addMutation = useMutation({
    mutationFn: () =>
      eventTaskService.create({
        eventId,
        title: title.trim(),
        priority,
        phase,
        assigneeName: assignee.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-tasks', eventId] });
      setTitle('');
      setAssignee('');
      setShowAdd(false);
      Alert.alert('Task Created', 'Organizer task has been added.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not create task.');
    },
  });

  const completedCount = tasks.filter((t) => t.done).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Organizer Tasks</Text>
        <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={s.addBtn}>
          <Ionicons name={showAdd ? 'close' : 'add'} size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Progress Card */}
        <View style={s.progressCard}>
          <View style={s.progressHeader}>
            <Text style={s.progressTitle}>Readiness Progress</Text>
            <Text style={s.progressPct}>{progressPct}%</Text>
          </View>
          <View style={s.progressBarTrack}>
            <View style={[s.progressBarFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={s.progressSub}>{completedCount} of {tasks.length} tasks completed</Text>
        </View>

        {/* Add Task Form */}
        {showAdd && (
          <View style={s.formCard}>
            <Text style={s.formTitle}>Add New Task</Text>

            <Text style={s.inputLabel}>Task Title</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Confirm audio technician"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={s.inputLabel}>Assignee Name (Optional)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Rahul Sharma"
              value={assignee}
              onChangeText={setAssignee}
            />

            <Text style={s.inputLabel}>Phase</Text>
            <View style={s.pillsWrap}>
              {PHASES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[s.pill, phase === p && s.pillActive]}
                  onPress={() => setPhase(p)}
                >
                  <Text style={[s.pillText, phase === p && s.pillTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={s.createBtn}
              onPress={() => addMutation.mutate()}
              disabled={addMutation.isPending || !title.trim()}
            >
              {addMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.createBtnText}>Create Task</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Task List */}
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
        ) : tasks.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="checkbox-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No Tasks Added</Text>
            <Text style={s.emptySub}>Add organizing tasks and assign them to committee members.</Text>
          </View>
        ) : (
          tasks.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[s.taskRow, t.done && s.taskRowDone]}
              onPress={() => toggleMutation.mutate(t.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={t.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={t.done ? '#10B981' : COLORS.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={[s.taskTitle, t.done && s.taskTitleDone]}>{t.title}</Text>
                <View style={s.taskMeta}>
                  {t.phase && <Text style={s.phaseBadge}>{t.phase}</Text>}
                  {t.assigneeName && <Text style={s.assigneeText}>👤 {t.assigneeName}</Text>}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', fontWeight: 'bold', color: COLORS.text },
  addBtn: { padding: 4 },
  content: { padding: 16 },
  progressCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 16, ...SHADOWS.sm,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },
  progressPct: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  progressBarTrack: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  progressSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 6 },
  formCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 16, ...SHADOWS.sm,
  },
  formTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, fontSize: 13, backgroundColor: '#F9FAFB' },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F9FAFB',
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 11, fontWeight: '600', color: COLORS.text },
  pillTextActive: { color: '#fff' },
  createBtn: { backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: RADIUS.sm, alignItems: 'center', marginTop: 14 },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 10 },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: 12, marginBottom: 10, gap: 12, ...SHADOWS.sm,
  },
  taskRowDone: { opacity: 0.65 },
  taskTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  taskTitleDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  phaseBadge: { fontSize: 10, fontWeight: '600', color: COLORS.primary, backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  assigneeText: { fontSize: 11, color: COLORS.textMuted },
});
