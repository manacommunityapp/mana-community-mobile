import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { loanService, LoanOffer } from '@/services/loanService';
import { THEME, FONTS, SHADOWS } from '@/constants/config';

const TENURES = [3, 6, 12, 18, 24, 36, 48, 60, 84];
const QUICK_AMOUNTS = [50000, 100000, 200000, 500000];

function OfferCard({ offer, onApply }: { offer: LoanOffer; onApply: () => void }) {
  return (
    <TouchableOpacity onPress={onApply} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, ...SHADOWS.card }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEF9C3', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>{offer.lender_icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: THEME.text, flex: 1 }}>{offer.lender}</Text>
            {offer.pre_approved && (
              <View style={{ backgroundColor: '#FEF9C3', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 9, color: '#B45309' }}>PRE-APPROVED</Text>
              </View>
            )}
          </View>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginTop: 2 }}>
            {offer.disbursal_time} disbursal · Up to {offer.max_tenure_months}m tenure
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#DC2626' }}>{offer.interest_rate_min}%</Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 9, color: THEME.muted }}>onwards p.a.</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, backgroundColor: '#F5F5F7', borderRadius: 10, padding: 10 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted }}>Loan Amount</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: THEME.text, marginTop: 2 }}>₹{(offer.min_amount / 1000)}K–{(offer.max_amount / 100000)}L</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted }}>Processing Fee</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: THEME.text, marginTop: 2 }}>{offer.processing_fee_pct}%</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted }}>Max Tenure</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: THEME.text, marginTop: 2 }}>{offer.max_tenure_months}m</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {offer.features.map(f => (
          <View key={f} style={{ borderWidth: 1, borderColor: '#E8E9F0', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted }}>✓ {f}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity onPress={onApply} style={{ marginTop: 12, backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#fff' }}>Apply Now</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function ApplyModal({ offer, onClose }: { offer: LoanOffer; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [tenureMonths, setTenureMonths] = useState(12);
  const [applying, setApplying] = useState(false);
  const principal = parseInt(amount || '0', 10);
  const rate = offer.interest_rate_min;
  const emi = principal > 0 ? loanService.calcEMI(principal, rate, tenureMonths) : 0;
  const totalPayable = emi * tenureMonths;
  const totalInterest = totalPayable - principal;
  const validTenures = TENURES.filter(t => t <= offer.max_tenure_months);

  async function handleApply() {
    if (!principal || principal < offer.min_amount) {
      Alert.alert('Invalid Amount', `Minimum ₹${offer.min_amount.toLocaleString()} required.`);
      return;
    }
    if (principal > offer.max_amount) {
      Alert.alert('Exceeds Limit', `Maximum ₹${offer.max_amount.toLocaleString()} for this offer.`);
      return;
    }
    setApplying(true);
    try {
      const result = await loanService.apply({ offer_id: offer.id, amount: principal, tenure_months: tenureMonths, rate });
      Alert.alert('Application Submitted ✅', `${result.message}\n\nEMI: ₹${result.emi.toLocaleString()}/month\nApplication ID: ${result.application_id}`, [{ text: 'Done', onPress: onClose }]);
    } catch { Alert.alert('Error', 'Application failed. Please try again.'); }
    finally { setApplying(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
      <ScrollView style={{ maxHeight: '85%', backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <View style={{ padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: THEME.text }}>Apply – {offer.lender}</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 18, color: THEME.muted }}>✕</Text></TouchableOpacity>
          </View>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted, marginBottom: 14 }}>
            Rate {offer.interest_rate_min}%–{offer.interest_rate_max}% p.a. · Processing fee {offer.processing_fee_pct}%
          </Text>

          <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted, marginBottom: 8 }}>Loan Amount (₹)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 12, paddingHorizontal: 12, height: 48, marginBottom: 10, gap: 6 }}>
            <Text style={{ fontFamily: FONTS.semiBold, color: THEME.muted }}>₹</Text>
            <TextInput keyboardType="numeric" value={amount} onChangeText={setAmount}
              placeholder={`₹${offer.min_amount.toLocaleString()} – ₹${(offer.max_amount / 100000).toFixed(0)}L`}
              placeholderTextColor={THEME.muted} style={{ flex: 1, fontFamily: FONTS.bold, fontSize: 16, color: THEME.text }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {QUICK_AMOUNTS.filter(a => a >= offer.min_amount && a <= offer.max_amount).map(a => (
              <TouchableOpacity key={a} onPress={() => setAmount(String(a))} style={{ flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8, backgroundColor: '#F5F5F7', borderWidth: 1, borderColor: '#E8E9F0' }}>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 10, color: THEME.text }}>₹{a >= 100000 ? `${a / 100000}L` : `${a / 1000}K`}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted, marginBottom: 8 }}>Tenure</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {validTenures.map(t => (
                <TouchableOpacity key={t} onPress={() => setTenureMonths(t)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 2, borderColor: tenureMonths === t ? '#DC2626' : '#E8E9F0', backgroundColor: tenureMonths === t ? '#FEF2F2' : '#fff' }}>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: tenureMonths === t ? '#DC2626' : THEME.text }}>{t}m</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {principal >= offer.min_amount && (
            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>Monthly EMI</Text>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#DC2626' }}>₹{emi.toLocaleString()}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>Total Interest</Text>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.text }}>₹{totalInterest.toLocaleString()}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#FECACA' }}>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.text }}>Total Payable</Text>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: THEME.text }}>₹{totalPayable.toLocaleString()}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity onPress={handleApply} disabled={!principal || principal < offer.min_amount || applying}
            style={{ backgroundColor: '#DC2626', borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: (!principal || principal < offer.min_amount) ? 0.4 : 1 }}>
            {applying ? <ActivityIndicator color="#fff" /> : (
              <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>
                {principal >= offer.min_amount ? `Apply for ₹${principal.toLocaleString()} @ ₹${emi.toLocaleString()}/mo` : 'Apply Now'}
              </Text>
            )}
          </TouchableOpacity>
          <Text style={{ textAlign: 'center', fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted, marginTop: 8 }}>
            Subject to credit evaluation · Final rate communicated post verification
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default function LoansScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'offers' | 'my-loans'>('offers');
  const [applyOffer, setApplyOffer] = useState<LoanOffer | null>(null);

  const { data: offers = [], isLoading } = useQuery({ queryKey: ['loan-offers'], queryFn: () => loanService.getOffers(), staleTime: 10 * 60 * 1000 });
  const { data: myLoans = [] } = useQuery({ queryKey: ['my-loans'], queryFn: loanService.getMyLoans, staleTime: 5 * 60 * 1000 });

  return (
    <View style={{ flex: 1, backgroundColor: THEME.background }}>
      <StatusBar barStyle="light-content" />
      <View style={{ backgroundColor: '#DC2626', paddingTop: Platform.OS === 'ios' ? 52 : 20, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.medium, fontSize: 14 }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#fff' }}>💸 Personal Loans</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'center' }}>
          From 10.50% p.a. · Instant approval · 100% online
        </Text>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8E9F0' }}>
        {(['offers', 'my-loans'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t ? '#DC2626' : 'transparent' }}>
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: tab === t ? '#DC2626' : THEME.muted }}>
              {t === 'offers' ? 'Loan Offers' : `My Loans (${myLoans.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && tab === 'offers' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#DC2626" size="large" />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {tab === 'offers' && offers.map(o => <OfferCard key={o.id} offer={o} onApply={() => setApplyOffer(o)} />)}

          {tab === 'my-loans' && (
            myLoans.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Text style={{ fontSize: 48 }}>💸</Text>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text, marginTop: 12 }}>No active loans</Text>
                <TouchableOpacity onPress={() => setTab('offers')} style={{ marginTop: 16, backgroundColor: '#DC2626', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#fff' }}>Browse Loan Offers</Text>
                </TouchableOpacity>
              </View>
            ) : myLoans.map(loan => (
              <View key={loan.id} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, ...SHADOWS.card }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <View>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: THEME.text }}>{loan.lender}</Text>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted }}>{loan.loan_account}</Text>
                  </View>
                  <View style={{ backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontFamily: FONTS.semiBold, fontSize: 10, color: '#16A34A' }}>{loan.status}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10 }}>
                  {[['Loan Amount', `₹${loan.amount.toLocaleString()}`], ['EMI', `₹${loan.emi.toLocaleString()}`], ['Outstanding', `₹${loan.outstanding.toLocaleString()}`], ['EMIs Left', `${loan.emis_total - loan.emis_paid}`]].map(([l, v]) => (
                    <View key={l as string} style={{ alignItems: 'center' }}>
                      <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted }}>{l as string}</Text>
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: THEME.text, marginTop: 2 }}>{v as string}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted }}>Repayment Progress</Text>
                    <Text style={{ fontFamily: FONTS.semiBold, fontSize: 11, color: '#16A34A' }}>{loan.emis_paid}/{loan.emis_total} EMIs</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#E8E9F0', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${(loan.emis_paid / loan.emis_total) * 100}%` as any, backgroundColor: '#16A34A', borderRadius: 3 }} />
                  </View>
                </View>
                <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: '#1D4ED8', marginTop: 8 }}>
                  Next EMI: {loan.next_emi_date} · Rate: {loan.interest_rate}% p.a.
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {applyOffer && (
        <View style={{ position: 'absolute', inset: 0 } as any}>
          <ApplyModal offer={applyOffer} onClose={() => setApplyOffer(null)} />
        </View>
      )}
    </View>
  );
}
