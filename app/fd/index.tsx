import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, Linking, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fdService, FDProduct } from '@/services/fdService';
import { THEME, FONTS, SHADOWS } from '@/constants/config';

const TYPE_LABELS: Record<string, string> = { BANK: 'Bank', NBFC: 'NBFC', POST_OFFICE: 'Post Office' };
const TYPE_COLOR: Record<string, string> = { BANK: '#1D4ED8', NBFC: '#7C3AED', POST_OFFICE: '#0F766E' };
const TYPE_BG: Record<string, string> = { BANK: '#EFF6FF', NBFC: '#F5F3FF', POST_OFFICE: '#F0FDFA' };
const QUICK_AMOUNTS = [10000, 25000, 50000, 100000];

function ProductCard({ product, onBook }: { product: FDProduct; onBook: () => void }) {
  const best = [...product.tenures].sort((a, b) => b.rate - a.rate)[0];
  return (
    <TouchableOpacity
      onPress={onBook}
      style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, ...SHADOWS.card }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#F5F5F7', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>{product.bank_icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: THEME.text }}>{product.bank}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <View style={{ backgroundColor: TYPE_BG[product.category], borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 10, color: TYPE_COLOR[product.category] }}>{TYPE_LABELS[product.category]}</Text>
            </View>
            <View style={{ backgroundColor: '#F0FDF4', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 10, color: '#15803D' }}>{product.rating}</Text>
            </View>
            {product.is_tax_saver && (
              <View style={{ backgroundColor: '#FFFBEB', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 10, color: '#B45309' }}>80C</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 20, color: '#16A34A' }}>{best.rate}%</Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted }}>p.a.</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, backgroundColor: '#F5F5F7', borderRadius: 10, padding: 10 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted }}>Min Amount</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: THEME.text, marginTop: 2 }}>₹{product.min_amount.toLocaleString()}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted }}>Senior Rate</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#7C3AED', marginTop: 2 }}>{product.senior_rate}%</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted }}>Max Tenure</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: THEME.text, marginTop: 2 }}>{product.tenures[product.tenures.length - 1]?.label}</Text>
        </View>
      </View>
      <View style={{ marginTop: 10 }}>
        <Text style={{ fontFamily: FONTS.semiBold, fontSize: 11, color: THEME.muted, marginBottom: 6 }}>Available Tenures:</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {product.tenures.map(t => (
            <View key={t.label} style={{ borderWidth: 1, borderColor: '#E8E9F0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontFamily: FONTS.medium, fontSize: 10, color: THEME.text }}>{t.label} · <Text style={{ color: '#16A34A' }}>{t.rate}%</Text></Text>
            </View>
          ))}
        </View>
      </View>
      <TouchableOpacity
        onPress={onBook}
        style={{ marginTop: 12, backgroundColor: '#1D4ED8', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
      >
        <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#fff' }}>Book FD · Up to {best.rate}% p.a.</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function BookModal({ product, onClose }: { product: FDProduct; onClose: () => void }) {
  const [tenureIdx, setTenureIdx] = useState(1);
  const [amount, setAmount] = useState('');
  const [booking, setBooking] = useState(false);
  const tenure = product.tenures[tenureIdx];
  const principal = parseInt(amount || '0', 10);
  const maturity = principal > 0 ? fdService.calcMaturity(principal, tenure.rate, tenure.months) : 0;
  const interest = maturity - principal;

  async function handleBook() {
    if (!principal || principal < product.min_amount) {
      Alert.alert('Min Amount', `Minimum ₹${product.min_amount.toLocaleString()} required.`);
      return;
    }
    setBooking(true);
    try {
      const result = await fdService.book({ product_id: product.id, principal, tenure_months: tenure.months, rate: tenure.rate });
      const apps = [result.phone_pe_url, result.upi_intent_url];
      for (const url of apps) {
        if (await Linking.canOpenURL(url).catch(() => false)) { await Linking.openURL(url); break; }
      }
      Alert.alert('🎉 FD Booked!', `FD No: ${result.fd_number}\nAmount: ₹${principal.toLocaleString()}\nMaturity: ₹${result.maturity_amount.toLocaleString()}\nDate: ${result.maturity_date}`, [{ text: 'Done', onPress: onClose }]);
    } catch { Alert.alert('Error', 'Booking failed. Please try again.'); }
    finally { setBooking(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: THEME.text }}>Book FD – {product.bank}</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 18, color: THEME.muted }}>✕</Text></TouchableOpacity>
        </View>

        <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted, marginBottom: 8 }}>Select Tenure</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {product.tenures.map((t, i) => (
              <TouchableOpacity key={t.label} onPress={() => setTenureIdx(i)}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 2, borderColor: tenureIdx === i ? '#1D4ED8' : '#E8E9F0', backgroundColor: tenureIdx === i ? '#EFF6FF' : '#fff' }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: tenureIdx === i ? '#1D4ED8' : THEME.text }}>{t.label}</Text>
                <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#16A34A', marginTop: 1 }}>{t.rate}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted, marginBottom: 8 }}>Amount (₹)</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 12, paddingHorizontal: 12, height: 48, marginBottom: 10, gap: 6 }}>
          <Text style={{ fontFamily: FONTS.semiBold, color: THEME.muted }}>₹</Text>
          <TextInput keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder={`Min ₹${product.min_amount.toLocaleString()}`}
            placeholderTextColor={THEME.muted} style={{ flex: 1, fontFamily: FONTS.bold, fontSize: 18, color: THEME.text }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {QUICK_AMOUNTS.map(a => (
            <TouchableOpacity key={a} onPress={() => setAmount(String(a))} style={{ flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8, backgroundColor: '#F5F5F7', borderWidth: 1, borderColor: '#E8E9F0' }}>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 11, color: THEME.text }}>₹{(a / 1000)}K</Text>
            </TouchableOpacity>
          ))}
        </View>

        {principal >= product.min_amount && (
          <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>Principal</Text>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: THEME.text }}>₹{principal.toLocaleString()}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>Interest Earned</Text>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#16A34A' }}>₹{interest.toLocaleString()}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#BBF7D0' }}>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>Maturity Amount</Text>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#1D4ED8' }}>₹{maturity.toLocaleString()}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity onPress={handleBook} disabled={!principal || principal < product.min_amount || booking}
          style={{ backgroundColor: '#1D4ED8', borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: (!principal || principal < product.min_amount) ? 0.4 : 1 }}>
          {booking ? <ActivityIndicator color="#fff" /> : (
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>
              Book FD · ₹{principal > 0 ? principal.toLocaleString() : '0'}
            </Text>
          )}
        </TouchableOpacity>
        <Text style={{ textAlign: 'center', fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted, marginTop: 8 }}>
          DICGC insured up to ₹5 lakh per bank · Pay via UPI
        </Text>
      </View>
    </View>
  );
}

export default function FDScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'explore' | 'my-fds'>('explore');
  const [bookProduct, setBookProduct] = useState<FDProduct | null>(null);

  const { data: products = [], isLoading } = useQuery({ queryKey: ['fd-products'], queryFn: fdService.getProducts, staleTime: 10 * 60 * 1000 });
  const { data: myFDs = [] } = useQuery({ queryKey: ['my-fds'], queryFn: fdService.getMyFDs, staleTime: 5 * 60 * 1000 });

  const totalInvested = myFDs.reduce((s, f) => s + f.principal, 0);
  const totalMaturity = myFDs.reduce((s, f) => s + f.maturity_amount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.background }}>
      <StatusBar barStyle="light-content" />
      <View style={{ backgroundColor: '#1D4ED8', paddingTop: Platform.OS === 'ios' ? 52 : 20, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.medium, fontSize: 14 }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#fff' }}>💰 Fixed Deposits</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'center' }}>
          Up to 8.35% p.a. · DICGC Insured · Guaranteed Returns
        </Text>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8E9F0' }}>
        {(['explore', 'my-fds'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t ? '#1D4ED8' : 'transparent' }}>
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: tab === t ? '#1D4ED8' : THEME.muted }}>
              {t === 'explore' ? 'Explore FDs' : `My FDs (${myFDs.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && tab === 'explore' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#1D4ED8" size="large" />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {tab === 'explore' && products.map(p => (
            <ProductCard key={p.id} product={p} onBook={() => setBookProduct(p)} />
          ))}

          {tab === 'my-fds' && (
            <>
              {myFDs.length > 0 && (
                <View style={{ backgroundColor: '#1D4ED8', borderRadius: 14, padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Total Invested</Text>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#fff', marginTop: 3 }}>₹{totalInvested.toLocaleString()}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Total Maturity</Text>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#86EFAC', marginTop: 3 }}>₹{totalMaturity.toLocaleString()}</Text>
                  </View>
                </View>
              )}
              {myFDs.length === 0 ? (
                <View style={{ alignItems: 'center', paddingTop: 60 }}>
                  <Text style={{ fontSize: 48 }}>💰</Text>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text, marginTop: 12 }}>No FDs yet</Text>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: THEME.muted, marginTop: 6, textAlign: 'center' }}>Book your first FD and earn guaranteed returns</Text>
                  <TouchableOpacity onPress={() => setTab('explore')} style={{ marginTop: 16, backgroundColor: '#1D4ED8', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#fff' }}>Explore FDs</Text>
                  </TouchableOpacity>
                </View>
              ) : myFDs.map(fd => (
                <View key={fd.id} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, ...SHADOWS.card }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: THEME.text }}>{fd.bank}</Text>
                      <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginTop: 2 }}>FD #{fd.fd_number}</Text>
                    </View>
                    <View style={{ backgroundColor: fd.status === 'ACTIVE' ? '#F0FDF4' : '#F5F5F7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontFamily: FONTS.semiBold, fontSize: 10, color: fd.status === 'ACTIVE' ? '#16A34A' : THEME.muted }}>{fd.status}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, backgroundColor: '#F5F5F7', borderRadius: 10, padding: 10 }}>
                    {[['Principal', `₹${fd.principal.toLocaleString()}`], ['Rate', `${fd.interest_rate}%`], ['Maturity', `₹${fd.maturity_amount.toLocaleString()}`], ['Interest', `₹${fd.interest_earned.toLocaleString()}`]].map(([l, v]) => (
                      <View key={l as string} style={{ alignItems: 'center' }}>
                        <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted }}>{l as string}</Text>
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: THEME.text, marginTop: 2 }}>{v as string}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted }}>Tenure: {fd.tenure_label}</Text>
                    <Text style={{ fontFamily: FONTS.semiBold, fontSize: 11, color: '#1D4ED8' }}>Matures: {fd.maturity_date}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {bookProduct && (
        <View style={{ position: 'absolute', inset: 0 } as any}>
          <BookModal product={bookProduct} onClose={() => setBookProduct(null)} />
        </View>
      )}
    </View>
  );
}
