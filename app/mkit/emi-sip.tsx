import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { calculateEmi, calculateSip, calculateLumpsum } from '@/utils/mkitCalculators';

type CalcTab = 'emi' | 'sip' | 'lumpsum';

export default function EmiSipScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<CalcTab>('emi');

  // EMI State
  const [loanAmount, setLoanAmount] = useState<string>('2500000');
  const [interestRate, setInterestRate] = useState<string>('8.5');
  const [tenureYears, setTenureYears] = useState<string>('20');
  const [showSchedule, setShowSchedule] = useState<boolean>(false);

  // SIP / Lumpsum State
  const [sipMonthly, setSipMonthly] = useState<string>('10000');
  const [lumpsumAmount, setLumpsumAmount] = useState<string>('100000');
  const [expectedReturn, setExpectedReturn] = useState<string>('12');
  const [investmentYears, setInvestmentYears] = useState<string>('10');

  const pEmi = parseFloat(loanAmount) || 0;
  const rEmi = parseFloat(interestRate) || 0;
  const tEmi = (parseFloat(tenureYears) || 0) * 12;

  const emiRes = calculateEmi(pEmi, rEmi, tEmi);

  const pSip = parseFloat(sipMonthly) || 0;
  const pLump = parseFloat(lumpsumAmount) || 0;
  const rInv = parseFloat(expectedReturn) || 0;
  const tInv = parseFloat(investmentYears) || 0;

  const sipRes = calculateSip(pSip, rInv, tInv);
  const lumpRes = calculateLumpsum(pLump, rInv, tInv);

  const formatInr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EMI & Investment Calculators</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'emi' && styles.tabItemActive]}
          onPress={() => setTab('emi')}
        >
          <Text style={[styles.tabText, tab === 'emi' && styles.tabTextActive]}>Loan EMI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'sip' && styles.tabItemActive]}
          onPress={() => setTab('sip')}
        >
          <Text style={[styles.tabText, tab === 'sip' && styles.tabTextActive]}>SIP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'lumpsum' && styles.tabItemActive]}
          onPress={() => setTab('lumpsum')}
        >
          <Text style={[styles.tabText, tab === 'lumpsum' && styles.tabTextActive]}>Lumpsum</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {tab === 'emi' && (
          <>
            {/* Result Card */}
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Monthly Loan EMI</Text>
              <Text style={styles.resultBigValue}>{formatInr(emiRes.monthlyEmi)}</Text>
              <Text style={styles.resultHint}>For {tenureYears} Years @ {interestRate}% p.a.</Text>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Principal</Text>
                  <Text style={styles.statBoxValue}>{formatInr(emiRes.principal)}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Total Interest</Text>
                  <Text style={[styles.statBoxValue, { color: '#F59E0B' }]}>{formatInr(emiRes.totalInterest)}</Text>
                </View>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Payable:</Text>
                <Text style={styles.totalValue}>{formatInr(emiRes.totalPayment)}</Text>
              </View>
            </View>

            {/* Inputs */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Loan Amount (₹)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={loanAmount}
                onChangeText={setLoanAmount}
                placeholder="2500000"
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Interest Rate (% p.a.)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={interestRate}
                onChangeText={setInterestRate}
                placeholder="8.5"
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Loan Tenure (Years)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={tenureYears}
                onChangeText={setTenureYears}
                placeholder="20"
              />

              <TouchableOpacity
                style={styles.scheduleToggle}
                onPress={() => setShowSchedule(!showSchedule)}
              >
                <Ionicons name="calendar-outline" size={18} color="#4F46E5" />
                <Text style={styles.scheduleToggleText}>
                  {showSchedule ? 'Hide Amortization Table' : 'View Yearly Amortization'}
                </Text>
                <Ionicons name={showSchedule ? 'chevron-up' : 'chevron-down'} size={18} color="#4F46E5" />
              </TouchableOpacity>
            </View>

            {/* Yearly Schedule */}
            {showSchedule && (
              <View style={styles.scheduleCard}>
                <Text style={styles.scheduleTitle}>Yearly Repayment Schedule</Text>
                {emiRes.yearlySchedule.map((row) => (
                  <View key={row.year} style={styles.scheduleRow}>
                    <Text style={styles.scheduleYear}>Yr {row.year}</Text>
                    <Text style={styles.schedulePrincipal}>P: {formatInr(row.principalPaid)}</Text>
                    <Text style={styles.scheduleInterest}>Int: {formatInr(row.interestPaid)}</Text>
                    <Text style={styles.scheduleBalance}>Bal: {formatInr(row.balance)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {(tab === 'sip' || tab === 'lumpsum') && (
          <>
            {/* Investment Result Card */}
            {(() => {
              const res = tab === 'sip' ? sipRes : lumpRes;
              return (
                <View style={[styles.resultCard, { backgroundColor: '#064E3B' }]}>
                  <Text style={styles.resultLabel}>Expected Maturity Value</Text>
                  <Text style={[styles.resultBigValue, { color: '#6EE7B7' }]}>
                    {formatInr(res.totalMaturityValue)}
                  </Text>
                  <Text style={styles.resultHint}>
                    In {investmentYears} Years @ {expectedReturn}% expected returns
                  </Text>

                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxLabel}>Invested Amount</Text>
                      <Text style={styles.statBoxValue}>{formatInr(res.investedAmount)}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxLabel}>Wealth Gain</Text>
                      <Text style={[styles.statBoxValue, { color: '#A7F3D0' }]}>
                        {formatInr(res.estimatedReturns)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Investment Inputs */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>
                {tab === 'sip' ? 'Monthly Investment (₹)' : 'One-time Investment Amount (₹)'}
              </Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={tab === 'sip' ? sipMonthly : lumpsumAmount}
                onChangeText={tab === 'sip' ? setSipMonthly : setLumpsumAmount}
                placeholder="10000"
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Expected Annual Return (%)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={expectedReturn}
                onChangeText={setExpectedReturn}
                placeholder="12"
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Investment Duration (Years)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={investmentYears}
                onChangeText={setInvestmentYears}
                placeholder="10"
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
    fontSize: 17,
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
    backgroundColor: '#4F46E5',
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
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
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
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  resultHint: {
    fontSize: 12,
    color: '#A5B4FC',
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
    padding: 12,
  },
  statBoxLabel: {
    fontSize: 11,
    color: '#C7D2FE',
  },
  statBoxValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  totalLabel: {
    fontSize: 13,
    color: '#C7D2FE',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  scheduleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  scheduleToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  scheduleYear: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    width: 40,
  },
  schedulePrincipal: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
  },
  scheduleInterest: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
  },
  scheduleBalance: {
    fontSize: 11,
    color: '#64748B',
  },
});
