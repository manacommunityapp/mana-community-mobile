import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/config';
import { marketBazaarService } from '@/services/marketBazaarService';
import type { CreateMarketEventRequest, CreateMarketStallRequest, MarketEventDto, MarketStallDto } from '@/types/marketBazaar';

const msg = (e: unknown) => e instanceof Error ? e.message : 'Request failed. Please try again.';

export default function MarketOrganizerScreen() {
  const qc = useQueryClient();
  const [event, setEvent] = useState<MarketEventDto | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showStallForm, setShowStallForm] = useState(false);
  const [title, setTitle] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [stallNumber, setStallNumber] = useState('');
  const [zone, setZone] = useState('');
  const [packageName, setPackageName] = useState('');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  const [facilities, setFacilities] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const events = useQuery({ queryKey: ['organizerMarketEvents'], queryFn: marketBazaarService.getOrganizerEvents });
  const selected = event ?? events.data?.[0] ?? null;
  const stalls = useQuery({ queryKey: ['marketBazaarStalls', selected?.id], queryFn: () => marketBazaarService.getStalls(selected!.id), enabled: !!selected });
  const applications = useQuery({ queryKey: ['organizerMarketApplications', selected?.id], queryFn: () => marketBazaarService.getOrganizerApplications(selected!.id), enabled: !!selected });

  const createEvent = useMutation({
    mutationFn: (body: CreateMarketEventRequest) => marketBazaarService.createEvent(body),
    onSuccess: (created) => {
      setEvent(created); setShowEventForm(false); setTitle(''); setVenue(''); setCity(''); setStartsAt(''); setEndsAt('');
      qc.invalidateQueries({ queryKey: ['organizerMarketEvents'] });
      Alert.alert('Market created', 'The server returned status: ' + created.status.replaceAll('_', ' ') + '.');
    },
    onError: (e) => Alert.alert('Market not created', msg(e)),
  });
  const addStall = useMutation({
    mutationFn: (body: CreateMarketStallRequest) => marketBazaarService.createStall(selected!.id, body),
    onSuccess: () => {
      setShowStallForm(false); setStallNumber(''); setZone(''); setPackageName(''); setSize(''); setPrice(''); setFacilities('');
      qc.invalidateQueries({ queryKey: ['marketBazaarStalls', selected?.id] });
    },
    onError: (e) => Alert.alert('Stall not added', msg(e)),
  });
  const approve = useMutation({
    mutationFn: ({ id, stallId }: { id: number | string; stallId: number | string }) => marketBazaarService.approveApplication(id, stallId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizerMarketApplications', selected?.id] });
      qc.invalidateQueries({ queryKey: ['marketBazaarStalls', selected?.id] });
    },
    onError: (e) => Alert.alert('Approval failed', msg(e)),
  });
  const reject = useMutation({
    mutationFn: (id: number | string) => marketBazaarService.rejectApplication(id, rejectionReason.trim()),
    onSuccess: () => {
      setRejectionReason('');
      qc.invalidateQueries({ queryKey: ['organizerMarketApplications', selected?.id] });
    },
    onError: (e) => Alert.alert('Application not rejected', msg(e)),
  });

  const submitEvent = () => {
    if (!title.trim() || !communityId.trim() || !venue.trim() || !startsAt.trim()) {
      Alert.alert('Required details', 'Enter a title, community ID, venue, and start date/time.');
      return;
    }
    const body: CreateMarketEventRequest = { title: title.trim(), communityId: communityId.trim(), venue: venue.trim(), city: city.trim() || undefined, startsAt: startsAt.trim(), endsAt: endsAt.trim() || undefined };
    createEvent.mutate(body);
  };
  const submitStall = () => {
    const amount = Number(price);
    if (!selected || !stallNumber.trim() || !packageName.trim() || !Number.isFinite(amount) || amount < 0) {
      Alert.alert('Required details', 'Enter a stall number, package name, and a valid price.');
      return;
    }
    addStall.mutate({ stallNumber: stallNumber.trim(), zone: zone.trim() || undefined, packageName: packageName.trim(), size: size.trim() || undefined, price: amount, currency: 'INR', facilities: facilities.split(',').map((x) => x.trim()).filter(Boolean) });
  };

  return <ScrollView style={s.root} contentContainerStyle={s.body}>
    <Text style={s.kicker}>ORGANIZER PORTAL</Text>
    <Text style={s.title}>Manage community markets</Text>
    <Text style={s.sub}>Create market listings, configure stall inventory, and review exhibitor applications. Server permissions control organizer access.</Text>
    <View style={s.actions}>
      <TouchableOpacity style={s.button} onPress={() => setShowEventForm(!showEventForm)}><Ionicons name="add" size={18} color="#fff" /><Text style={s.buttonText}>Create market</Text></TouchableOpacity>
      <TouchableOpacity disabled={!selected} style={[s.secondaryButton, !selected && s.disabled]} onPress={() => setShowStallForm(!showStallForm)}><Ionicons name="grid-outline" size={17} color="#047857" /><Text style={s.secondaryText}>Add stalls</Text></TouchableOpacity>
    </View>
    {events.isLoading ? <ActivityIndicator style={{ margin: 24 }} color={COLORS.primary} /> : null}
    {events.isError ? <View style={s.notice}><Text style={s.noticeText}>Organizer markets could not be loaded. You may need organizer permissions.</Text><TouchableOpacity onPress={() => events.refetch()}><Text style={s.link}>Retry</Text></TouchableOpacity></View> : null}
    <Text style={s.section}>Your markets</Text>
    {(events.data ?? []).map((item) => <TouchableOpacity key={String(item.id)} onPress={() => setEvent(item)} style={[s.eventChip, selected?.id === item.id && s.eventChipActive]}><Text style={[s.eventName, selected?.id === item.id && s.eventNameActive]}>{item.title}</Text><Text style={[s.meta, selected?.id === item.id && { color: '#D1FAE5' }]}>{item.status.replaceAll('_', ' ')} · {item.venue}</Text></TouchableOpacity>)}
    {!events.isLoading && !events.isError && !(events.data ?? []).length ? <Text style={s.meta}>No organizer markets returned.</Text> : null}
    {selected ? <>
      <View style={s.selectedHead}><View style={{ flex: 1 }}><Text style={s.section}>{selected.title}</Text><Text style={s.meta}>{selected.status.replaceAll('_', ' ')} · {selected.venue}</Text></View><TouchableOpacity onPress={() => { stalls.refetch(); applications.refetch(); }}><Ionicons name="refresh" size={20} color="#047857" /></TouchableOpacity></View>
      <Text style={s.section}>Stall inventory</Text>
      {stalls.isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
      {stalls.isError ? <Text style={s.error}>Unable to load stalls. Retry using refresh above.</Text> : null}
      {(stalls.data ?? []).map((stall) => <StallRow key={String(stall.id)} stall={stall} />)}
      <Text style={s.section}>Applications</Text>
      {applications.isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
      {applications.isError ? <Text style={s.error}>Unable to load applications. Retry using refresh above.</Text> : null}
      {(applications.data ?? []).map((application) => {
        const assignable = (stalls.data ?? []).filter((stall) => stall.status === 'AVAILABLE');
        const pending = application.status === 'SUBMITTED' || application.status === 'UNDER_REVIEW';
        return <View key={String(application.id)} style={s.appCard}>
          <View style={s.row}><Text style={[s.appTitle, { flex: 1 }]}>{application.businessName || application.vendorName}</Text><Text style={s.appStatus}>{application.status.replaceAll('_', ' ')}</Text></View>
          <Text style={s.meta}>{application.category} · {application.phone}</Text>
          <Text style={s.meta}>{application.products}</Text>
          {pending ? assignable.length ? <View style={s.assignBlock}><Text style={s.meta}>Approve and assign a stall:</Text><View style={s.stallChoices}>{assignable.map((stall) => <TouchableOpacity key={String(stall.id)} onPress={() => approve.mutate({ id: application.id, stallId: stall.id })} disabled={approve.isPending} style={s.smallButton}><Text style={s.buttonText}>{stall.stallNumber}</Text></TouchableOpacity>)}</View></View> : <Text style={s.error}>No available stall to assign.</Text> : null}
          {pending ? <View style={s.rejectRow}><TextInput value={rejectionReason} onChangeText={setRejectionReason} placeholder="Rejection reason" placeholderTextColor="#94A3B8" style={s.rejectInput} /><TouchableOpacity onPress={() => reject.mutate(application.id)} style={s.rejectButton} disabled={!rejectionReason.trim() || reject.isPending}><Text style={s.rejectText}>Reject</Text></TouchableOpacity></View> : null}
          {!!application.rejectionReason && <Text style={s.error}>{application.rejectionReason}</Text>}
        </View>;
      })}
    </> : null}

    {showEventForm ? <View style={s.form}>
      <Text style={s.section}>New market event</Text>
      <Input label="Market title" value={title} set={setTitle} placeholder="Community winter bazaar" />
      <Input label="Community ID" value={communityId} set={setCommunityId} placeholder="Your community ID" />
      <Input label="Venue" value={venue} set={setVenue} placeholder="Clubhouse lawn" />
      <Input label="City" value={city} set={setCity} placeholder="City" />
      <Input label="Starts at (ISO date/time)" value={startsAt} set={setStartsAt} placeholder="2026-12-01T09:00:00" />
      <Input label="Ends at (optional)" value={endsAt} set={setEndsAt} placeholder="2026-12-01T18:00:00" />
      <TouchableOpacity style={s.button} onPress={submitEvent} disabled={createEvent.isPending}>{createEvent.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Create market</Text>}</TouchableOpacity>
    </View> : null}
    {showStallForm ? <View style={s.form}>
      <Text style={s.section}>Add a stall</Text>
      <Input label="Stall number" value={stallNumber} set={setStallNumber} placeholder="A-01" />
      <Input label="Package name" value={packageName} set={setPackageName} placeholder="Basic booth" />
      <Input label="Zone (optional)" value={zone} set={setZone} placeholder="Food court" />
      <Input label="Size (optional)" value={size} set={setSize} placeholder="3m × 3m" />
      <Input label="Price (₹)" value={price} set={setPrice} placeholder="4000" />
      <Input label="Included facilities (comma separated)" value={facilities} set={setFacilities} placeholder="Table, chairs, power" />
      <TouchableOpacity style={s.button} onPress={submitStall} disabled={addStall.isPending}>{addStall.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Save stall</Text>}</TouchableOpacity>
    </View> : null}
  </ScrollView>;
}

function Input({ label, value, set, placeholder }: { label: string; value: string; set: (v: string) => void; placeholder: string }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor="#94A3B8" style={s.input} /></View>;
}
function StallRow({ stall }: { stall: MarketStallDto }) {
  return <View style={s.stallRow}><View style={{ flex: 1 }}><Text style={s.eventName}>{stall.stallNumber} · {stall.packageName}</Text><Text style={s.meta}>{[stall.zone, stall.size, stall.status].filter(Boolean).join(' · ')}</Text></View><Text style={s.price}>₹{stall.price.toLocaleString('en-IN')}</Text></View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' }, body: { padding: 16, paddingBottom: 40 },
  kicker: { color: '#047857', fontWeight: '900', letterSpacing: 1.2, fontSize: 11, marginTop: 8 },
  title: { color: '#0F172A', fontSize: 23, fontWeight: '900', marginTop: 8 }, sub: { color: '#64748B', fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 15 },
  actions: { flexDirection: 'row', gap: 9, marginBottom: 16 }, button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#047857', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11 },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 12 }, secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF5', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11 },
  secondaryText: { color: '#047857', fontWeight: '900', fontSize: 12 }, disabled: { opacity: .5 }, section: { color: '#0F172A', fontSize: 15, fontWeight: '900', marginTop: 14, marginBottom: 8 },
  eventChip: { padding: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#fff', marginBottom: 8 }, eventChipActive: { backgroundColor: '#047857', borderColor: '#047857' },
  eventName: { color: '#0F172A', fontWeight: '800', fontSize: 13 }, eventNameActive: { color: '#fff' }, meta: { color: '#64748B', fontSize: 11, lineHeight: 17 },
  selectedHead: { flexDirection: 'row', alignItems: 'center', marginTop: 8 }, stallRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 7 },
  price: { color: '#047857', fontSize: 13, fontWeight: '900' }, appCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, gap: 8, marginBottom: 9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, appTitle: { color: '#0F172A', fontWeight: '900' }, appStatus: { color: '#7C3AED', fontSize: 10, fontWeight: '900' },
  assignBlock: { gap: 7 }, stallChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, smallButton: { backgroundColor: '#047857', borderRadius: 8, padding: 8 }, rejectRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rejectInput: { flex: 1, height: 40, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 9, paddingHorizontal: 10, color: '#0F172A' }, rejectButton: { backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8 }, rejectText: { color: '#B91C1C', fontWeight: '900', fontSize: 12 },
  error: { color: '#B91C1C', fontSize: 12 }, notice: { backgroundColor: '#FFFBEB', padding: 12, borderRadius: 10, gap: 6 }, noticeText: { color: '#92400E', fontSize: 12 }, link: { color: '#047857', fontWeight: '900' },
  form: { marginTop: 16, padding: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 14 }, field: { marginBottom: 7 }, label: { color: '#334155', fontWeight: '800', fontSize: 11, marginBottom: 4 }, input: { minHeight: 42, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 9, paddingHorizontal: 10, color: '#0F172A', backgroundColor: '#fff' },
});

