import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventProgramService } from '@/services/eventProgramService';
import { useAppBack } from '@/hooks/useAppBack';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';

const DIETARY_OPTIONS = ['Pure Vegetarian', 'Jain (No Root Veg)', 'Vegan', 'Non-Vegetarian'];

export default function EventMealsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const eventId = Number(id);

  const { goBack } = useAppBack({
    fallbackRoute: id ? `/events/${id}` : '/events',
  });

  const [dietaryPref, setDietaryPref] = useState(DIETARY_OPTIONS[0]);
  const [allergies, setAllergies] = useState('');
  const [lunchCount, setLunchCount] = useState('1');
  const [dinnerCount, setDinnerCount] = useState('1');
  const [includeLunch, setIncludeLunch] = useState(true);
  const [includeDinner, setIncludeDinner] = useState(true);

  const { data: userMeals, isLoading } = useQuery({
    queryKey: ['event-user-meals', eventId],
    queryFn: () => eventProgramService.getUserMeals(eventId),
    enabled: !!eventId,
  });

  useEffect(() => {
    if (userMeals) {
      if (userMeals.dietaryPref) setDietaryPref(userMeals.dietaryPref);
      if (userMeals.allergies) setAllergies(userMeals.allergies);
      const firstMeal = userMeals.meals?.[0];
      if (firstMeal) {
        setIncludeLunch(firstMeal.lunch);
        setIncludeDinner(firstMeal.dinner);
        setLunchCount(String(firstMeal.headCount || 1));
        setDinnerCount(String(firstMeal.headCount || 1));
      }
    }
  }, [userMeals]);

  const saveMutation = useMutation({
    mutationFn: () =>
      eventProgramService.saveMeals(eventId, {
        eventId,
        dietaryPref,
        allergies: allergies.trim() || undefined,
        meals: [
          {
            date: new Date().toISOString().split('T')[0],
            lunch: includeLunch,
            dinner: includeDinner,
            headCount: Math.max(parseInt(lunchCount) || 1, parseInt(dinnerCount) || 1),
          },
        ],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-user-meals', eventId] });
      Alert.alert('Saved!', 'Your meal preferences have been registered.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not save meal preferences.');
    },
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Food & Catering Preferences</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.banner}>
          <Text style={s.bannerTitle}>🍽️ Event Dining & Prasad</Text>
          <Text style={s.bannerSub}>Register your meal requirements to minimize food wastage</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Dietary Preference</Text>
          <View style={s.pillsWrap}>
            {DIETARY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[s.pill, dietaryPref === opt && s.pillActive]}
                onPress={() => setDietaryPref(opt)}
              >
                <Text style={[s.pillText, dietaryPref === opt && s.pillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.inputLabel}>Food Allergies or Remarks (Optional)</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Nut allergy, Gluten free"
            value={allergies}
            onChangeText={setAllergies}
          />

          <Text style={[s.sectionTitle, { marginTop: 18 }]}>Meal Selections</Text>

          {/* Lunch option */}
          <View style={s.mealRow}>
            <TouchableOpacity style={s.checkWrap} onPress={() => setIncludeLunch(!includeLunch)}>
              <Ionicons
                name={includeLunch ? 'checkbox' : 'square-outline'}
                size={22}
                color={includeLunch ? COLORS.primary : COLORS.border}
              />
              <Text style={s.mealName}>Community Lunch</Text>
            </TouchableOpacity>
            {includeLunch && (
              <View style={s.counterRow}>
                <Text style={s.headsLabel}>Heads:</Text>
                <TextInput
                  style={s.headInput}
                  keyboardType="number-pad"
                  value={lunchCount}
                  onChangeText={setLunchCount}
                />
              </View>
            )}
          </View>

          {/* Dinner option */}
          <View style={s.mealRow}>
            <TouchableOpacity style={s.checkWrap} onPress={() => setIncludeDinner(!includeDinner)}>
              <Ionicons
                name={includeDinner ? 'checkbox' : 'square-outline'}
                size={22}
                color={includeDinner ? COLORS.primary : COLORS.border}
              />
              <Text style={s.mealName}>Grand Dinner / Prasad</Text>
            </TouchableOpacity>
            {includeDinner && (
              <View style={s.counterRow}>
                <Text style={s.headsLabel}>Heads:</Text>
                <TextInput
                  style={s.headInput}
                  keyboardType="number-pad"
                  value={dinnerCount}
                  onChangeText={setDinnerCount}
                />
              </View>
            )}
          </View>

          <TouchableOpacity
            style={s.saveBtn}
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.saveBtnText}>Save Meal Preferences</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', fontWeight: 'bold', color: COLORS.text },
  content: { padding: 16 },
  banner: {
    backgroundColor: '#FEF3C7', borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#D97706',
  },
  bannerTitle: { fontSize: 15, fontWeight: 'bold', color: '#B45309' },
  bannerSub: { fontSize: 12, color: '#92400E', marginTop: 2 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 18, ...SHADOWS.sm },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginBottom: 10 },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  pill: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F9FAFB',
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  pillTextActive: { color: '#fff' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, fontSize: 13, backgroundColor: '#F9FAFB' },
  mealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  checkWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headsLabel: { fontSize: 12, color: COLORS.textMuted },
  headInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, width: 44, paddingVertical: 4, textAlign: 'center', fontSize: 13, backgroundColor: '#F9FAFB' },
  saveBtn: { backgroundColor: '#10B981', paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center', marginTop: 18 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
