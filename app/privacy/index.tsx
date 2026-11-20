import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Switch, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  privacyService,
  ConsentRecord,
  RightsRequest,
  HealthAccessEntry,
  ConsentPurposeCode,
} from '@/services/privacyService';

type Tab = 'consents' | 'rights' | 'health-log';

const PURPOSE_LABELS: Record<ConsentPurposeCode, string> = {
  HEALTH_TREATMENT: 'Health Treatment',
  HEALTH_RESEARCH: 'Health Research',
  COMMUNITY_SERVICES: 'Community Services',
  MARKETING: 'Marketing Communications',
  ANALYTICS: 'Usage Analytics',
  LOCATION_SERVICES: 'Location Services',
  THIRD_PARTY_SHARING: 'Third-Party Sharing',
};

const RIGHTS_LABELS: Record<RightsRequest['requestType'], string> = {
  ACCESS: 'Access My Data',
  CORRECTION: 'Correct My Data',
  ERASURE: 'Delete My Data',
  PORTABILITY: 'Export My Data',
  GRIEVANCE: 'File a Grievance',
};

const STATUS_COLOR: Record<RightsRequest['status'], string> = {
  PENDING: '#f59e0b',
  IN_PROGRESS: '#3b82f6',
  COMPLETED: '#10b981',
  REJECTED: '#ef4444',
};

function ConsentsTab() {
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setRecords(await privacyService.getConsents());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (record: ConsentRecord) => {
    if (record.isMandatory && record.action === 'GRANTED') {
      Alert.alert('Required', 'This consent is required for core app functionality and cannot be revoked.');
      return;
    }
    try {
      if (record.action === 'GRANTED') {
        await privacyService.revokeConsent(record.purposeCode);
      } else {
        await privacyService.grantConsent(record.purposeCode);
      }
      await load(true);
    } catch {
      Alert.alert('Error', 'Could not update consent. Please try again.');
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#2563eb" />;

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
    >
      <Text style={styles.sectionNote}>
        Under DPDP 2023, you control how your personal data is used. Toggle any non-mandatory consent below.
      </Text>
      {records.map(r => (
        <View key={r.id} style={styles.consentRow}>
          <View style={styles.consentInfo}>
            <Text style={styles.consentName}>{PURPOSE_LABELS[r.purposeCode] ?? r.purposeName}</Text>
            {r.isMandatory && <Text style={styles.mandatoryBadge}>Required</Text>}
            {r.grantedAt && r.action === 'GRANTED' && (
              <Text style={styles.consentDate}>Granted {new Date(r.grantedAt).toLocaleDateString()}</Text>
            )}
            {r.revokedAt && r.action === 'REVOKED' && (
              <Text style={styles.consentDateRevoked}>Revoked {new Date(r.revokedAt).toLocaleDateString()}</Text>
            )}
          </View>
          <Switch
            value={r.action === 'GRANTED'}
            onValueChange={() => toggle(r)}
            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
            thumbColor={r.action === 'GRANTED' ? '#2563eb' : '#9ca3af'}
            disabled={r.isMandatory && r.action === 'GRANTED'}
          />
        </View>
      ))}
      {records.length === 0 && (
        <Text style={styles.empty}>No consent records found.</Text>
      )}
    </ScrollView>
  );
}

function RightsTab() {
  const [requests, setRequests] = useState<RightsRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRequests(await privacyService.getRightsRequests());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitRequest = (type: RightsRequest['requestType']) => {
    Alert.prompt(
      RIGHTS_LABELS[type],
      'Provide additional details (optional):',
      async (details = '') => {
        try {
          await privacyService.submitRightsRequest(type, details);
          Alert.alert('Submitted', 'Your request will be processed within 72 hours as required by DPDP 2023.');
          load();
        } catch {
          Alert.alert('Error', 'Could not submit request. Please try again.');
        }
      },
      'plain-text',
    );
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#2563eb" />;

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.sectionNote}>
        DPDP 2023 grants you the right to access, correct, erase, or export your personal data. All requests are processed within 72 hours.
      </Text>
      <View style={styles.rightsGrid}>
        {(Object.keys(RIGHTS_LABELS) as RightsRequest['requestType'][]).map(type => (
          <TouchableOpacity key={type} style={styles.rightsCard} onPress={() => submitRequest(type)}>
            <Ionicons
              name={
                type === 'ACCESS' ? 'eye-outline' :
                type === 'CORRECTION' ? 'create-outline' :
                type === 'ERASURE' ? 'trash-outline' :
                type === 'PORTABILITY' ? 'download-outline' : 'alert-circle-outline'
              }
              size={24}
              color="#2563eb"
            />
            <Text style={styles.rightsCardLabel}>{RIGHTS_LABELS[type]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {requests.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>Your Requests</Text>
          {requests.map(r => (
            <View key={r.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <Text style={styles.requestType}>{RIGHTS_LABELS[r.requestType]}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[r.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[r.status] }]}>{r.status}</Text>
                </View>
              </View>
              <Text style={styles.requestDate}>Submitted {new Date(r.createdAt).toLocaleDateString()}</Text>
              <Text style={styles.requestDue}>Due by {new Date(r.dueDate).toLocaleDateString()}</Text>
              {r.response && <Text style={styles.requestResponse}>{r.response}</Text>}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function HealthLogTab() {
  const [entries, setEntries] = useState<HealthAccessEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    privacyService.getHealthAccessLog()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#2563eb" />;

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.sectionNote}>
        A log of every access to your health records, as required under DPDP 2023 healthcare data regulations.
      </Text>
      {entries.map(e => (
        <View key={e.id} style={styles.logCard}>
          <View style={styles.logHeader}>
            <Text style={styles.logAccessor}>{e.accessorName ?? e.accessorType}</Text>
            <Text style={styles.logType}>{e.accessType}</Text>
          </View>
          <Text style={styles.logRecord}>{e.recordType}</Text>
          {e.purpose && <Text style={styles.logPurpose}>Purpose: {e.purpose}</Text>}
          <Text style={styles.logDate}>{new Date(e.accessedAt).toLocaleString()}</Text>
        </View>
      ))}
      {entries.length === 0 && <Text style={styles.empty}>No health data access events recorded.</Text>}
    </ScrollView>
  );
}

export default function PrivacyScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('consents');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Data</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.tabBar}>
        {(['consents', 'rights', 'health-log'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === 'consents' ? 'Consents' : t === 'rights' ? 'Rights' : 'Health Log'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'consents' && <ConsentsTab />}
      {tab === 'rights' && <RightsTab />}
      {tab === 'health-log' && <HealthLogTab />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#2563eb' },
  tabLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  tabLabelActive: { color: '#2563eb', fontWeight: '700' },
  tabContent: { padding: 16, paddingBottom: 32 },
  sectionNote: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 16, fontStyle: 'italic' },
  consentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  consentInfo: { flex: 1 },
  consentName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  mandatoryBadge: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  consentDate: { fontSize: 11, color: '#10b981', marginTop: 2 },
  consentDateRevoked: { fontSize: 11, color: '#ef4444', marginTop: 2 },
  rightsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  rightsCard: { width: '47%', backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  rightsCardLabel: { fontSize: 12, color: '#374151', fontWeight: '600', textAlign: 'center' },
  subsectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  requestCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  requestType: { fontSize: 14, fontWeight: '600', color: '#111827' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '600' },
  requestDate: { fontSize: 11, color: '#6b7280' },
  requestDue: { fontSize: 11, color: '#f59e0b' },
  requestResponse: { fontSize: 12, color: '#374151', marginTop: 6, fontStyle: 'italic' },
  logCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  logAccessor: { fontSize: 14, fontWeight: '600', color: '#111827' },
  logType: { fontSize: 12, color: '#3b82f6', fontWeight: '500' },
  logRecord: { fontSize: 12, color: '#374151' },
  logPurpose: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  logDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 32 },
});
