import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS } from '@/constants/config';
import { PaymentModal } from '@/components/payment/PaymentModal';
import { marketBazaarService } from '@/services/marketBazaarService';
import { paymentService, type CashfreeOrderResponse } from '@/services/paymentService';
import type { MarketApplicationDto, MarketEventDto, MarketStallDto } from '@/types/marketBazaar';

type PaymentStatus = 'idle' | 'checkout' | 'verifying' | 'success' | 'failed';
const colors: Record<string, string> = { SUBMITTED: '#2563EB', UNDER_REVIEW: '#7C3AED', APPROVED: '#059669', PAYMENT_PENDING: '#D97706', CONFIRMED: '#059669', REJECTED: '#DC2626', CANCELLED: '#64748B', EXPIRED: '#64748B', REFUND_PENDING: '#D97706', REFUNDED: '#64748B' };
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Please try again.';

function dateText(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function MarketDaysScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'discover' | 'applications'>('discover');
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<MarketEventDto | null>(null);
  const [selectedStall, setSelectedStall] = useState<MarketStallDto | null>(null);
  const [showApplication, setShowApplication] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [products, setProducts] = useState('');
  const [compliance, setCompliance] = useState('');
  const [paymentOrder, setPaymentOrder] = useState<CashfreeOrderResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const events = useQuery({
    queryKey: ['marketBazaarEvents', query, city, eventCategory],
    queryFn: () => marketBazaarService.getEvents({ query: query.trim() || undefined, city: city.trim() || undefined, category: eventCategory || undefined, page: 0, size: 30 }),
  });
  const stalls = useQuery({
    queryKey: ['marketBazaarStalls', selectedEvent?.id],
    queryFn: () => marketBazaarService.getStalls(selectedEvent!.id),
    enabled: !!selectedEvent,
  });
  const applications = useQuery({
    queryKey: ['myMarketApplications'],
    queryFn: marketBazaarService.getMyApplications,
    enabled: tab === 'applications',
  });
  const apply = useMutation({
    mutationFn: () => {
      if (!selectedEvent || !selectedStall) throw new Error('Select an available stall first.');
      return marketBazaarService.applyForStall(selectedEvent.id, {
        stallId: selectedStall.id, vendorName: vendorName.trim(), businessName: businessName.trim(),
        category: category.trim(), phone: phone.trim(), products: products.trim(),
        complianceDocuments: compliance.trim() ? [compliance.trim()] : [],
      });
    },
    onSuccess: (result) => {
      setShowApplication(false);
      setSelectedStall(null);
      setVendorName(''); setBusinessName(''); setPhone(''); setCategory(''); setProducts(''); setCompliance('');
      qc.invalidateQueries({ queryKey: ['myMarketApplications'] });
      qc.invalidateQueries({ queryKey: ['marketBazaarStalls'] });
      Alert.alert('Application received', 'Application ' + result.id + ' is ' + result.status.replaceAll('_', ' ').toLowerCase() + '.');
    },
    onError: (error) => Alert.alert('Application not submitted', errorText(error)),
  });
  const checkout = useMutation({
    mutationFn: (application: MarketApplicationDto) => marketBazaarService.checkoutBooking(application.bookingId ?? application.id),
    onSuccess: (order) => { setPaymentOrder(order); setPaymentError(null); setPaymentStatus('checkout'); },
    onError: (error) => Alert.alert('Checkout unavailable', errorText(error)),
  });

  const visibleEvents = (events.data ?? []).filter((event) => {
    const text = (event.title + ' ' + (event.description ?? '') + ' ' + (event.venue ?? '') + ' ' + (event.city ?? '')).toLowerCase();
    return (!query.trim() || text.includes(query.trim().toLowerCase())) && (!city.trim() || (event.city ?? '').toLowerCase().includes(city.trim().toLowerCase())) && (!eventCategory || (event.category ?? '').toLowerCase() === eventCategory.toLowerCase());
  });

  const submitApplication = () => {
    if (!vendorName.trim() || !businessName.trim() || !phone.trim() || !category.trim() || !products.trim()) {
      Alert.alert('Complete the form', 'Enter your contact details, business, category, and products.');
      return;
    }
    if (!/^[+0-9() -]{8,20}$/.test(phone.trim())) {
      Alert.alert('Check phone number', 'Enter a valid phone number.');
      return;
    }
    apply.mutate();
  };

  const verifyPayment = async (orderId: string) => {
    setPaymentStatus('verifying');
    try {
      const verified = await paymentService.verifyPayment(orderId);
      if (verified.status === 'PAID') {
        setPaymentOrder(verified); setPaymentStatus('success');
        await qc.invalidateQueries({ queryKey: ['myMarketApplications'] });
        await qc.invalidateQueries({ queryKey: ['marketBazaarStalls'] });
      } else {
        setPaymentError(verified.failureReason ?? 'Payment is not confirmed yet. Refresh your applications before retrying.');
        setPaymentStatus('failed');
      }
    } catch (error) {
      setPaymentError(errorText(error)); setPaymentStatus('failed');
    }
  };
  const dismissPayment = () => {
    const paid = paymentStatus === 'success';
    setPaymentStatus('idle'); setPaymentOrder(null); setPaymentError(null);
    if (paid) setTab('applications');
  };

  return <View style={s.root}>
    <View style={s.tabs}>
      <TouchableOpacity onPress={() => setTab('discover')} style={[s.tab, tab === 'discover' && s.tabOn]}><Text style={[s.tabText, tab === 'discover' && s.tabTextOn]}>Discover</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setTab('applications')} style={[s.tab, tab === 'applications' && s.tabOn]}><Text style={[s.tabText, tab === 'applications' && s.tabTextOn]}>My applications</Text></TouchableOpacity>
    </View>
    {tab === 'discover' ? <ScrollView contentContainerStyle={s.body} refreshControl={<RefreshControl refreshing={events.isRefetching} onRefresh={() => events.refetch()} />}>
      <Text style={s.eyebrow}>MANA COMMUNITY BAZAAR</Text>
      <Text style={s.heading}>Markets around your community</Text>
      <Text style={s.sub}>Discover local events, browse current stall inventory, and apply to exhibit.</Text>
      <TouchableOpacity style={s.organizerLink} onPress={() => router.push('/offers/organizer' as any)}><Ionicons name="settings-outline" size={15} color="#047857" /><Text style={s.organizerLinkText}>Organizer tools</Text></TouchableOpacity>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search markets, venues, or communities" placeholderTextColor="#94A3B8" style={s.input} />
      <TextInput value={city} onChangeText={setCity} placeholder="Filter by city" placeholderTextColor="#94A3B8" style={s.input} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categories}>
        {['All categories', 'Food', 'Produce', 'Artisan', 'Clothing', 'Services'].map((item) => {
          const value = item === 'All categories' ? '' : item;
          const active = eventCategory === value;
          return <TouchableOpacity key={item} onPress={() => setEventCategory(value)} style={[s.categoryChip, active && s.categoryChipActive]}><Text style={[s.categoryText, active && s.categoryTextActive]}>{item}</Text></TouchableOpacity>;
        })}
      </ScrollView>
      {events.isLoading ? <ActivityIndicator style={s.spinner} color={COLORS.primary} /> : null}
      {events.isError ? <View style={s.notice}><Text style={s.noticeText}>Markets are unavailable. No sample inventory is being displayed.</Text><TouchableOpacity onPress={() => events.refetch()}><Text style={s.link}>Retry</Text></TouchableOpacity></View> : null}
      {!events.isLoading && !events.isError && visibleEvents.length === 0 ? <View style={s.empty}><Ionicons name="storefront-outline" size={34} color="#94A3B8" /><Text style={s.emptyTitle}>No published markets</Text><Text style={s.sub}>Try another search or check back later.</Text></View> : null}
      {visibleEvents.map((event) => {
        const open = selectedEvent?.id === event.id;
        return <View key={String(event.id)} style={s.card}>
          <TouchableOpacity style={s.eventHead} onPress={() => setSelectedEvent(open ? null : event)}>
            <View style={s.icon}><Ionicons name="storefront" size={22} color="#047857" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{event.title}</Text>
              <Text style={s.meta}>{dateText(event.startsAt)}</Text>
              <Text style={s.meta}>{[event.venue, event.city, event.communityName].filter(Boolean).join(' · ') || 'Location to be announced'}</Text>
            </View>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={19} color="#64748B" />
          </TouchableOpacity>
          {!!event.description && <Text style={s.description}>{event.description}</Text>}
          <View style={s.row}><Text style={s.pill}>{event.status.replaceAll('_', ' ')}</Text><Text style={s.meta}>{event.availableStallCount ?? '—'} available stalls</Text><Text style={s.meta}>{event.vendorCount ?? 0} vendors</Text></View>
          {open ? <View style={s.inventory}>
            <Text style={s.section}>Stall packages</Text>
            {stalls.isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
            {stalls.isError ? <View style={s.notice}><Text style={s.noticeText}>Inventory could not be loaded.</Text><TouchableOpacity onPress={() => stalls.refetch()}><Text style={s.link}>Retry</Text></TouchableOpacity></View> : null}
            {!stalls.isLoading && !stalls.isError && !(stalls.data ?? []).length ? <Text style={s.meta}>No stalls have been published for this market.</Text> : null}
            {(stalls.data ?? []).map((stall) => {
              const available = stall.status === 'AVAILABLE' && event.status === 'PUBLISHED';
              return <View key={String(stall.id)} style={s.stall}>
                <View style={s.rowBetween}><View style={{ flex: 1 }}><Text style={s.stallTitle}>{stall.packageName} · {stall.stallNumber}</Text><Text style={s.meta}>{[stall.zone, stall.size].filter(Boolean).join(' · ')}</Text></View><Text style={s.price}>{stall.currency && stall.currency !== 'INR' ? stall.currency + ' ' : '₹'}{stall.price.toLocaleString('en-IN')}</Text></View>
                {!!stall.description && <Text style={s.meta}>{stall.description}</Text>}
                {!!stall.facilities?.length && <Text style={s.meta}>Includes {stall.facilities.join(' · ')}</Text>}
                <View style={s.rowBetween}><Text style={[s.stallStatus, !available && { color: '#64748B' }]}>{stall.status.replaceAll('_', ' ')}</Text><TouchableOpacity disabled={!available} onPress={() => { setSelectedStall(stall); setSelectedEvent(event); setShowApplication(true); }} style={[s.button, !available && s.disabled]}><Text style={s.buttonText}>Apply for stall</Text></TouchableOpacity></View>
              </View>;
            })}
          </View> : null}
        </View>;
      })}
    </ScrollView> : <ScrollView contentContainerStyle={s.body} refreshControl={<RefreshControl refreshing={applications.isRefetching} onRefresh={() => applications.refetch()} />}>
      <Text style={s.heading}>My stall applications</Text><Text style={s.sub}>Approval and payment are separate steps. A stall is confirmed only after payment verification.</Text>
      {applications.isLoading ? <ActivityIndicator style={s.spinner} color={COLORS.primary} /> : null}
      {applications.isError ? <View style={s.notice}><Text style={s.noticeText}>Applications could not be loaded.</Text><TouchableOpacity onPress={() => applications.refetch()}><Text style={s.link}>Retry</Text></TouchableOpacity></View> : null}
      {!applications.isLoading && !applications.isError && !(applications.data ?? []).length ? <View style={s.empty}><Ionicons name="clipboard-outline" size={34} color="#94A3B8" /><Text style={s.emptyTitle}>No applications yet</Text><Text style={s.sub}>Apply for an available stall to track it here.</Text></View> : null}
      {(applications.data ?? []).map((app) => <View key={String(app.id)} style={s.card}>
        <View style={s.rowBetween}><View style={{ flex: 1 }}><Text style={s.cardTitle}>{app.businessName || app.vendorName}</Text><Text style={s.meta}>{app.eventTitle || 'Community market'}{app.stallNumber ? ' · ' + app.stallNumber : ''}</Text></View><Text style={{ color: colors[app.status] ?? '#64748B', fontWeight: '900', fontSize: 11 }}>{app.status.replaceAll('_', ' ')}</Text></View>
        {!!app.rejectionReason && <Text style={s.errorText}>{app.rejectionReason}</Text>}
        {app.status === 'PAYMENT_PENDING' ? <View style={s.rowBetween}><Text style={s.price}>{app.amountDue == null ? 'Payment required' : 'Due ₹' + app.amountDue.toLocaleString('en-IN')}</Text><TouchableOpacity disabled={checkout.isPending} onPress={() => checkout.mutate(app)} style={s.button}>{checkout.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Pay and confirm</Text>}</TouchableOpacity></View> : null}
      </View>)}
    </ScrollView>}

    <Modal visible={showApplication} animationType="slide" transparent onRequestClose={() => setShowApplication(false)}>
      <View style={s.backdrop}><View style={s.modal}>
        <View style={s.rowBetween}><View style={{ flex: 1 }}><Text style={s.modalTitle}>Apply for {selectedStall?.stallNumber}</Text><Text style={s.meta}>{selectedEvent?.title} · {selectedStall?.packageName}</Text></View><TouchableOpacity onPress={() => setShowApplication(false)}><Ionicons name="close" size={24} color="#334155" /></TouchableOpacity></View>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Label title="Contact name" value={vendorName} set={setVendorName} placeholder="Your name" />
          <Label title="Business name" value={businessName} set={setBusinessName} placeholder="Trading or registered name" />
          <Label title="Phone" value={phone} set={setPhone} placeholder="+91 98765 43210" />
          <Label title="Category" value={category} set={setCategory} placeholder="Food, crafts, clothing…" />
          <Label title="Products or services" value={products} set={setProducts} placeholder="Describe what you plan to sell" multiline />
          <Label title="Compliance document reference (optional)" value={compliance} set={setCompliance} placeholder="FSSAI / GST / other reference" />
          <Text style={s.disclaimer}>The organizer reviews this application. Approval does not confirm a booking; payment is a separate step.</Text>
          <TouchableOpacity disabled={apply.isPending} onPress={submitApplication} style={s.button}>{apply.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Submit application</Text>}</TouchableOpacity>
        </ScrollView>
      </View></View>
    </Modal>
    <PaymentModal visible={paymentStatus !== 'idle'} order={paymentOrder} status={paymentStatus} error={paymentError} onVerify={verifyPayment} onDismiss={dismissPayment} />
  </View>;
}

function Label({ title, value, set, placeholder, multiline }: { title: string; value: string; set: (v: string) => void; placeholder: string; multiline?: boolean }) {
  return <View style={s.field}><Text style={s.label}>{title}</Text><TextInput value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor="#94A3B8" multiline={multiline} style={[s.input, multiline && { minHeight: 76, textAlignVertical: 'top', paddingTop: 10 }]} /></View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' }, body: { padding: 16, paddingBottom: 36 },
  tabs: { flexDirection: 'row', margin: 14, marginBottom: 0, padding: 4, borderRadius: 13, backgroundColor: '#E2E8F0' },
  tab: { flex: 1, padding: 11, borderRadius: 10, alignItems: 'center' }, tabOn: { backgroundColor: '#047857' },
  tabText: { color: '#475569', fontWeight: '800', fontSize: 13 }, tabTextOn: { color: '#fff' },
  eyebrow: { color: '#047857', fontWeight: '900', letterSpacing: 1.2, fontSize: 11, marginTop: 8 },
  heading: { color: '#0F172A', fontSize: 23, fontWeight: '900', marginTop: 8, marginBottom: 6 },
  sub: { color: '#64748B', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  input: { minHeight: 44, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, color: '#0F172A', backgroundColor: '#fff', marginBottom: 10 },
  spinner: { margin: 28 }, notice: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1, borderRadius: 12, padding: 13, marginVertical: 8, gap: 6 },
  noticeText: { color: '#92400E', fontSize: 13, lineHeight: 19 }, link: { color: '#047857', fontWeight: '900', paddingVertical: 4 },
  empty: { alignItems: 'center', padding: 24, borderRadius: 14, backgroundColor: '#fff', gap: 8, marginVertical: 10 },
  emptyTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 15, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12, gap: 10 },
  eventHead: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#0F172A', fontWeight: '800', fontSize: 15 }, meta: { color: '#64748B', fontSize: 11, lineHeight: 16 },
  description: { color: '#475569', fontSize: 13, lineHeight: 19 }, row: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  pill: { color: '#047857', backgroundColor: '#ECFDF5', overflow: 'hidden', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: '900' },
  inventory: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12, gap: 10 }, section: { color: '#0F172A', fontWeight: '900', fontSize: 15 },
  stall: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 11, gap: 8 },
  stallTitle: { color: '#0F172A', fontWeight: '800', fontSize: 13 }, price: { color: '#047857', fontWeight: '900', fontSize: 14 }, stallStatus: { color: '#047857', fontSize: 10, fontWeight: '900' },
  button: { backgroundColor: '#047857', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  organizerLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 10, paddingVertical: 6 },
  organizerLinkText: { color: '#047857', fontWeight: '800', fontSize: 12 },
  categories: { gap: 7, paddingBottom: 12 }, categoryChip: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff' }, categoryChipActive: { borderColor: '#047857', backgroundColor: '#ECFDF5' }, categoryText: { color: '#475569', fontSize: 11, fontWeight: '700' }, categoryTextActive: { color: '#047857' },
  disabled: { backgroundColor: '#94A3B8' }, buttonText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  errorText: { color: '#B91C1C', fontSize: 12 }, backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,.55)', justifyContent: 'flex-end' },
  modal: { maxHeight: '92%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18 },
  modalTitle: { color: '#0F172A', fontWeight: '900', fontSize: 18 }, field: { marginTop: 10 }, label: { color: '#334155', fontWeight: '800', fontSize: 12, marginBottom: 5 },
  disclaimer: { color: '#64748B', fontSize: 11, lineHeight: 16, marginVertical: 10 },
});
