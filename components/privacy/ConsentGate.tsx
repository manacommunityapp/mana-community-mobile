import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useConsent } from '@/hooks/useConsent';
import { ConsentPurposeCode } from '@/services/privacyService';

interface ConsentGateProps {
  purpose: ConsentPurposeCode;
  purposeLabel: string;
  description: string;
  children: React.ReactNode;
}

export function ConsentGate({ purpose, purposeLabel, description, children }: ConsentGateProps) {
  const { hasConsent, isLoading, grant } = useConsent(purpose);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (hasConsent) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconRow}>
          <Ionicons name="shield-checkmark-outline" size={40} color="#2563eb" />
        </View>
        <Text style={styles.title}>Consent Required</Text>
        <Text style={styles.purpose}>{purposeLabel}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.dpdp}>
          Under the Digital Personal Data Protection Act (DPDP) 2023, your explicit consent is
          required before accessing this feature.
        </Text>
        <TouchableOpacity style={styles.button} onPress={grant}>
          <Text style={styles.buttonText}>Grant Consent &amp; Continue</Text>
        </TouchableOpacity>
        <Text style={styles.note}>
          You can withdraw consent at any time from Privacy Settings.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconRow: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 4 },
  purpose: { fontSize: 14, fontWeight: '600', color: '#2563eb', textAlign: 'center', marginBottom: 12 },
  description: { fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  dpdp: { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 18, marginBottom: 20, fontStyle: 'italic' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  note: { fontSize: 11, color: '#9ca3af', textAlign: 'center' },
});
