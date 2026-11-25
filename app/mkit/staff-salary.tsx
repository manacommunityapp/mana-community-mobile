import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Share, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { calculateStaffSalary } from '@/utils/mkitCalculators';

const ROLES = ['House Maid', 'Cook / Chef', 'Driver', 'Nanny', 'Gardener'];

export default function StaffSalaryScreen() {
  const router = useRouter();
  const [staffName, setStaffName] = useState('Lakshmi');
  const [role, setRole] = useState('House Maid');
  const [salary, setSalary] = useState('8000');
  const [totalDays, setTotalDays] = useState('30');
  const [allowedLeaves, setAllowedLeaves] = useState('2');
  const [leavesTaken, setLeavesTaken] = useState('4');
  const [advancePaid, setAdvancePaid] = useState('1000');
  const [bonus, setBonus] = useState('0');

  const s = parseFloat(salary) || 0;
  const dTot = parseInt(totalDays, 10) || 30;
  const lAllow = parseInt(allowedLeaves, 10) || 0;
  const lTaken = parseInt(leavesTaken, 10) || 0;
  const adv = parseFloat(advancePaid) || 0;
  const bon = parseFloat(bonus) || 0;

  const res = calculateStaffSalary({
    staffName,
    role,
    monthlySalary: s,
    totalDaysInMonth: dTot,
    paidLeavesAllowed: lAllow,
    leavesTaken: lTaken,
    advancePaid: adv,
    bonusOrExtra: bon,
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: res.shareableSalarySlip,
        title: 'ManaKit Staff Salary Slip',
      });
    } catch {
      Alert.alert('Error', 'Unable to share salary slip');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff & Maid Salary</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Results Card */}
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Net Salary Payout</Text>
          <Text style={styles.resultBigValue}>₹{res.netPayable.toLocaleString('en-IN')}</Text>
          <Text style={styles.resultHint}>
            Payable to {staffName} ({role})
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Daily Wage</Text>
              <Text style={styles.statVal}>₹{res.dailyWage}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Leave Cut</Text>
              <Text style={[styles.statVal, { color: '#FCA5A5' }]}>
                -₹{res.leaveDeduction.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Advance Cut</Text>
              <Text style={[styles.statVal, { color: '#FCD34D' }]}>
                -₹{adv.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>Share Slip on WhatsApp</Text>
          </TouchableOpacity>
        </View>

        {/* Inputs Card */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Staff Role</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rolesRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                onPress={() => setRole(r)}
              >
                <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Staff Name</Text>
          <TextInput
            style={styles.textInput}
            value={staffName}
            onChangeText={setStaffName}
            placeholder="Staff Name"
          />

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Agreed Monthly Salary (₹)</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            value={salary}
            onChangeText={setSalary}
            placeholder="8000"
          />

          <View style={styles.leavesRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>Days in Month</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={totalDays} onChangeText={setTotalDays} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>Allowed Off</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={allowedLeaves} onChangeText={setAllowedLeaves} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>Taken Off</Text>
              <TextInput style={[styles.textInput, { color: '#EF4444' }]} keyboardType="numeric" value={leavesTaken} onChangeText={setLeavesTaken} />
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Advance Paid (₹)</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={advancePaid} onChangeText={setAdvancePaid} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Bonus (₹)</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" value={bonus} onChangeText={setBonus} />
            </View>
          </View>
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
    backgroundColor: '#064E3B',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A7F3D0',
    textTransform: 'uppercase',
  },
  resultBigValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#34D399',
    marginTop: 4,
  },
  resultHint: {
    fontSize: 13,
    color: '#A7F3D0',
    marginTop: 2,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#A7F3D0',
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 14,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
  subLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  rolesRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  roleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  roleBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  roleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  roleBtnTextActive: {
    color: '#FFFFFF',
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
  leavesRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
});
