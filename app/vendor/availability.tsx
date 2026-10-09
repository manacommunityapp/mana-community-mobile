import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Switch, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS } from '@/constants/config';
import { VENDOR_COLORS } from '@/constants/vendorTheme';

interface DaySchedule {
  day: string;
  active: boolean;
  slots: string[];
}

const DAYS_DATA: DaySchedule[] = [
  { day: 'Monday', active: true, slots: ['9:00 AM - 1:00 PM', '2:00 PM - 7:00 PM'] },
  { day: 'Tuesday', active: true, slots: ['9:00 AM - 1:00 PM', '2:00 PM - 7:00 PM'] },
  { day: 'Wednesday', active: true, slots: ['9:00 AM - 1:00 PM', '2:00 PM - 7:00 PM'] },
  { day: 'Thursday', active: true, slots: ['9:00 AM - 1:00 PM', '2:00 PM - 7:00 PM'] },
  { day: 'Friday', active: true, slots: ['9:00 AM - 1:00 PM', '2:00 PM - 7:00 PM'] },
  { day: 'Saturday', active: true, slots: ['10:00 AM - 4:00 PM'] },
  { day: 'Sunday', active: false, slots: [] },
];

export default function VendorAvailabilityScreen() {
  const router = useRouter();
  const [vacationMode, setVacationMode] = useState(false);
  const [instantBooking, setInstantBooking] = useState(true);
  const [schedule, setSchedule] = useState<DaySchedule[]>(DAYS_DATA);

  const toggleDay = (index: number) => {
    const updated = [...schedule];
    updated[index].active = !updated[index].active;
    setSchedule(updated);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Service Availability</Text>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => Alert.alert('Saved', 'Your working hours & availability rules have been updated.')}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Vacation / Away Mode</Text>
              <Text style={styles.switchSub}>Pause incoming service requests and bookings</Text>
            </View>
            <Switch
              value={vacationMode}
              onValueChange={setVacationMode}
              trackColor={{ false: '#CBD5E1', true: '#F59E0B' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Auto-Confirm Requests</Text>
              <Text style={styles.switchSub}>Automatically approve orders matching open slots</Text>
            </View>
            <Switch
              value={instantBooking}
              onValueChange={setInstantBooking}
              trackColor={{ false: '#CBD5E1', true: VENDOR_COLORS.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Weekly Working Hours</Text>
        <View style={styles.scheduleCard}>
          {schedule.map((item, idx) => (
            <View key={item.day} style={[styles.dayRow, idx < schedule.length - 1 && styles.dayRowBorder]}>
              <View style={styles.dayLeft}>
                <Switch
                  value={item.active}
                  onValueChange={() => toggleDay(idx)}
                  trackColor={{ false: '#E2E8F0', true: '#DCFCE7' }}
                  thumbColor={item.active ? '#059669' : '#94A3B8'}
                />
                <Text style={[styles.dayText, !item.active && styles.dayTextInactive]}>{item.day}</Text>
              </View>

              <View style={styles.slotsCol}>
                {item.active ? (
                  item.slots.map((s, i) => (
                    <View key={i} style={styles.slotPill}>
                      <Ionicons name="time-outline" size={11} color="#059669" />
                      <Text style={styles.slotText}>{s}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.closedText}>Closed / Off Duty</Text>
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
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  saveBtn: { backgroundColor: VENDOR_COLORS.accent, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  saveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  switchSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginTop: 10, marginBottom: 8 },
  scheduleCard: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  dayRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dayLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dayText: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginLeft: 10 },
  dayTextInactive: { color: '#94A3B8' },
  slotsCol: { alignItems: 'flex-end' },
  slotPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 3 },
  slotText: { fontSize: 11, fontWeight: '600', color: '#059669', marginLeft: 4 },
  closedText: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
});
