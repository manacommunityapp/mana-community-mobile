import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/config';
import {
  wellnessBasketService,
  SEED_WELLNESS_PLANS,
  SEED_CLUSTERS,
} from '@/services/wellnessBasketService';
import type {
  WellnessPlanType,
  WellnessGoalType,
  PortionSize,
} from '@/types/wellnessBasket';

const GOALS: { id: WellnessGoalType; label: string; desc: string; icon: string }[] = [
  { id: 'WEIGHT_LOSS', label: 'Weight & Fat Loss', desc: 'Low-calorie, high satiety, zero added sugars', icon: 'scale-outline' },
  { id: 'MUSCLE_GAIN', label: 'Lean Muscle & High Protein', desc: '18-22g plant & dairy protein, legumes', icon: 'barbell-outline' },
  { id: 'DIABETIC_FRIENDLY', label: 'Low-GI & Sugar Control', desc: 'Ancient millets, non-starchy greens', icon: 'pulse-outline' },
  { id: 'HEART_HEALTH', label: 'Cardio & Anti-Inflammatory', desc: 'Omega-3 superfoods, potassium-rich fruits', icon: 'heart-outline' },
  { id: 'GENERAL_WELLNESS', label: 'Daily Energy & Vitality', desc: 'Whole-food diversity & prebiotic fibres', icon: 'sparkles-outline' },
];

export default function PlanBuilderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planType?: string }>();

  const [step, setStep] = useState(1);
  const [planType, setPlanType] = useState<WellnessPlanType>(
    (params.planType?.toUpperCase() as WellnessPlanType) || 'PREMIUM'
  );
  const [goalType, setGoalType] = useState<WellnessGoalType>('WEIGHT_LOSS');
  const [portionSize, setPortionSize] = useState<PortionSize>('STANDARD');
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [society, setSociety] = useState('Mana Premiere Residences');
  const [block, setBlock] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedPlan = SEED_WELLNESS_PLANS.find((p) => p.planType === planType) || SEED_WELLNESS_PLANS[0];

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      await wellnessBasketService.subscribe({
        planType,
        portionSize,
        goalType,
        dislikedIngredients: dislikes,
        societyName: society,
        block,
        flatNo,
      });
      Alert.alert(
        'Subscription Activated!',
        `Your ${selectedPlan.displayName} has been activated with Cashfree auto-debit. Doorstep delivery begins tomorrow at 6:00 AM.`,
        [{ text: 'Great!', onPress: () => router.replace('/wellness-basket') }]
      );
    } catch {
      Alert.alert('Error', 'Could not activate subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `Subscribe: Step ${step} of 3`,
          headerStyle: { backgroundColor: '#064E3B' },
          headerTintColor: '#FFFFFF',
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step 1: Goal & Plan */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>1. Choose Your Plan</Text>
            <View style={styles.planSelectorRow}>
              {SEED_WELLNESS_PLANS.map((p) => {
                const isSelected = planType === p.planType;
                return (
                  <TouchableOpacity
                    key={p.planType}
                    style={[styles.planTile, isSelected && styles.planTileSelected]}
                    onPress={() => setPlanType(p.planType)}
                  >
                    <Text style={[styles.planTileName, isSelected && styles.planTileNameSelected]}>
                      {p.displayName}
                    </Text>
                    <Text style={styles.planTilePrice}>₹{p.pricePerMonth}/mo</Text>
                    <Text style={styles.planTileDaily}>₹{p.pricePerDelivery}/day</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>2. Primary Wellness Goal</Text>
            {GOALS.map((g) => {
              const isSelected = goalType === g.id;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.goalTile, isSelected && styles.goalTileSelected]}
                  onPress={() => setGoalType(g.id)}
                >
                  <Ionicons
                    name={g.icon as any}
                    size={22}
                    color={isSelected ? '#059669' : '#64748B'}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.goalName, isSelected && styles.goalNameSelected]}>
                      {g.label}
                    </Text>
                    <Text style={styles.goalDesc}>{g.desc}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color="#059669" />}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
              <Text style={styles.nextBtnText}>Continue to Portion & Exclusions →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Portion & Allergies */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>3. Select Portion Size</Text>
            <View style={styles.portionRow}>
              {[
                { id: 'SMALL', label: 'Light', desc: '250-300g' },
                { id: 'STANDARD', label: 'Standard', desc: '380-450g' },
                { id: 'LARGE', label: 'Hearty', desc: '500g+' },
              ].map((item) => {
                const isSelected = portionSize === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.portionTile, isSelected && styles.portionTileSelected]}
                    onPress={() => setPortionSize(item.id as PortionSize)}
                  >
                    <Text style={[styles.portionName, isSelected && styles.portionNameSelected]}>
                      {item.label}
                    </Text>
                    <Text style={styles.portionDesc}>{item.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>4. Disliked Ingredients</Text>
            <Text style={styles.helpText}>Tap to exclude from your daily menu rotations:</Text>

            <View style={styles.chipsContainer}>
              {['Papaya', 'Bitter Gourd', 'Walnuts', 'Paneer', 'Raw Sprouts', 'Cucumber', 'Mint'].map(
                (ing) => {
                  const isExcluded = dislikes.includes(ing);
                  return (
                    <TouchableOpacity
                      key={ing}
                      style={[styles.chip, isExcluded && styles.chipSelected]}
                      onPress={() => {
                        setDislikes((prev) =>
                          prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing]
                        );
                      }}
                    >
                      <Text style={[styles.chipText, isExcluded && styles.chipTextSelected]}>
                        {isExcluded ? `✕ ${ing}` : `+ ${ing}`}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.nextBtn, { flex: 1 }]} onPress={() => setStep(3)}>
                <Text style={styles.nextBtnText}>Continue to Delivery →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Society & Confirmation */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>5. Society Doorstep Delivery</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Society / Apartment</Text>
              <TextInput
                style={styles.input}
                value={society}
                onChangeText={setSociety}
                placeholder="Society Name"
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Tower / Block</Text>
                <TextInput
                  style={styles.input}
                  value={block}
                  onChangeText={setBlock}
                  placeholder="e.g. Tower 2"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Flat No</Text>
                <TextInput
                  style={styles.input}
                  value={flatNo}
                  onChangeText={setFlatNo}
                  placeholder="e.g. 402"
                />
              </View>
            </View>

            {/* Summary card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Selected Plan</Text>
                <Text style={styles.summaryVal}>{selectedPlan.displayName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Monthly Price</Text>
                <Text style={styles.summaryValBold}>₹{selectedPlan.pricePerMonth}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Doorstep Deliveries</Text>
                <Text style={styles.summaryVal}>26 Mornings (6:00 – 8:00 AM)</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payment Mode</Text>
                <Text style={styles.summaryVal}>Cashfree Auto-Debit Mandate</Text>
              </View>
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { flex: 1 }]}
                onPress={handleSubscribe}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm & Start Delivery</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  stepContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  helpText: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  planSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  planTile: {
    flex: 1,
    padding: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  planTileSelected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  planTileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  planTileNameSelected: {
    color: '#059669',
  },
  planTilePrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  planTileDaily: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  goalTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  goalTileSelected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  goalName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  goalNameSelected: {
    color: '#059669',
  },
  goalDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  portionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  portionTile: {
    flex: 1,
    padding: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  portionTileSelected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  portionName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  portionNameSelected: {
    color: '#059669',
  },
  portionDesc: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
  },
  chipText: {
    fontSize: 11,
    color: '#334155',
  },
  chipTextSelected: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.sm,
    padding: 12,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 11,
    color: '#0F172A',
  },
  summaryValBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  nextBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginTop: 18,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    alignItems: 'center',
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  backBtnText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
