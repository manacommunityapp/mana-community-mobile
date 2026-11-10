import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { hrmService } from '@/services/hrmService';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  DOCUMENTATION: 'document-text-outline',
  IT_SETUP: 'laptop-outline',
  TRAINING: 'school-outline',
  EQUIPMENT: 'hardware-chip-outline',
  ACCESS: 'key-outline',
  INDUCTION: 'people-outline',
};

export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: orgs } = useQuery({
    queryKey: ['hrm-my-orgs'],
    queryFn: hrmService.getMyOrganizations,
  });
  const orgId = orgs?.[0]?.id;

  const { data: profile } = useQuery({
    queryKey: ['hrm-profile', orgId],
    queryFn: () => hrmService.getMyProfile(orgId!),
    enabled: !!orgId,
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['hrm-onboarding-tasks', orgId, profile?.id],
    queryFn: () => hrmService.getOnboardingTasks(orgId!, profile!.id),
    enabled: !!orgId && !!profile,
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: number) => hrmService.completeOnboardingTask(orgId!, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-onboarding-tasks', orgId, profile?.id] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to mark task complete. Please try again.');
    },
  });

  const completed = tasks?.filter(t => t.isCompleted).length ?? 0;
  const total = tasks?.length ?? 0;
  const progress = total > 0 ? completed / total : 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header title="Onboarding" leftIcon="arrow-back" onLeftPress={() => router.back()} />

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          {/* Progress bar */}
          <View style={s.progressCard}>
            <View style={s.progressHeader}>
              <Text style={s.progressTitle}>Your Progress</Text>
              <Text style={s.progressCount}>{completed}/{total} tasks</Text>
            </View>
            <View style={s.progressBarBg}>
              <View style={[s.progressBarFill, { width: `${progress * 100}%` as any }]} />
            </View>
            {progress === 1 && total > 0 && (
              <View style={s.completedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={s.completedText}>Onboarding Complete!</Text>
              </View>
            )}
          </View>

          {/* Task list by category */}
          {total === 0 ? (
            <View style={s.center}>
              <Ionicons name="checkmark-done-outline" size={40} color={COLORS.textMuted} />
              <Text style={s.emptyText}>No onboarding tasks assigned yet.</Text>
            </View>
          ) : (
            Object.entries(
              (tasks ?? []).reduce((acc: Record<string, typeof tasks>, task) => {
                if (!acc[task.category]) acc[task.category] = [];
                acc[task.category]!.push(task);
                return acc;
              }, {})
            ).map(([category, categoryTasks]) => (
              <View key={category} style={s.section}>
                <View style={s.sectionHeader}>
                  <Ionicons
                    name={CATEGORY_ICONS[category] ?? 'list-outline'}
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={s.sectionTitle}>{category.replace(/_/g, ' ')}</Text>
                </View>
                <View style={s.sectionCard}>
                  {categoryTasks?.map((task, index) => (
                    <TouchableOpacity
                      key={task.id}
                      style={[
                        s.taskRow,
                        index < (categoryTasks.length - 1) && s.taskRowBorder,
                        task.isCompleted && s.taskCompleted,
                      ]}
                      onPress={() => {
                        if (!task.isCompleted) {
                          Alert.alert(
                            'Complete Task',
                            `Mark "${task.taskTitle}" as done?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Yes, Done', onPress: () => completeMutation.mutate(task.id) },
                            ]
                          );
                        }
                      }}
                      disabled={task.isCompleted || completeMutation.isPending}
                    >
                      <View style={[s.checkbox, task.isCompleted && s.checkboxDone]}>
                        {task.isCompleted && (
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        )}
                      </View>
                      <View style={s.taskInfo}>
                        <Text style={[s.taskTitle, task.isCompleted && s.taskTitleDone]}>
                          {task.taskTitle}
                        </Text>
                        {task.taskDescription ? (
                          <Text style={s.taskDesc} numberOfLines={2}>{task.taskDescription}</Text>
                        ) : null}
                        {task.dueDate && (
                          <Text style={[s.taskDue, task.isCompleted && { color: COLORS.textMuted }]}>
                            Due: {task.dueDate}
                          </Text>
                        )}
                      </View>
                      {task.isCompleted && (
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  content: { paddingBottom: 40 },
  emptyText: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textMuted },

  progressCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: 16,
    ...SHADOWS.card,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressTitle: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text, fontWeight: '700' },
  progressCount: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.primary },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  completedText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.success },

  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.text, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCard: { backgroundColor: '#fff', borderRadius: RADIUS.md, ...SHADOWS.card },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  taskRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  taskCompleted: { opacity: 0.65 },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    shrink: 0,
  } as any,
  checkboxDone: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },

  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.text },
  taskTitleDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  taskDesc: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
  taskDue: { fontSize: 11, fontFamily: FONTS.regular, color: '#F59E0B', marginTop: 2 },
});
