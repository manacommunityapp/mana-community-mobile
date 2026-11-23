import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Animated, Clipboard, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { portabilityService, ReputationScore, PortabilityToken } from '@/services/portabilityService';

function scoreColor(score: number): string {
  if (score >= 75) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function ScoreRing({ score }: { score: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: score / 100, duration: 900, useNativeDriver: false }).start();
  }, [score]);

  const color = scoreColor(score);
  const size = 140;
  const strokeWidth = 10;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <View style={{ alignItems: 'center', marginVertical: 24 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* Background ring */}
        <View style={[styles.ringBg, { width: size, height: size, borderRadius: size / 2, borderColor: '#E5E7EB' }]} />
        {/* Score text */}
        <View style={StyleSheet.absoluteFill as any} pointerEvents="none">
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[styles.scoreNum, { color }]}>{score}</Text>
            <Text style={styles.scoreLabel}>/ 100</Text>
          </View>
        </View>
        {/* Progress arc using View border trick */}
        <Animated.View
          style={[
            styles.ringArc,
            {
              width: size, height: size, borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            },
          ]}
        />
      </View>
      <Text style={[styles.scoreTag, { color }]}>
        {score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs improvement'}
      </Text>
    </View>
  );
}

function SubScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <View style={styles.subRow}>
      <Text style={styles.subLabel}>{label}</Text>
      <View style={styles.subBarBg}>
        <View style={[styles.subBarFill, { width: `${pct}%` as any, backgroundColor: scoreColor(pct) }]} />
      </View>
      <Text style={[styles.subPct, { color: scoreColor(pct) }]}>{pct}%</Text>
    </View>
  );
}

export default function ReputationScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [score, setScore] = useState<ReputationScore | null>(null);
  const [token, setToken] = useState<PortabilityToken | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);

  const load = async () => {
    try {
      const [s, t] = await Promise.all([portabilityService.getMyScore(), portabilityService.getMyToken()]);
      setScore(s);
      setToken(t);
    } catch {
      // show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleGenerateToken = () => {
    Alert.alert(
      'Generate Moving Token',
      'This creates a one-time token to share your verified reputation with a new community. It expires in 30 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setTokenLoading(true);
            try {
              const t = await portabilityService.generateToken();
              setToken(t);
            } catch {
              Alert.alert('Error', 'Could not generate token. Try again.');
            } finally {
              setTokenLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', 'Token copied to clipboard.');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#6366F1" />
      </SafeAreaView>
    );
  }

  const daysLeft = token
    ? Math.max(0, Math.ceil((new Date(token.expiresAt).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Reputation & Identity</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <ScoreRing score={score?.score ?? 0} />

        {/* Sub-scores */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Score Breakdown</Text>
          <SubScoreBar label="Payment Reliability" value={score?.paymentScore ?? 0} />
          <SubScoreBar label="Community Participation" value={score?.participation ?? 0} />
          <SubScoreBar label="Tenure Bonus" value={Math.min(100, ((score?.tenureMonths ?? 0) / 36) * 100)} />
        </View>

        {/* Badges */}
        {(score?.badges?.length ?? 0) > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Badges</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {score!.badges.map((b) => (
                <View key={b.type} style={styles.badge}>
                  <Text style={styles.badgeText}>{b.label}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Portability */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Portable Identity</Text>
          <Text style={styles.cardDesc}>
            When you move to a new community, share your verified Mana reputation instantly with a one-time token.
          </Text>
          {token && !token.claimedAt && daysLeft > 0 ? (
            <View style={styles.tokenActive}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.tokenHash}>{token.tokenHash}</Text>
              <TouchableOpacity onPress={() => handleCopy(token.tokenHash)} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={16} color="#6366F1" />
              </TouchableOpacity>
            </View>
          ) : null}
          {token && daysLeft > 0 ? (
            <Text style={styles.tokenMeta}>
              {token.claimedAt ? 'Token already claimed.' : `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`}
            </Text>
          ) : null}
          {(!token || daysLeft === 0 || token.claimedAt) && (
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={handleGenerateToken}
              disabled={tokenLoading}
            >
              {tokenLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.generateBtnText}>Generate Moving Token</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  scroll: { flex: 1 },
  ringBg: { position: 'absolute', borderWidth: 10, backgroundColor: 'transparent' },
  ringArc: { position: 'absolute', backgroundColor: 'transparent' },
  scoreNum: { fontSize: 36, fontWeight: '800' },
  scoreLabel: { fontSize: 13, color: '#6B7280' },
  scoreTag: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  cardDesc: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 12 },
  subRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  subLabel: { width: 150, fontSize: 13, color: '#374151' },
  subBarBg: { flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
  subBarFill: { height: '100%', borderRadius: 3 },
  subPct: { width: 36, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  badge: { backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  badgeText: { fontSize: 13, color: '#4F46E5', fontWeight: '500' },
  tokenActive: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 8, padding: 10, marginBottom: 8 },
  tokenHash: { flex: 1, fontFamily: 'monospace', fontSize: 15, fontWeight: '700', color: '#065F46', marginLeft: 8 },
  copyBtn: { padding: 4 },
  tokenMeta: { fontSize: 12, color: '#6B7280', marginBottom: 10 },
  generateBtn: { backgroundColor: '#6366F1', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
