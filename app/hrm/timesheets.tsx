import { useState, useEffect } from 'react';
import { useHrmOrg } from '@/hooks/useHrmOrg';
import {
  View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { hrmService } from '@/services/hrmService';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import type { Timesheet } from '@/types/hrm';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  SUBMITTED: '#d97706',
  APPROVED: '#16a34a',
  REJECTED: '#dc2626',
};

function formatHours(mins: number) {
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function TimesheetsScreen() {
  const router = useRouter();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const { activeOrgId: orgId, initialize } = useHrmOrg();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { initialize(); }, []);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    hrmService.getMyTimesheets(orgId)
      .then(setTimesheets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orgId]);

  const handleGenerate = async () => {
    if (!orgId) return;
    setGenerating(true);
    try {
      await hrmService.generateTimesheet(orgId);
      const data = await hrmService.getMyTimesheets(orgId);
      setTimesheets(data);
    } catch {
      Alert.alert('Error', 'Failed to generate timesheet');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (id: number) => {
    if (!orgId) return;
    Alert.alert('Submit Timesheet', 'Submit this timesheet for manager approval?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        onPress: async () => {
          try {
            await hrmService.submitTimesheet(orgId, id);
            const data = await hrmService.getMyTimesheets(orgId);
            setTimesheets(data);
          } catch {
            Alert.alert('Error', 'Failed to submit timesheet');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <Header title="My Timesheets" leftIcon="arrow-back" onLeftPress={() => router.back()} />
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header title="My Timesheets" leftIcon="arrow-back" onLeftPress={() => router.back()} />

      <View style={s.generateRow}>
        <Text style={s.subtitle}>Weekly work hour summaries</Text>
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={generating}
          style={[s.generateBtn, generating && { opacity: 0.6 }]}
          activeOpacity={0.8}
        >
          {generating
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.generateBtnText}>Generate Week</Text>
          }
        </TouchableOpacity>
      </View>

      <FlatList
        data={timesheets}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="document-text-outline" size={40} color={COLORS.textMuted} />
            <Text style={s.emptyText}>No timesheets yet.{'\n'}Tap "Generate Week" to create one.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>
                  {new Date(item.weekStartDate).toLocaleDateString()} – {new Date(item.weekEndDate).toLocaleDateString()}
                </Text>
                <Text style={s.cardSub}>
                  Work: {formatHours(item.totalMinutes)}
                  {item.totalOvertimeMinutes > 0 ? `  ·  OT: ${formatHours(item.totalOvertimeMinutes)}` : ''}
                </Text>
              </View>
              <Text style={[s.statusBadge, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
            </View>
            {item.status === 'DRAFT' && (
              <TouchableOpacity onPress={() => handleSubmit(item.id)} style={s.submitBtn} activeOpacity={0.8}>
                <Text style={s.submitBtnText}>Submit for Approval</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  generateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  subtitle: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.regular },
  generateBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    minWidth: 120,
    alignItems: 'center',
  },
  generateBtnText: { color: '#fff', fontSize: 13, fontFamily: FONTS.semiBold, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.text, fontWeight: '600' },
  cardSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  statusBadge: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700' },
  submitBtn: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 13, fontFamily: FONTS.semiBold, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', fontSize: 14, fontFamily: FONTS.regular, lineHeight: 20 },
});
