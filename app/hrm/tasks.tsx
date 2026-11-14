import { useCallback } from 'react';
import { useHrmOrg } from '@/hooks/useHrmOrg';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/common/Header';
import { hrmService } from '@/services/hrmService';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import type { HrTask } from '@/types/hrm';
import { TouchableOpacity } from 'react-native';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: COLORS.textSecondary,
  MEDIUM: COLORS.primary,
  HIGH: '#F97316',
  URGENT: COLORS.error,
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#D97706',
  IN_PROGRESS: COLORS.primary,
  DONE: COLORS.success,
};

function TaskCard({ item, onStatusChange }: { item: HrTask; onStatusChange: (id: number, status: string) => void }) {
  const nextStatus = item.status === 'OPEN' ? 'IN_PROGRESS' : item.status === 'IN_PROGRESS' ? 'DONE' : null;
  const nextLabel = item.status === 'OPEN' ? 'Start' : item.status === 'IN_PROGRESS' ? 'Mark Done' : null;

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={[styles.priority, { color: PRIORITY_COLORS[item.priority] }]}>{item.priority}</Text>
        <Text style={[styles.status, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      {item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
      <View style={styles.rowBetween}>
        {item.dueDate ? <Text style={styles.due}>Due {item.dueDate}</Text> : <View />}
        {nextStatus && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => onStatusChange(item.id, nextStatus)}>
            <Text style={styles.actionBtnText}>{nextLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      {item.assignedBy && <Text style={styles.meta}>Assigned by {item.assignedBy.firstName} {item.assignedBy.lastName ?? ''}</Text>}
    </View>
  );
}

export default function TasksScreen() {
  const qc = useQueryClient();
  const { activeOrgId: orgId, initialize } = useHrmOrg();
  useEffect(() => { initialize(); }, []);

  const { data: tasks, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hrm-my-tasks', orgId],
    queryFn: () => hrmService.getMyTasks(orgId!),
    enabled: !!orgId,
  });

  const updateStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: string }) => hrmService.updateTaskStatus(orgId!, taskId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hrm-my-tasks'] }),
    onError: () => Alert.alert('Error', 'Failed to update task status.'),
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Header title="My Tasks" showBack />
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={tasks ?? []}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <TaskCard item={item} onStatusChange={(id, status) => updateStatus.mutate({ taskId: id, status })} />
          )}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={COLORS.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>No tasks assigned to you.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 14, ...SHADOWS.sm, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priority: { ...FONTS.semibold, fontSize: 11 },
  status: { ...FONTS.medium, fontSize: 11 },
  title: { ...FONTS.semibold, fontSize: 15, color: COLORS.text },
  desc: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary },
  due: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  actionBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xs, paddingHorizontal: 12, paddingVertical: 5 },
  actionBtnText: { color: COLORS.white, ...FONTS.medium, fontSize: 12 },
  meta: { ...FONTS.regular, fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, ...FONTS.regular },
});
