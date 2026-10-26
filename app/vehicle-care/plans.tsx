import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, FONTS, SHADOWS } from '@/constants/config';
import {
  vehicleCareService, WashPlan, WashPlanCatalog, PlanStatus,
} from '@/services/vehicleCareService';

const PLAN_STATUS_CFG: Record<PlanStatus, { label: string; color: string; bg: string }> = {
  ACTIVE:    { label: 'Active',    color: '#059669', bg: '#DCFCE7' },
  PAUSED:    { label: 'Paused',    color: '#D97706', bg: '#FEF3C7' },
  CANCELLED: { label: 'Cancelled', color: '#DC2626', bg: '#FEE2E2' },
  EXPIRED:   { label: 'Expired',   color: '#6B7280', bg: '#F1F5F9' },
};

function ActivePlanCard({ plan, onPause, onResume, onCancel }: {
  plan: WashPlan;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}) {
  const cfg = PLAN_STATUS_CFG[plan.status];
  const creditsLeft = plan.creditsTotal - plan.creditsUsed;
  const pct = ((creditsLeft / plan.creditsTotal) * 100).toFixed(0);

  return (
    <View style={styles.planCard}>
      <LinearGradient colors={['#312E81', '#4F46E5']} style={styles.planGradient}>
        <View style={styles.planTop}>
          <View>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planVehicle}>{plan.vehicleDisplay}</Text>
          </View>
          <View style={[styles.planStatusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={[styles.planStatusText, { color: cfg.bg }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Credits bar */}
        <View style={styles.creditsRow}>
          <Text style={styles.creditsLabel}>{creditsLeft} of {plan.creditsTotal} washes remaining</Text>
          <Text style={styles.creditsPercent}>{pct}%</Text>
        </View>
        <View style={styles.creditsBar}>
          <View style={[styles.creditsBarFill, { width: `${pct}%` as any }]} />
        </View>

        <View style={styles.planMeta}>
          {plan.nextServiceDate && (
            <View style={styles.planMetaRow}>
              <Ionicons name="calendar-outline" size={13} color="#A5B4FC" />
              <Text style={styles.planMetaText}>Next service: {plan.nextServiceDate}</Text>
            </View>
          )}
          <View style={styles.planMetaRow}>
            <Ionicons name="refresh-outline" size={13} color="#A5B4FC" />
            <Text style={styles.planMetaText}>Renews: {plan.nextRenewalDate} • ₹{plan.price}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.planActions}>
        {plan.status === 'ACTIVE' && (
          <TouchableOpacity onPress={onPause} style={styles.planActionBtn}>
            <Ionicons name="pause-circle-outline" size={16} color="#D97706" />
            <Text style={[styles.planActionText, { color: '#D97706' }]}>Pause</Text>
          </TouchableOpacity>
        )}
        {plan.status === 'PAUSED' && (
          <TouchableOpacity onPress={onResume} style={styles.planActionBtn}>
            <Ionicons name="play-circle-outline" size={16} color={COLORS.primary} />
            <Text style={[styles.planActionText, { color: COLORS.primary }]}>Resume</Text>
          </TouchableOpacity>
        )}
        {(plan.status === 'ACTIVE' || plan.status === 'PAUSED') && (
          <TouchableOpacity onPress={onCancel} style={[styles.planActionBtn, { marginLeft: 'auto' }]}>
            <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
            <Text style={[styles.planActionText, { color: '#DC2626' }]}>Cancel Plan</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function CatalogCard({ item, onSubscribe }: { item: WashPlanCatalog; onSubscribe: () => void }) {
  return (
    <View style={styles.catCard}>
      <View style={styles.catTop}>
        <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
        <View style={{ flex: 1 }}>
          <View style={styles.catNameRow}>
            <Text style={styles.catName}>{item.name}</Text>
            {item.popular && <View style={styles.catPopular}><Text style={styles.catPopularText}>Popular</Text></View>}
          </View>
          <Text style={styles.catFreq}>{item.frequency === 'WEEKLY' ? '4 washes/month' : '4 washes/month'} • {item.frequency.toLowerCase()}</Text>
        </View>
      </View>
      <View style={styles.catPriceRow}>
        <View>
          <Text style={styles.catPrice}>₹{item.price}<Text style={styles.catPerCycle}>/{item.frequency === 'WEEKLY' ? 'month' : 'month'}</Text></Text>
          <Text style={styles.catSavings}>Save {item.savingsPercent}% vs. on-demand</Text>
        </View>
        <TouchableOpacity onPress={onSubscribe} style={styles.subscribeBtn}>
          <Text style={styles.subscribeBtnText}>Subscribe</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PlansScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [subscribeModal, setSubscribeModal] = useState<WashPlanCatalog | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const { data: plans = [], isLoading: plansLoading, refetch } = useQuery({
    queryKey: ['vc-my-plans'],
    queryFn: vehicleCareService.getMyPlans,
  });

  const { data: catalog = [], isLoading: catalogLoading } = useQuery({
    queryKey: ['vc-plan-catalog'],
    queryFn: vehicleCareService.getPlanCatalog,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vc-vehicles'],
    queryFn: vehicleCareService.getMyVehicles,
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => vehicleCareService.pausePlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vc-my-plans'] });
      Alert.alert('Paused', 'Your wash plan has been paused. Resume anytime.');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => vehicleCareService.resumePlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vc-my-plans'] }),
  });

  const cancelPlanMutation = useMutation({
    mutationFn: (id: string) => vehicleCareService.cancelPlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vc-my-plans'] });
      Alert.alert('Cancelled', 'Your wash plan has been cancelled.');
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: () => vehicleCareService.subscribePlan({
      planCatalogId: subscribeModal!.id,
      vehicleId: selectedVehicleId || vehicles[0]?.id || '',
      paymentMethod: 'UPI',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vc-my-plans'] });
      setSubscribeModal(null);
      Alert.alert('Subscribed!', 'Your wash plan is now active. Sit back and let us handle the cleaning!');
    },
    onError: () => Alert.alert('Error', 'Could not subscribe. Please try again.'),
  });

  function confirmCancelPlan(plan: WashPlan) {
    Alert.alert('Cancel Plan', `This will cancel your "${plan.name}". Remaining washes will not be refunded.`, [
      { text: 'Keep Plan', style: 'cancel' },
      { text: 'Cancel Plan', style: 'destructive', onPress: () => cancelPlanMutation.mutate(plan.id) },
    ]);
  }

  const activePlans = plans.filter(p => p.status === 'ACTIVE' || p.status === 'PAUSED');
  const pastPlans = plans.filter(p => p.status === 'CANCELLED' || p.status === 'EXPIRED');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wash Plans</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* My Plans */}
        <Text style={styles.sectionTitle}>My Plans</Text>
        {plansLoading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}
        {!plansLoading && activePlans.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🔄</Text>
            <Text style={styles.emptyText}>No active plans yet. Subscribe below to save on regular washes.</Text>
          </View>
        )}
        {activePlans.map(plan => (
          <ActivePlanCard
            key={plan.id}
            plan={plan}
            onPause={() => pauseMutation.mutate(plan.id)}
            onResume={() => resumeMutation.mutate(plan.id)}
            onCancel={() => confirmCancelPlan(plan)}
          />
        ))}

        {/* Catalog */}
        <Text style={styles.sectionTitle}>Available Plans</Text>
        <Text style={styles.sectionSub}>Regular wash packages at community-negotiated rates</Text>
        {catalogLoading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}
        {catalog.map(item => (
          <CatalogCard key={item.id} item={item} onSubscribe={() => {
            setSelectedVehicleId(vehicles[0]?.id || null);
            setSubscribeModal(item);
          }} />
        ))}

        {/* Past plans */}
        {pastPlans.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Past Plans</Text>
            {pastPlans.map(plan => (
              <View key={plan.id} style={[styles.planCard, styles.pastPlanCard]}>
                <Text style={styles.pastPlanName}>{plan.name}</Text>
                <Text style={styles.pastPlanVehicle}>{plan.vehicleDisplay}</Text>
                <View style={[styles.planStatusBadge, { backgroundColor: PLAN_STATUS_CFG[plan.status].bg, alignSelf: 'flex-start', marginTop: 6 }]}>
                  <Text style={[styles.planStatusText, { color: PLAN_STATUS_CFG[plan.status].color }]}>
                    {PLAN_STATUS_CFG[plan.status].label}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Subscribe Modal */}
      <Modal visible={!!subscribeModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSubscribeModal(null)}>
        {subscribeModal && (
          <SafeAreaView style={styles.modalRoot} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSubscribeModal(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Subscribe to Plan</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <LinearGradient colors={['#312E81', '#4F46E5']} style={styles.modalPlanSummary}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>{subscribeModal.emoji}</Text>
                <Text style={styles.modalPlanName}>{subscribeModal.name}</Text>
                <Text style={styles.modalPlanFreq}>{subscribeModal.creditsPerCycle} washes per month</Text>
                <Text style={styles.modalPlanPrice}>₹{subscribeModal.price}/month</Text>
                <Text style={styles.modalPlanSavings}>Save {subscribeModal.savingsPercent}% vs. on-demand</Text>
              </LinearGradient>

              <Text style={styles.fieldLabel}>Select Vehicle</Text>
              {vehicles.map(v => (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => setSelectedVehicleId(v.id)}
                  style={[styles.vehicleOption, selectedVehicleId === v.id && styles.vehicleOptionActive]}
                >
                  <Text style={{ fontSize: 22 }}>{v.imageEmoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vehicleOptionName}>{v.nickname}</Text>
                    <Text style={styles.vehicleOptionSub}>{v.plateNumber}</Text>
                  </View>
                  <View style={[styles.radio, selectedVehicleId === v.id && styles.radioActive]}>
                    {selectedVehicleId === v.id && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              ))}

              <View style={styles.policyNote}>
                <Ionicons name="information-circle-outline" size={16} color="#0284C7" />
                <Text style={styles.policyNoteText}>
                  Auto-renews monthly. Cancel anytime. Unused washes in the current cycle are forfeited on cancellation.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => subscribeMutation.mutate()}
                disabled={subscribeMutation.isPending || !selectedVehicleId}
                style={[styles.subscribeConfirmBtn, (!selectedVehicleId || subscribeMutation.isPending) && { opacity: 0.6 }]}
              >
                {subscribeMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.subscribeConfirmText}>Confirm Subscription • ₹{subscribeModal.price}</Text>}
              </TouchableOpacity>
              <View style={{ height: 32 }} />
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  scroll: { padding: 16, gap: 12 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text, marginTop: 8, marginBottom: 4 },
  sectionSub: { fontFamily: FONTS.regular, fontSize: 13, color: '#64748B', marginBottom: 4 },
  emptyBox: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 8 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: '#64748B', textAlign: 'center' },

  planCard: { borderRadius: 16, overflow: 'hidden', ...SHADOWS.card },
  planGradient: { padding: 16 },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  planName: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff' },
  planVehicle: { fontFamily: FONTS.regular, fontSize: 12, color: '#A5B4FC', marginTop: 2 },
  planStatusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  planStatusText: { fontFamily: FONTS.semiBold, fontSize: 12 },
  creditsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  creditsLabel: { fontFamily: FONTS.regular, fontSize: 12, color: '#C7D2FE' },
  creditsPercent: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#fff' },
  creditsBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 12 },
  creditsBarFill: { height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  planMeta: { gap: 4 },
  planMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planMetaText: { fontFamily: FONTS.regular, fontSize: 12, color: '#C7D2FE' },
  planActions: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  planActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  planActionText: { fontFamily: FONTS.semiBold, fontSize: 13 },

  pastPlanCard: { padding: 14, backgroundColor: '#fff' },
  pastPlanName: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text },
  pastPlanVehicle: { fontFamily: FONTS.regular, fontSize: 12, color: '#64748B' },

  catCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, ...SHADOWS.card },
  catTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  catNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catName: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text },
  catPopular: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  catPopularText: { fontFamily: FONTS.semiBold, fontSize: 10, color: '#92400E' },
  catFreq: { fontFamily: FONTS.regular, fontSize: 12, color: '#64748B', marginTop: 2 },
  catPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catPrice: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.primary },
  catPerCycle: { fontFamily: FONTS.regular, fontSize: 13, color: '#64748B' },
  catSavings: { fontFamily: FONTS.regular, fontSize: 12, color: '#059669', marginTop: 2 },
  subscribeBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  subscribeBtnText: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#fff' },

  modalRoot: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  modalContent: { padding: 20, gap: 12 },
  modalPlanSummary: { borderRadius: 16, padding: 20, alignItems: 'center' },
  modalPlanName: { fontFamily: FONTS.bold, fontSize: 18, color: '#fff' },
  modalPlanFreq: { fontFamily: FONTS.regular, fontSize: 13, color: '#C7D2FE', marginTop: 4 },
  modalPlanPrice: { fontFamily: FONTS.bold, fontSize: 26, color: '#fff', marginTop: 10 },
  modalPlanSavings: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#A7F3D0', marginTop: 4 },
  fieldLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#374151', marginTop: 8 },
  vehicleOption: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#F8FAFC', padding: 12, ...SHADOWS.card },
  vehicleOptionActive: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  vehicleOptionName: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text },
  vehicleOptionSub: { fontFamily: FONTS.regular, fontSize: 12, color: '#64748B' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: COLORS.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  policyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#E0F2FE', borderRadius: 10, padding: 12 },
  policyNoteText: { fontFamily: FONTS.regular, fontSize: 12, color: '#0C4A6E', flex: 1, lineHeight: 18 },
  subscribeConfirmBtn: { backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  subscribeConfirmText: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff' },
});
