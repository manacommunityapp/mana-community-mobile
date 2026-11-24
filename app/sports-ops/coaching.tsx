import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sportsOpsService, CoachPackage, CoachPackageEnrollment } from '../../services/sportsOpsService';

export default function CoachingScreen() {
  const [packages, setPackages] = useState<CoachPackage[]>([]);
  const [enrollments, setEnrollments] = useState<CoachPackageEnrollment[]>([]);
  const [tab, setTab] = useState<'packages' | 'enrolled'>('packages');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pkgs, enrs] = await Promise.all([sportsOpsService.listPackages(), sportsOpsService.listEnrollments()]);
      setPackages(pkgs);
      setEnrollments(enrs);
    } catch { Alert.alert('Error', 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const enroll = (pkg: CoachPackage) => {
    Alert.alert('Enroll', `Enroll in "${pkg.name}" for ₹${pkg.price}?`, [
      { text: 'Cancel' },
      { text: 'Enroll', onPress: async () => {
        try { await sportsOpsService.enrollPackage(pkg.id); Alert.alert('Enrolled!', 'You have been enrolled.'); load(); }
        catch { Alert.alert('Error', 'Could not enroll'); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.tabs}>
        {(['packages', 'enrolled'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.activeTab]}>
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>{t === 'packages' ? 'Available' : 'My Enrollments'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'packages' && (
        <FlatList
          data={packages}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No packages available</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.sub}>{item.sport} · {item.sessions} sessions · {item.durationMinutes} min each</Text>
              {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
              <View style={styles.footer}>
                <Text style={styles.price}>₹{item.price}</Text>
                <TouchableOpacity style={styles.enrollBtn} onPress={() => enroll(item)}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Enroll</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {tab === 'enrolled' && (
        <FlatList
          data={enrollments}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No active enrollments</Text>}
          renderItem={({ item }) => {
            const pkg = packages.find(p => p.id === item.packageId);
            const pct = pkg ? (item.sessionsUsed / pkg.sessions) : 0;
            return (
              <View style={styles.card}>
                <Text style={styles.title}>{pkg?.name || `Package #${item.packageId}`}</Text>
                <Text style={styles.sub}>{item.sessionsUsed}/{pkg?.sessions ?? '?'} sessions used</Text>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFg, { width: `${Math.round(pct * 100)}%` as any }]} />
                </View>
                <View style={[styles.badge, { backgroundColor: item.active ? '#dcfce7' : '#f1f5f9', alignSelf: 'flex-start', marginTop: 8 }]}>
                  <Text style={[styles.badgeText, { color: item.active ? '#16a34a' : '#94a3b8' }]}>{item.active ? 'Active' : 'Completed'}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, padding: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#2563eb' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: '#2563eb' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  sub: { fontSize: 13, color: '#64748b', marginBottom: 6 },
  desc: { fontSize: 13, color: '#94a3b8', marginBottom: 8, fontStyle: 'italic' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 16, fontWeight: '800', color: '#2563eb' },
  enrollBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  progressBg: { backgroundColor: '#f1f5f9', borderRadius: 4, height: 6, marginVertical: 6 },
  progressFg: { backgroundColor: '#2563eb', height: 6, borderRadius: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
});
