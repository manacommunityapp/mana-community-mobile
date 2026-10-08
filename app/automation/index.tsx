import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  Switch,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import {
  automationService,
  AutomationRuleDto,
  AutomationPresetDto,
  AutomationExecutionLogDto,
  PendingDelayedTaskDto,
  AutomationMetricsDto,
  TriggerDomain,
} from '@/services/automationService';

const DOMAIN_ICONS: Record<TriggerDomain, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  GROUP_BUY:        { icon: 'cart',       color: '#2563EB', bg: '#DBEAFE' },
  FINANCE:          { icon: 'wallet',     color: '#059669', bg: '#D1FAE5' },
  HELPDESK:         { icon: 'construct',  color: '#D97706', bg: '#FEF3C7' },
  VISITOR_SECURITY: { icon: 'shield',     color: '#7C3AED', bg: '#EDE9FE' },
  SMART_METER:      { icon: 'flash',      color: '#DC2626', bg: '#FEE2E2' },
  PARKING:          { icon: 'car',         color: '#0891B2', bg: '#CFFAFE' },
};

export default function AutomationHomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'RULES' | 'DELAYED_TASKS' | 'PRESETS' | 'AUDIT_LOGS'>('RULES');
  const [domainFilter, setDomainFilter] = useState<string>('ALL');

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome])
  );

  const { data: metrics } = useQuery<AutomationMetricsDto>({
    queryKey: ['automationMetrics'],
    queryFn: automationService.getMetrics,
  });

  const { data: rules = [], isLoading: rulesLoading, refetch: refetchRules } = useQuery<AutomationRuleDto[]>({
    queryKey: ['automationRules'],
    queryFn: () => automationService.getRules(),
  });

  const { data: delayedTasks = [], refetch: refetchTasks } = useQuery<PendingDelayedTaskDto[]>({
    queryKey: ['automationDelayedTasks'],
    queryFn: automationService.getPendingDelayedTasks,
  });

  const { data: presets = [] } = useQuery<AutomationPresetDto[]>({
    queryKey: ['automationPresets'],
    queryFn: automationService.getPresetRecipes,
  });

  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery<AutomationExecutionLogDto[]>({
    queryKey: ['automationLogs'],
    queryFn: automationService.getExecutionLogs,
  });

  const toggleMutation = useMutation({
    mutationFn: automationService.toggleRuleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationRules'] });
      queryClient.invalidateQueries({ queryKey: ['automationMetrics'] });
    },
  });

  const enablePresetMutation = useMutation({
    mutationFn: automationService.enablePresetRecipe,
    onSuccess: (rule) => {
      queryClient.invalidateQueries({ queryKey: ['automationRules'] });
      queryClient.invalidateQueries({ queryKey: ['automationMetrics'] });
      Alert.alert('⚡ Automation Activated', 'Rule "' + rule.name + '" is now active.', [
        { text: 'View Active Rules', onPress: () => setActiveTab('RULES') }
      ]);
    },
  });

  const onRefresh = () => {
    refetchRules();
    refetchTasks();
    refetchLogs();
  };

  const filteredRules = rules.filter((r) => {
    if (domainFilter !== 'ALL' && r.domain !== domainFilter) return false;
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={goHome}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.topBarTitle}>⚡ Mana Automation</Text>
          <Text style={styles.topBarSubtitle}>Time-Delayed & Event-Driven Engine</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/automation/builder')}>
          <Ionicons name="sparkles" size={14} color="#FFFFFF" />
          <Text style={styles.createBtnText}>AI Builder</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={rulesLoading || logsLoading} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Metrics Grid */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{metrics?.activeRulesCount || 4}</Text>
            <Text style={styles.metricLabel}>Active Rules</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#7C3AED' }]}>{delayedTasks.filter(t => t.status === 'SCHEDULED').length}</Text>
            <Text style={styles.metricLabel}>Pending Delay</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#2563EB' }]}>{metrics?.totalExecutionsMonth || 178}</Text>
            <Text style={styles.metricLabel}>Executions</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#059669' }]}>{metrics?.successRatePercentage || 99.4}%</Text>
            <Text style={styles.metricLabel}>Success Rate</Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'RULES' && styles.tabBtnActive]}
            onPress={() => setActiveTab('RULES')}
          >
            <Text style={[styles.tabText, activeTab === 'RULES' && styles.tabTextActive]}>
              Rules ({rules.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'DELAYED_TASKS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('DELAYED_TASKS')}
          >
            <Text style={[styles.tabText, activeTab === 'DELAYED_TASKS' && styles.tabTextActive]}>
              Pending Timers ({delayedTasks.filter(t => t.status === 'SCHEDULED').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'PRESETS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('PRESETS')}
          >
            <Text style={[styles.tabText, activeTab === 'PRESETS' && styles.tabTextActive]}>
              Recipes ({presets.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'AUDIT_LOGS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('AUDIT_LOGS')}
          >
            <Text style={[styles.tabText, activeTab === 'AUDIT_LOGS' && styles.tabTextActive]}>
              Audit ({logs.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Active Rules */}
        {activeTab === 'RULES' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
              {['ALL', 'GROUP_BUY', 'FINANCE', 'HELPDESK', 'VISITOR_SECURITY', 'SMART_METER'].map((dom) => (
                <TouchableOpacity
                  key={dom}
                  style={[styles.filterChip, domainFilter === dom && styles.filterChipActive]}
                  onPress={() => setDomainFilter(dom)}
                >
                  <Text style={[styles.filterChipText, domainFilter === dom && styles.filterChipTextActive]}>
                    {dom.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredRules.map((rule) => {
              const conf = DOMAIN_ICONS[rule.domain] || { icon: 'flash', color: '#64748B', bg: '#F1F5F9' };
              return (
                <View key={rule.id} style={styles.ruleCard}>
                  <View style={styles.ruleCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <View style={[styles.domainIconBadge, { backgroundColor: conf.bg }]}>
                        <Ionicons name={conf.icon} size={18} color={conf.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ruleName}>{rule.name}</Text>
                        <Text style={styles.ruleDomainText}>{rule.domain.replace(/_/g, ' ')}</Text>
                      </View>
                    </View>
                    <Switch
                      value={rule.isActive}
                      onValueChange={() => toggleMutation.mutate(rule.id)}
                      trackColor={{ false: '#CBD5E1', true: '#34D399' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.ruleDesc}>{rule.description}</Text>

                  {rule.delayConfig?.hasDelay && (
                    <View style={styles.delayBadge}>
                      <Ionicons name="timer-outline" size={12} color="#7C3AED" />
                      <Text style={styles.delayBadgeText}>
                        Includes {rule.delayConfig.delayValue} {rule.delayConfig.delayUnit} Delay & Exit Verification
                      </Text>
                    </View>
                  )}

                  <View style={styles.ruleFooter}>
                    <Text style={styles.footerText}>
                      ⚡ Executed {rule.totalExecutions} times • Last: {rule.lastTriggeredAt || 'Never'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Tab 2: Pending Delayed Timers */}
        {activeTab === 'DELAYED_TASKS' && (
          <>
            {delayedTasks.map((t) => (
              <View key={t.id} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <View style={[styles.taskStatusBadge, t.status === 'SCHEDULED' ? styles.taskActive : styles.taskCancelled]}>
                    <Ionicons name={t.status === 'SCHEDULED' ? 'time' : 'close-circle'} size={12} color={t.status === 'SCHEDULED' ? '#7C3AED' : '#DC2626'} />
                    <Text style={[styles.taskStatusText, { color: t.status === 'SCHEDULED' ? '#7C3AED' : '#DC2626' }]}>
                      {t.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                  <Text style={styles.taskCountdown}>{t.remainingFormatted}</Text>
                </View>

                <Text style={styles.taskTitle}>{t.ruleName}</Text>
                <Text style={styles.taskDetail}>Scheduled at {t.scheduledAt} ➔ Fires at {t.triggerTargetAt}</Text>
                {t.cancellationReason && <Text style={styles.cancelNote}>ℹ️ {t.cancellationReason}</Text>}
              </View>
            ))}
          </>
        )}

        {/* Tab 3: Preset Store */}
        {activeTab === 'PRESETS' && (
          <>
            {presets.map((preset) => {
              const conf = DOMAIN_ICONS[preset.domain] || { icon: 'flash', color: '#64748B', bg: '#F1F5F9' };
              const isAlreadyAdded = rules.some((r) => r.name === preset.name && r.isActive);
              return (
                <View key={preset.id} style={styles.presetCard}>
                  <View style={styles.ruleCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <View style={[styles.domainIconBadge, { backgroundColor: conf.bg }]}>
                        <Ionicons name={conf.icon} size={18} color={conf.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ruleName}>{preset.name}</Text>
                        <Text style={styles.ruleDomainText}>{preset.domain.replace(/_/g, ' ')}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.ruleDesc}>{preset.description}</Text>
                  <TouchableOpacity
                    style={[styles.enableBtn, isAlreadyAdded && styles.enableBtnActive]}
                    disabled={isAlreadyAdded || enablePresetMutation.isPending}
                    onPress={() => enablePresetMutation.mutate(preset.id)}
                  >
                    <Ionicons name={isAlreadyAdded ? 'checkmark-circle' : 'add-circle'} size={16} color="#FFFFFF" />
                    <Text style={styles.enableBtnText}>
                      {isAlreadyAdded ? 'Active in Society' : 'Deploy Automation'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {/* Tab 4: Audit Logs */}
        {activeTab === 'AUDIT_LOGS' && (
          <>
            {logs.map((log) => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={styles.logStatusBadge}>
                    <Ionicons name="checkmark-done" size={14} color="#059669" />
                    <Text style={styles.logStatusText}>{log.evaluationResult}</Text>
                  </View>
                  <Text style={styles.logTime}>{log.triggeredAt} • {log.latencyMs}ms</Text>
                </View>
                <Text style={styles.logRuleName}>{log.ruleName}</Text>
                <Text style={styles.logAction}>⚡ {log.actionTaken}</Text>
                {log.delayNote && <Text style={styles.delayLogNote}>⏱️ {log.delayNote}</Text>}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: { backgroundColor: '#0F172A', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { padding: 4 },
  topBarTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  topBarSubtitle: { fontSize: 11, color: '#94A3B8' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D97706', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md },
  createBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metricCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: RADIUS.md, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  metricVal: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  metricLabel: { fontSize: 10, color: '#64748B', marginTop: 2, fontWeight: '600' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', marginBottom: 14 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  filterScrollView: { marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: '#E2E8F0', marginRight: 8 },
  filterChipActive: { backgroundColor: '#0F172A' },
  filterChipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  ruleCard: { backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  ruleCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  domainIconBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ruleName: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  ruleDomainText: { fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 2 },
  ruleDesc: { fontSize: 12, color: '#475569', marginTop: 8, lineHeight: 17 },
  delayBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F3FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, marginTop: 8, alignSelf: 'flex-start' },
  delayBadgeText: { fontSize: 11, color: '#7C3AED', fontWeight: '600' },
  ruleFooter: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  footerText: { fontSize: 11, color: '#94A3B8' },
  taskCard: { backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  taskActive: { backgroundColor: '#EDE9FE' },
  taskCancelled: { backgroundColor: '#FEE2E2' },
  taskStatusText: { fontSize: 10, fontWeight: 'bold' },
  taskCountdown: { fontSize: 12, fontWeight: 'bold', color: '#7C3AED' },
  taskTitle: { fontSize: 13, fontWeight: 'bold', color: '#0F172A', marginTop: 6 },
  taskDetail: { fontSize: 11, color: '#64748B', marginTop: 2 },
  cancelNote: { fontSize: 11, color: '#DC2626', marginTop: 4, fontStyle: 'italic' },
  presetCard: { backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  enableBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.md, marginTop: 12 },
  enableBtnActive: { backgroundColor: '#059669' },
  enableBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  logCard: { backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  logStatusText: { fontSize: 10, fontWeight: 'bold', color: '#059669' },
  logTime: { fontSize: 11, color: '#94A3B8' },
  logRuleName: { fontSize: 13, fontWeight: 'bold', color: '#0F172A', marginTop: 6 },
  logAction: { fontSize: 12, color: '#047857', fontWeight: '600', marginTop: 4 },
  delayLogNote: { fontSize: 11, color: '#7C3AED', marginTop: 2, fontStyle: 'italic' },
});