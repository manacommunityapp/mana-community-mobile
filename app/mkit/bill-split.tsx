import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Share, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { calculateBillSplit } from '@/utils/mkitCalculators';

export default function BillSplitScreen() {
  const router = useRouter();
  const [billAmount, setBillAmount] = useState('3600');
  const [tipPercent, setTipPercent] = useState(10);
  const [taxPercent, setTaxPercent] = useState(5);
  const [peopleCount, setPeopleCount] = useState(4);
  const [roundUp, setRoundUp] = useState(true);

  const base = parseFloat(billAmount) || 0;
  const splitRes = calculateBillSplit({
    billAmount: base,
    tipPercent,
    taxPercent,
    passengersOrPeopleCount: peopleCount,
    roundUp,
  });

  const tipOptions = [0, 5, 10, 15, 20];
  const taxOptions = [0, 5, 12, 18];

  const handleShare = async () => {
    try {
      await Share.share({
        message: splitRes.shareableSummary,
        title: 'ManaKit Bill Breakdown',
      });
    } catch (e: any) {
      Alert.alert('Error', 'Unable to share bill summary');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Splitter & Tip</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Results Card */}
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Total Grand Amount</Text>
          <Text style={styles.resultBigValue}>₹{splitRes.grandTotal}</Text>
          <Text style={styles.resultHint}>
            Base: ₹{splitRes.baseAmount} • Tip: ₹{splitRes.tipAmount} • Tax: ₹{splitRes.taxAmount}
          </Text>

          {/* Equal Share Highlight */}
          <View style={styles.splitHighlightCard}>
            <View>
              <Text style={styles.splitHighlightLabel}>Share Per Person</Text>
              <Text style={styles.splitHighlightValue}>₹{splitRes.equalSplitPerPerson}</Text>
            </View>
            <View style={styles.peopleBadge}>
              <Text style={styles.peopleBadgeText}>{peopleCount} People</Text>
            </View>
          </View>

          {/* Share Button */}
          <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.85}>
            <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
            <Text style={styles.shareButtonText}>Share via WhatsApp / Messages</Text>
          </TouchableOpacity>
        </View>

        {/* Inputs Card */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Bill Subtotal (₹)</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            value={billAmount}
            onChangeText={setBillAmount}
            placeholder="3600"
          />

          {/* Tip Chips */}
          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Tip / Gratuity ({tipPercent}%)</Text>
          <View style={styles.chipsRow}>
            {tipOptions.map((tip) => (
              <TouchableOpacity
                key={tip}
                style={[styles.chip, tipPercent === tip && styles.chipActive]}
                onPress={() => setTipPercent(tip)}
              >
                <Text style={[styles.chipText, tipPercent === tip && styles.chipTextActive]}>
                  {tip === 0 ? 'No Tip' : `${tip}%`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tax Chips */}
          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Tax / GST ({taxPercent}%)</Text>
          <View style={styles.chipsRow}>
            {taxOptions.map((tax) => (
              <TouchableOpacity
                key={tax}
                style={[styles.chip, taxPercent === tax && styles.chipActive]}
                onPress={() => setTaxPercent(tax)}
              >
                <Text style={[styles.chipText, taxPercent === tax && styles.chipTextActive]}>
                  {tax === 0 ? 'No Tax' : `${tax}%`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* People Count Buttons */}
          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Split Among (People)</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setPeopleCount(Math.max(1, peopleCount - 1))}
            >
              <Ionicons name="remove" size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{peopleCount}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setPeopleCount(peopleCount + 1)}
            >
              <Ionicons name="add" size={20} color="#0F172A" />
            </TouchableOpacity>
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
    borderRadius: 20,
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
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  resultHint: {
    fontSize: 12,
    color: '#6EE7B7',
    marginTop: 2,
    marginBottom: 16,
  },
  splitHighlightCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  splitHighlightLabel: {
    fontSize: 12,
    color: '#A7F3D0',
    fontWeight: '600',
  },
  splitHighlightValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  peopleBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  peopleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
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
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  counterBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 32,
    textAlign: 'center',
  },
});
