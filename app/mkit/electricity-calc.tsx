import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { calculateElectricityCost, type ApplianceItem } from '@/utils/mkitCalculators';

const INITIAL_APPLIANCES: ApplianceItem[] = [
  { id: '1', name: '1.5T Inverter AC', powerWatts: 1400, hoursPerDay: 8, quantity: 1 },
  { id: '2', name: 'Refrigerator', powerWatts: 220, hoursPerDay: 24, quantity: 1 },
  { id: '3', name: 'Ceiling Fan', powerWatts: 45, hoursPerDay: 12, quantity: 3 },
  { id: '4', name: 'Smart TV 55"', powerWatts: 110, hoursPerDay: 5, quantity: 1 },
  { id: '5', name: 'Geyser', powerWatts: 2000, hoursPerDay: 1, quantity: 1 },
];

export default function ElectricityCalcScreen() {
  const router = useRouter();
  const [tariff, setTariff] = useState('7.5');
  const [appliances, setAppliances] = useState<ApplianceItem[]>(INITIAL_APPLIANCES);

  const tRate = parseFloat(tariff) || 0;
  const res = calculateElectricityCost(appliances, tRate);

  const updateAppliance = (id: string, field: keyof ApplianceItem, val: any) => {
    setAppliances(
      appliances.map((a) => {
        if (a.id !== id) return a;
        return { ...a, [field]: val };
      })
    );
  };

  const removeAppliance = (id: string) => {
    if (appliances.length <= 1) return;
    setAppliances(appliances.filter((a) => a.id !== id));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Electricity & Power Cost</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Results Card */}
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Estimated Monthly Bill</Text>
          <Text style={styles.resultBigValue}>₹{res.monthlyBill.toLocaleString('en-IN')}</Text>
          <Text style={styles.resultHint}>
            {res.monthlyUnitsKwh} Units (kWh)/month • ₹{res.dailyCost}/day
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Daily Units</Text>
              <Text style={styles.statBoxValue}>{res.dailyUnitsKwh} kWh</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Annual Bill</Text>
              <Text style={styles.statBoxValue}>₹{res.annualBill.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* Tariff Input */}
        <View style={styles.tariffCard}>
          <Text style={styles.tariffLabel}>Electricity Tariff Rate (₹ per Unit/kWh)</Text>
          <TextInput
            style={styles.tariffInput}
            keyboardType="numeric"
            value={tariff}
            onChangeText={setTariff}
            placeholder="7.5"
          />
        </View>

        {/* Appliances List */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Configured Appliances</Text>

          {appliances.map((a) => (
            <View key={a.id} style={styles.appRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.appName}>{a.name}</Text>
                <Text style={styles.appSub}>
                  {a.powerWatts}W • {a.hoursPerDay}h/day • {a.quantity} qty
                </Text>
              </View>

              <View style={styles.appActions}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{a.hoursPerDay} hrs</Text>
                </View>
                {appliances.length > 1 && (
                  <TouchableOpacity onPress={() => removeAppliance(a.id)} style={styles.delBtn}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  resultCard: {
    backgroundColor: '#451A03',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FDE68A',
    textTransform: 'uppercase',
  },
  resultBigValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FBBF24',
    marginTop: 4,
  },
  resultHint: {
    fontSize: 13,
    color: '#FDE68A',
    marginTop: 2,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 10,
  },
  statBoxLabel: {
    fontSize: 10,
    color: '#FDE68A',
  },
  statBoxValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  tariffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tariffLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  tariffInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    width: 70,
    textAlign: 'center',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  appSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  appActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  delBtn: {
    padding: 4,
  },
});
