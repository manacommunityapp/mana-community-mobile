import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { healthcareService, ProviderCredential } from '../../services/healthcareService';

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function CredentialsScreen() {
  const [creds, setCreds] = useState<ProviderCredential[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCreds(await healthcareService.listCredentials()); }
    catch { Alert.alert('Error', 'Failed to load credentials'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={creds}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No credentials</Text>}
        renderItem={({ item }) => {
          const days = daysUntil(item.expiryDate);
          const expired = days < 0;
          const critical = days >= 0 && days <= 7;
          const warning = days > 7 && days <= 30;
          return (
            <View style={styles.card}>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.credentialType}</Text>
                  <Text style={styles.sub}>Provider #{item.providerId}{item.issuedBy ? ` · ${item.issuedBy}` : ''}</Text>
                  {item.credentialNumber && <Text style={styles.meta}>#{item.credentialNumber}</Text>}
                </View>
                <View>
                  {(item.alertSent7 || critical) && <Ionicons name="alert-circle" size={18} color="#dc2626" style={{ marginBottom: 4 }} />}
                  {(item.alertSent30 || warning) && !critical && <Ionicons name="warning-outline" size={18} color="#f59e0b" style={{ marginBottom: 4 }} />}
                  <View style={[styles.badge, { backgroundColor: expired ? '#fef2f2' : critical ? '#fef2f2' : warning ? '#fefce8' : '#dcfce7' }]}>
                    <Text style={[styles.badgeText, { color: expired ? '#dc2626' : critical ? '#dc2626' : warning ? '#ca8a04' : '#16a34a' }]}>
                      {expired ? 'Expired' : `${days}d left`}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.meta}>Expires: {new Date(item.expiryDate).toLocaleDateString()}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
});
