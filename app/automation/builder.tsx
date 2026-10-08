import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import {
  automationService,
  TriggerDomain,
  TriggerEventType,
  ActionType,
  ComparisonOperator,
  DelayedActionConfig,
} from '@/services/automationService';

export default function AutomationBuilderScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Form State
  const [ruleName, setRuleName] = useState('Custom Event Automation');
  const [domain, setDomain] = useState<TriggerDomain>('GROUP_BUY');
  const [conditionKey, setConditionKey] = useState('progressPercent');
  const [operator, setOperator] = useState<ComparisonOperator>('GTE');
  const [threshold, setThreshold] = useState('90');
  const [actionType, setActionType] = useState<ActionType>('SEND_PUSH_NOTIFICATION');
  const [targetAudience, setTargetAudience] = useState('WISHLIST_RESIDENTS');

  // Delay Config
  const [hasDelay, setHasDelay] = useState(false);
  const [delayValue, setDelayValue] = useState('3');
  const [delayUnit, setDelayUnit] = useState<'MINUTES' | 'HOURS' | 'DAYS'>('HOURS');
  const [recheckConditionKey, setRecheckConditionKey] = useState('isStillInsideCampus');

  const [dryRunResult, setDryRunResult] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: automationService.createRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationRules'] });
      queryClient.invalidateQueries({ queryKey: ['automationMetrics'] });
      Alert.alert('🎉 Rule Saved', 'Your automation is now active in the platform!', [
        { text: 'Done', onPress: () => router.back() }
      ]);
    },
  });

  const handleAiGenerate = async (queryText?: string) => {
    const text = queryText || aiPrompt;
    if (!text.trim()) {
      Alert.alert('AI Assistant', 'Please enter a prompt (e.g. "Remind me on WhatsApp if electricity bill > ₹3,000").');
      return;
    }
    setAiLoading(true);
    try {
      const res = await automationService.parseNaturalLanguageRule(text);
      if (res.success && res.parsedRule) {
        const p = res.parsedRule;
        setRuleName(p.name);
        setDomain(p.domain);
        setConditionKey(p.conditionKey);
        setOperator(p.operator);
        setThreshold(String(p.thresholdValue));
        setActionType(p.actionType);
        setTargetAudience(p.actionPayload?.target || 'TARGET_RESIDENTS');

        if (p.delayConfig?.hasDelay) {
          setHasDelay(true);
          setDelayValue(String(p.delayConfig.delayValue));
          setDelayUnit(p.delayConfig.delayUnit);
          setRecheckConditionKey(p.delayConfig.recheckConditionKey || 'isStillInsideCampus');
        } else {
          setHasDelay(false);
        }

        Alert.alert('✨ AI Rule Synthesized', res.explanation);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleDryRun = async () => {
    const samplePayload: Record<string, any> = {
      [conditionKey]: isNaN(Number(threshold)) ? threshold : Number(threshold) + 2,
    };
    const res = await automationService.dryRunRule(
      { conditionKey, operator, thresholdValue: threshold },
      samplePayload
    );
    setDryRunResult(res.reason);
  };

  const handleSaveRule = () => {
    if (!ruleName.trim()) {
      Alert.alert('Required', 'Please enter a name for this automation rule.');
      return;
    }

    let delayConfig: DelayedActionConfig | undefined = undefined;
    if (hasDelay) {
      delayConfig = {
        hasDelay: true,
        delayValue: parseInt(delayValue, 10) || 1,
        delayUnit,
        recheckConditionKey,
        recheckOperator: 'EQUALS_BOOLEAN',
        recheckThresholdValue: true,
      };
    }

    createMutation.mutate({
      name: ruleName.trim(),
      description: 'WHEN ' + conditionKey + ' ' + operator + ' ' + threshold + (hasDelay ? ' ➔ WAIT ' + delayValue + ' ' + delayUnit : '') + ' ➔ THEN ' + actionType.replace(/_/g, ' ') + '.',
      domain,
      eventType: 'GROUP_BUY_THRESHOLD',
      conditionKey,
      operator,
      thresholdValue: isNaN(Number(threshold)) ? threshold : Number(threshold),
      actionType,
      actionPayload: { target: targetAudience },
      delayConfig,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* AI Assistant Box */}
        <View style={styles.aiBox}>
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={16} color="#D97706" />
            <Text style={styles.aiHeaderTitle}>Mana AI Rule Synthesizer</Text>
          </View>
          <Text style={styles.aiDesc}>Type your automation in plain English and Mana AI will build the workflow.</Text>
          <TextInput
            style={styles.aiInput}
            value={aiPrompt}
            onChangeText={setAiPrompt}
            placeholder="e.g. Remind me on WhatsApp if my electricity bill crosses ₹3,000"
            placeholderTextColor="#94A3B8"
          />
          <TouchableOpacity style={styles.aiBtn} onPress={() => handleAiGenerate()} disabled={aiLoading}>
            {aiLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="flash" size={14} color="#FFFFFF" />
                <Text style={styles.aiBtnText}>Generate Rule with AI</Text>
              </> 
            )}
          </TouchableOpacity>

          {/* Prompt Chips */}
          <View style={styles.quickChipRow}>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => {
                setAiPrompt('Remind me on WhatsApp if my electricity bill crosses ₹3,000');
                handleAiGenerate('Remind me on WhatsApp if my electricity bill crosses ₹3,000');
              }}
            >
              <Text style={styles.quickChipText}>{'⚡ Bill > ₹3,000 WhatsApp'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => {
                setAiPrompt('Alert security guard if visitor stays beyond 3 hours');
                handleAiGenerate('Alert security guard if visitor stays beyond 3 hours');
              }}
            >
              <Text style={styles.quickChipText}>⏱️ Visitor 3-Hr Overstay</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Rule Form */}
        <Text style={styles.sectionTitle}>Rule Title</Text>
        <TextInput style={styles.input} value={ruleName} onChangeText={setRuleName} placeholder="Rule name" />

        {/* Step 1: WHEN */}
        <View style={styles.stepCard}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>1. WHEN (Event Trigger)</Text>
          </View>
          <Text style={styles.label}>Domain</Text>
          <View style={styles.chipRow}>
            {(['GROUP_BUY', 'FINANCE', 'HELPDESK', 'VISITOR_SECURITY', 'SMART_METER', 'PARKING'] as TriggerDomain[]).map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, domain === d && styles.chipActive]}
                onPress={() => setDomain(d)}
              >
                <Text style={[styles.chipText, domain === d && styles.chipTextActive]}>
                  {d.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Condition Attribute Key</Text>
          <TextInput style={styles.input} value={conditionKey} onChangeText={setConditionKey} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Operator</Text>
              <TextInput style={styles.input} value={operator} onChangeText={(t) => setOperator(t as any)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Threshold</Text>
              <TextInput style={styles.input} value={threshold} onChangeText={setThreshold} />
            </View>
          </View>
        </View>

        {/* Step 2: Time Delay (Optional) */}
        <View style={styles.stepCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={[styles.stepBadge, { backgroundColor: '#F5F3FF' }]}>
              <Text style={[styles.stepBadgeText, { color: '#7C3AED' }]}>2. WAIT & RE-CHECK (Time Delay)</Text>
            </View>
            <Switch
              value={hasDelay}
              onValueChange={setHasDelay}
              trackColor={{ false: '#CBD5E1', true: '#A78BFA' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {hasDelay && (
            <>
              <Text style={styles.label}>Delay Duration</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[styles.input, { flex: 1 }]} value={delayValue} onChangeText={setDelayValue} keyboardType="numeric" />
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['MINUTES', 'HOURS', 'DAYS'] as const).map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.chip, delayUnit === u && styles.delayChipActive]}
                      onPress={() => setDelayUnit(u)}
                    >
                      <Text style={[styles.chipText, delayUnit === u && styles.chipTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.label}>Re-Evaluate Condition Key After Delay</Text>
              <TextInput style={styles.input} value={recheckConditionKey} onChangeText={setRecheckConditionKey} placeholder="e.g. isStillInsideCampus" />
            </>
          )}
        </View>

        {/* Step 3: THEN */}
        <View style={styles.stepCard}>
          <View style={[styles.stepBadge, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.stepBadgeText, { color: '#059669' }]}>3. THEN (Action)</Text>
          </View>

          <Text style={styles.label}>Action to Perform</Text>
          <View style={styles.chipRow}>
            {[
              'SEND_PUSH_NOTIFICATION',
              'SEND_WHATSAPP_REMINDER',
              'CREATE_HELPDESK_TICKET',
              'NOTIFY_SECURITY_DESK',
              'APPLY_LEDGER_SURCHARGE',
            ].map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.chip, actionType === a && styles.actionChipActive]}
                onPress={() => setActionType(a as any)}
              >
                <Text style={[styles.chipText, actionType === a && styles.chipTextActive]}>
                  {a.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Target Audience / Recipient</Text>
          <TextInput style={styles.input} value={targetAudience} onChangeText={setTargetAudience} />
        </View>

        {/* Simulator / Dry-Run */}
        <TouchableOpacity style={styles.dryRunBtn} onPress={handleDryRun}>
          <Ionicons name="play" size={16} color="#0F172A" />
          <Text style={styles.dryRunBtnText}>Test & Dry-Run Rule</Text>
        </TouchableOpacity>

        {dryRunResult && (
          <View style={styles.dryRunResultBox}>
            <Ionicons name="information-circle" size={16} color="#2563EB" />
            <Text style={styles.dryRunResultText}>{dryRunResult}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveRule} disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save & Activate Automation</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  aiBox: { backgroundColor: '#1E293B', padding: 14, borderRadius: RADIUS.lg, marginBottom: 16, ...SHADOWS.md },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  aiHeaderTitle: { fontSize: 13, fontWeight: 'bold', color: '#FDE68A' },
  aiDesc: { fontSize: 11, color: '#94A3B8', marginBottom: 10 },
  aiInput: { backgroundColor: '#0F172A', color: '#FFFFFF', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, borderWidth: 1, borderColor: '#334155' },
  aiBtn: { backgroundColor: '#D97706', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.md, marginTop: 10 },
  aiBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  quickChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  quickChip: { backgroundColor: '#334155', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  quickChipText: { fontSize: 10, color: '#E2E8F0', fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 6 },
  stepCard: { backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  stepBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm, alignSelf: 'flex-start', marginBottom: 12 },
  stepBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#2563EB' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, backgroundColor: '#F8FAFC' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md, backgroundColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#2563EB' },
  delayChipActive: { backgroundColor: '#7C3AED' },
  actionChipActive: { backgroundColor: '#059669' },
  chipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  dryRunBtn: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: RADIUS.md, marginBottom: 12 },
  dryRunBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 12 },
  dryRunResultBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF6FF', padding: 10, borderRadius: RADIUS.md, marginBottom: 16 },
  dryRunResultText: { fontSize: 12, color: '#1E40AF', flex: 1 },
  saveBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});