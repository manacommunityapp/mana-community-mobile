import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { ContractorCrewWorker } from '@/services/biometricAccessService';

const MOCK_AGENCIES = [
  { id: 1, name: 'Apex Facility Solutions Pvt Ltd', quota: '18 / 20 Heads', category: 'Housekeeping' },
  { id: 2, name: 'G4S Global Security Services', quota: '14 / 15 Heads', category: 'Security' },
  { id: 3, name: 'VoltMaster MEP Maintenance', quota: '8 / 8 Heads', category: 'Engineering' },
];

const INITIAL_WORKERS: ContractorCrewWorker[] = [
  {
    id: 101,
    agencyId: 1,
    agencyName: 'Apex Facility Solutions',
    fullName: 'Sunita Devi',
    workerCode: 'APX-882',
    category: 'Housekeeper (Lead)',
    shiftName: 'Morning Shift (07:00 - 15:30)',
    status: 'PRESENT',
    lastPunchTime: '07:02 AM Today',
  },
  {
    id: 102,
    agencyId: 1,
    agencyName: 'Apex Facility Solutions',
    fullName: 'Ramesh Pawar',
    workerCode: 'APX-884',
    category: 'Housekeeper',
    shiftName: 'Morning Shift (07:00 - 15:30)',
    status: 'PRESENT',
    lastPunchTime: '07:11 AM Today',
  },
  {
    id: 103,
    agencyId: 1,
    agencyName: 'Apex Facility Solutions',
    fullName: 'Manoj Kumar',
    workerCode: 'APX-889',
    category: 'Waste Disposal',
    shiftName: 'Morning Shift (07:00 - 15:30)',
    status: 'ABSENT',
  },
  {
    id: 104,
    agencyId: 1,
    agencyName: 'Apex Facility Solutions',
    fullName: 'Kavita Shinde',
    workerCode: 'APX-893',
    category: 'Housekeeper',
    shiftName: 'Morning Shift (07:00 - 15:30)',
    status: 'PRESENT',
    lastPunchTime: '07:15 AM Today',
  },
];

export default function ContractorCrewClockInScreen() {
  const router = useRouter();
  const [selectedAgencyId, setSelectedAgencyId] = useState<number>(1);
  const [workers, setWorkers] = useState<ContractorCrewWorker[]>(INITIAL_WORKERS);

  const toggleWorkerStatus = (id: number) => {
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              status: w.status === 'PRESENT' ? 'ABSENT' : 'PRESENT',
              lastPunchTime: w.status === 'ABSENT' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            }
          : w
      )
    );
  };

  const handleBulkClockIn = () => {
    setWorkers((prev) =>
      prev.map((w) => ({
        ...w,
        status: 'PRESENT',
        lastPunchTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }))
    );
    Alert.alert('Crew Clock-In Completed', 'Verified entire crew roster against contractor agency headcount quota.');
  };

  const handleSubstitute = (worker: ContractorCrewWorker) => {
    Alert.alert(
      'Substitute Worker',
      `Assign registered backup worker for ${worker.fullName} (${worker.workerCode})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Substitute',
          onPress: () => {
            setWorkers((prev) =>
              prev.map((w) =>
                w.id === worker.id
                  ? { ...w, fullName: `${worker.fullName} (Sub: Anita Rao)`, status: 'SUBSTITUTED' }
                  : w
              )
            );
          },
        },
      ]
    );
  };

  const activeAgency = MOCK_AGENCIES.find((a) => a.id === selectedAgencyId);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header
        title="Supervisor Crew Attendance"
        subtitle="Truein-Parity Bulk Contractor Clock-In"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={s.content}>
        {/* Agency Selector */}
        <Text style={s.sectionTitle}>Select Contractor Agency</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.agencyScroll}>
          {MOCK_AGENCIES.map((agency) => {
            const isSelected = agency.id === selectedAgencyId;
            return (
              <TouchableOpacity
                key={agency.id}
                style={[s.agencyCard, isSelected && s.agencyCardSelected]}
                onPress={() => setSelectedAgencyId(agency.id)}
              >
                <View style={s.agencyHeader}>
                  <Text style={[s.agencyName, isSelected && s.textWhite]} numberOfLines={1}>
                    {agency.name}
                  </Text>
                </View>
                <Text style={[s.agencyCategory, isSelected && s.textCyan]}>{agency.category}</Text>
                <View style={[s.quotaBadge, isSelected ? s.quotaBadgeSelected : s.quotaBadgeDefault]}>
                  <Text style={[s.quotaText, isSelected && s.textWhite]}>Gate Limit: {agency.quota}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Shift Action Banner */}
        <View style={s.shiftBanner}>
          <View>
            <Text style={s.shiftTitle}>Morning Shift (07:00 - 15:30)</Text>
            <Text style={s.shiftSub}>
              {workers.filter((w) => w.status === 'PRESENT' || w.status === 'SUBSTITUTED').length} of {workers.length} On Duty
            </Text>
          </View>
          <TouchableOpacity style={s.bulkBtn} onPress={handleBulkClockIn}>
            <Ionicons name="scan" size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={s.bulkBtnText}>Bulk Verify Crew</Text>
          </TouchableOpacity>
        </View>

        {/* Worker Roster List */}
        <Text style={s.sectionTitle}>Contractor Shift Roster</Text>
        <View style={s.rosterList}>
          {workers.map((item) => (
            <View key={item.id} style={s.workerCard}>
              <TouchableOpacity style={s.checkCircle} onPress={() => toggleWorkerStatus(item.id)}>
                <Ionicons
                  name={
                    item.status === 'PRESENT'
                      ? 'checkmark-circle'
                      : item.status === 'SUBSTITUTED'
                      ? 'swap-horizontal'
                      : 'ellipse-outline'
                  }
                  size={26}
                  color={
                    item.status === 'PRESENT'
                      ? '#10B981'
                      : item.status === 'SUBSTITUTED'
                      ? '#6366F1'
                      : '#94A3B8'
                  }
                />
              </TouchableOpacity>

              <View style={s.workerInfo}>
                <Text style={s.workerName}>{item.fullName}</Text>
                <Text style={s.workerSub}>
                  {item.workerCode} • {item.category}
                </Text>
                {item.lastPunchTime && (
                  <Text style={s.punchTime}>Punched: {item.lastPunchTime}</Text>
                )}
              </View>

              <View style={s.workerActions}>
                <TouchableOpacity style={s.subBtn} onPress={() => handleSubstitute(item)}>
                  <Ionicons name="swap-horizontal" size={16} color="#475569" />
                  <Text style={s.subBtnText}>Substitute</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 8, marginTop: 4 },
  agencyScroll: { flexDirection: 'row', gap: 10, paddingBottom: 16 },
  agencyCard: {
    width: 220,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  agencyCardSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  agencyHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  agencyName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  textWhite: { color: '#FFF' },
  agencyCategory: { fontSize: 11, color: '#64748B', marginTop: 2 },
  textCyan: { color: '#38BDF8' },
  quotaBadge: { marginTop: 10, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, alignSelf: 'flex-start' },
  quotaBadgeDefault: { backgroundColor: '#F1F5F9' },
  quotaBadgeSelected: { backgroundColor: '#1E293B' },
  quotaText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  shiftBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  shiftTitle: { fontSize: 13, fontWeight: '700', color: '#1E3A8A' },
  shiftSub: { fontSize: 11, color: '#3B82F6', marginTop: 2 },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bulkBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  rosterList: { gap: 10 },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  checkCircle: { marginRight: 12 },
  workerInfo: { flex: 1 },
  workerName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  workerSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  punchTime: { fontSize: 10, color: '#059669', fontWeight: '600', marginTop: 2 },
  workerActions: { flexDirection: 'row', gap: 6 },
  subBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  subBtnText: { fontSize: 11, color: '#475569', fontWeight: '600' },
});
