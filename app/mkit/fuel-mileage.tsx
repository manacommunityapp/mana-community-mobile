import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { calculateFuelTrip, calculateMileage } from '@/utils/mkitCalculators';

type FuelTab = 'trip' | 'mileage';

export default function FuelMileageScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<FuelTab>('trip');

  // Trip State
  const [distance, setDistance] = useState('180');
  const [mileage, setMileage] = useState('16');
  const [fuelPrice, setFuelPrice] = useState('104');
  const [passengers, setPassengers] = useState('3');

  // Mileage State
  const [odometerKm, setOdometerKm] = useState('420');
  const [litersFilled, setLitersFilled] = useState('28');

  const d = parseFloat(distance) || 0;
  const m = parseFloat(mileage) || 16;
  const p = parseFloat(fuelPrice) || 104;
  const pass = parseInt(passengers, 10) || 1;

  const tripRes = calculateFuelTrip(d, m, p, pass);

  const odo = parseFloat(odometerKm) || 0;
  const ltr = parseFloat(litersFilled) || 0;
  const calcMileage = calculateMileage(odo, ltr);
  const costPerKm = ltr > 0 && odo > 0 ? (ltr * p) / odo : 0;

  const presets = [
    { label: 'Bike (45)', val: '45' },
    { label: 'Sedan (16)', val: '16' },
    { label: 'SUV (12)', val: '12' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fuel Cost & Mileage Calculator</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'trip' && styles.tabItemActive]}
          onPress={() => setTab('trip')}
        >
          <Text style={[styles.tabText, tab === 'trip' && styles.tabTextActive]}>Trip Fuel Cost</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'mileage' && styles.tabItemActive]}
          onPress={() => setTab('mileage')}
        >
          <Text style={[styles.tabText, tab === 'mileage' && styles.tabTextActive]}>Mileage Checker</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {tab === 'trip' ? (
          <>
            {/* Trip Results Card */}
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Total Trip Fuel Cost</Text>
              <Text style={styles.resultBigValue}>₹{tripRes.totalCost}</Text>
              <Text style={styles.resultHint}>
                {distance} km distance • {tripRes.fuelNeededLiters} Liters fuel needed
              </Text>

              {/* Carpool Split Highlight */}
              <View style={styles.carpoolCard}>
                <View>
                  <Text style={styles.carpoolLabel}>Carpool Cost / Rider</Text>
                  <Text style={styles.carpoolValue}>₹{tripRes.costPerPerson}</Text>
                </View>
                <View style={styles.carpoolRiderBadge}>
                  <Text style={styles.carpoolRiderText}>{pass} Riders</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Fuel Needed</Text>
                  <Text style={styles.statBoxValue}>{tripRes.fuelNeededLiters} L</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Running Cost</Text>
                  <Text style={styles.statBoxValue}>₹{tripRes.costPerKm}/km</Text>
                </View>
              </View>
            </View>

            {/* Inputs */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Vehicle Presets</Text>
              <View style={styles.presetRow}>
                {presets.map((preset) => (
                  <TouchableOpacity
                    key={preset.label}
                    style={[
                      styles.presetChip,
                      mileage === preset.val && styles.presetChipActive,
                    ]}
                    onPress={() => setMileage(preset.val)}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        mileage === preset.val && styles.presetChipTextActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Trip Distance (km)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={distance}
                onChangeText={setDistance}
                placeholder="180"
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Vehicle Mileage (km/L)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={mileage}
                onChangeText={setMileage}
                placeholder="16"
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { marginTop: 14 }]}>Fuel Price (₹/L)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={fuelPrice}
                    onChangeText={setFuelPrice}
                    placeholder="104"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { marginTop: 14 }]}>Passengers (Carpool)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={passengers}
                    onChangeText={setPassengers}
                    placeholder="3"
                  />
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Mileage Result Card */}
            <View style={[styles.resultCard, { backgroundColor: '#312E81' }]}>
              <Text style={styles.resultLabel}>Real-World Vehicle Mileage</Text>
              <Text style={[styles.resultBigValue, { color: '#A5B4FC' }]}>
                {calcMileage} <Text style={{ fontSize: 18, color: '#FFFFFF' }}>km/L</Text>
              </Text>
              <Text style={styles.resultHint}>
                Based on {odometerKm} km driven using {litersFilled} Liters
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Consumption</Text>
                  <Text style={styles.statBoxValue}>
                    {ltr > 0 && odo > 0 ? ((ltr / odo) * 100).toFixed(1) : '0'} L/100km
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Est. Cost/km</Text>
                  <Text style={styles.statBoxValue}>₹{costPerKm.toFixed(2)}/km</Text>
                </View>
              </View>
            </View>

            {/* Mileage Inputs */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Distance Driven (km)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={odometerKm}
                onChangeText={setOdometerKm}
                placeholder="420"
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Fuel Consumed / Refilled (Liters)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={litersFilled}
                onChangeText={setLitersFilled}
                placeholder="28"
              />
            </View>
          </>
        )}
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
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  tabItemActive: {
    backgroundColor: '#D97706',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  resultCard: {
    backgroundColor: '#451A03',
    borderRadius: 20,
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
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  resultHint: {
    fontSize: 12,
    color: '#FCD34D',
    marginTop: 2,
    marginBottom: 16,
  },
  carpoolCard: {
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  carpoolLabel: {
    fontSize: 12,
    color: '#FDE68A',
    fontWeight: '600',
  },
  carpoolValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FBBF24',
    marginTop: 2,
  },
  carpoolRiderBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  carpoolRiderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
  },
  statBoxLabel: {
    fontSize: 11,
    color: '#FDE68A',
  },
  statBoxValue: {
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
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
});
