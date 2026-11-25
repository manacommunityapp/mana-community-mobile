import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { convertArea, AREA_UNITS_META, type AreaUnit } from '@/utils/mkitCalculators';

export default function LandConverterScreen() {
  const router = useRouter();
  const [val, setVal] = useState('1');
  const [unit, setUnit] = useState<AreaUnit>('guntha');
  const [rate, setRate] = useState('6500');

  const v = parseFloat(val) || 0;
  const r = parseFloat(rate) || 0;
  const results = convertArea(v, unit);

  // Property value calculation based on sq ft rate
  const totalVal = Math.round(results.sqft * r);

  const formatPrice = (p: number) => {
    if (p >= 10000000) return `₹${(p / 10000000).toFixed(2)} Cr`;
    if (p >= 100000) return `₹${(p / 100000).toFixed(2)} Lakhs`;
    return `₹${p.toLocaleString('en-IN')}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Indian Land Unit Converter</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Results Card */}
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Estimated Property Value</Text>
          <Text style={styles.resultBigValue}>{formatPrice(totalVal)}</Text>
          <Text style={styles.resultHint}>
            For {val} {unit} ({results.sqft} sq ft) @ ₹{r}/sq ft
          </Text>

          <View style={styles.quickRefRow}>
            <View style={styles.refBox}>
              <Text style={styles.refLabel}>Sq Yards (Gaj)</Text>
              <Text style={styles.refVal}>{results.sqyd}</Text>
            </View>
            <View style={styles.refBox}>
              <Text style={styles.refLabel}>Guntha</Text>
              <Text style={styles.refVal}>{results.guntha}</Text>
            </View>
            <View style={styles.refBox}>
              <Text style={styles.refLabel}>Cent</Text>
              <Text style={styles.refVal}>{results.cent}</Text>
            </View>
            <View style={styles.refBox}>
              <Text style={styles.refLabel}>Acres</Text>
              <Text style={styles.refVal}>{results.acre}</Text>
            </View>
          </View>
        </View>

        {/* Input Card */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Enter Area Measurement</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            value={val}
            onChangeText={setVal}
            placeholder="1"
          />

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Select Measurement Unit</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitChips}>
            {AREA_UNITS_META.map((u) => (
              <TouchableOpacity
                key={u.id}
                style={[styles.unitChip, unit === u.id && styles.unitChipActive]}
                onPress={() => setUnit(u.id)}
              >
                <Text style={[styles.unitChipText, unit === u.id && styles.unitChipTextActive]}>
                  {u.name.split('(')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Property Rate (₹ per Sq Ft)</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            value={rate}
            onChangeText={setRate}
            placeholder="6500"
          />
        </View>

        {/* All Converted Values Grid */}
        <View style={styles.gridCard}>
          <Text style={styles.gridCardTitle}>Converted Across All Units</Text>
          {AREA_UNITS_META.map((u) => (
            <View key={u.id} style={styles.gridRow}>
              <View>
                <Text style={styles.unitName}>{u.name}</Text>
                <Text style={styles.unitRegion}>{u.region}</Text>
              </View>
              <Text style={styles.convertedVal}>{results[u.id]}</Text>
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
    backgroundColor: '#1E1B4B',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C7D2FE',
    textTransform: 'uppercase',
  },
  resultBigValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FBBF24',
    marginTop: 4,
  },
  resultHint: {
    fontSize: 12,
    color: '#A5B4FC',
    marginTop: 2,
    marginBottom: 16,
  },
  quickRefRow: {
    flexDirection: 'row',
    gap: 8,
  },
  refBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
  },
  refLabel: {
    fontSize: 10,
    color: '#C7D2FE',
  },
  refVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  unitChips: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  unitChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  unitChipTextActive: {
    color: '#FFFFFF',
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  unitName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  unitRegion: {
    fontSize: 11,
    color: '#64748B',
  },
  convertedVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4F46E5',
  },
});
