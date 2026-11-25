import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { calculatePaintEstimator } from '@/utils/mkitCalculators';

export default function PaintCalcScreen() {
  const router = useRouter();
  const [length, setLength] = useState('14');
  const [width, setWidth] = useState('12');
  const [height, setHeight] = useState('10');
  const [doors, setDoors] = useState('1');
  const [windows, setWindows] = useState('2');
  const [includeCeiling, setIncludeCeiling] = useState(true);
  const [coats, setCoats] = useState(2);
  const [costPerLiter, setCostPerLiter] = useState('380');

  const l = parseFloat(length) || 0;
  const w = parseFloat(width) || 0;
  const h = parseFloat(height) || 0;
  const d = parseInt(doors, 10) || 0;
  const win = parseInt(windows, 10) || 0;
  const cost = parseFloat(costPerLiter) || 0;

  const res = calculatePaintEstimator({
    lengthFeet: l,
    widthFeet: w,
    heightFeet: h,
    doorsCount: d,
    windowsCount: win,
    includeCeiling,
    coatsCount: coats,
    costPerLiter: cost,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paint & Wall Area Estimator</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Results Card */}
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Paint Volume Required</Text>
          <Text style={styles.resultBigValue}>
            {res.litersRequired} <Text style={{ fontSize: 18, color: '#DDD6FE' }}>Liters</Text>
          </Text>
          <Text style={styles.resultHint}>
            Estimated Cost: <Text style={{ fontWeight: '800', color: '#FCD34D' }}>₹{res.estimatedCost.toLocaleString('en-IN')}</Text>
          </Text>

          {/* Can Sizes */}
          <View style={styles.cansRow}>
            <View style={styles.canBox}>
              <Text style={styles.canBoxLabel}>20L Drum</Text>
              <Text style={styles.canBoxVal}>{res.recommendedCans.can20L}</Text>
            </View>
            <View style={styles.canBox}>
              <Text style={styles.canBoxLabel}>10L Bucket</Text>
              <Text style={styles.canBoxVal}>{res.recommendedCans.can10L}</Text>
            </View>
            <View style={styles.canBox}>
              <Text style={styles.canBoxLabel}>4L Can</Text>
              <Text style={styles.canBoxVal}>{res.recommendedCans.can4L}</Text>
            </View>
            <View style={styles.canBox}>
              <Text style={styles.canBoxLabel}>1L Tin</Text>
              <Text style={styles.canBoxVal}>{res.recommendedCans.can1L}</Text>
            </View>
          </View>
        </View>

        {/* Inputs Card */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Room Dimensions (Feet)</Text>
          <View style={styles.dimsRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dimSub}>Length</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={length} onChangeText={setLength} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dimSub}>Width</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={width} onChangeText={setWidth} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dimSub}>Height</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={height} onChangeText={setHeight} />
            </View>
          </View>

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Deductions (Openings)</Text>
          <View style={styles.dimsRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dimSub}>Doors (21 sq ft)</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={doors} onChangeText={setDoors} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dimSub}>Windows (12 sq ft)</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={windows} onChangeText={setWindows} />
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>Include Ceiling Surface</Text>
            <Switch value={includeCeiling} onValueChange={setIncludeCeiling} trackColor={{ true: '#7C3AED' }} />
          </View>

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Number of Coats</Text>
          <View style={styles.coatsRow}>
            {[1, 2, 3].map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.coatBtn, coats === c && styles.coatBtnActive]}
                onPress={() => setCoats(c)}
              >
                <Text style={[styles.coatBtnText, coats === c && styles.coatBtnTextActive]}>
                  {c} {c === 1 ? 'Coat' : 'Coats'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Paint Price (₹/Liter)</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            value={costPerLiter}
            onChangeText={setCostPerLiter}
            placeholder="380"
          />
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
    backgroundColor: '#3B0764',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DDD6FE',
    textTransform: 'uppercase',
  },
  resultBigValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  resultHint: {
    fontSize: 13,
    color: '#C4B5FD',
    marginTop: 2,
    marginBottom: 16,
  },
  cansRow: {
    flexDirection: 'row',
    gap: 8,
  },
  canBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
  },
  canBoxLabel: {
    fontSize: 10,
    color: '#DDD6FE',
  },
  canBoxVal: {
    fontSize: 16,
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
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  dimsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  dimSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  coatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coatBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  coatBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  coatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  coatBtnTextActive: {
    color: '#FFFFFF',
  },
});
