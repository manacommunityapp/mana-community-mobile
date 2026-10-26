import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform, StatusBar, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { THEME, FONTS, SHADOWS } from '@/constants/config';
import { sendMoneyService, RecentContact, RECENT_CONTACTS, SendPayload } from '@/services/sendMoneyService';

const QUICK_AMOUNTS = ['100', '200', '500', '1000', '2000', '5000'];
const UPI_VPA_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;

interface DeviceContact {
  id?: string;
  name?: string;
  phoneNumbers?: Array<{ number?: string; digits?: string; label?: string }>;
}

interface PickedContact {
  name: string;
  initials: string;
  avatar_color: string;
  upi_id: string;
  phone?: string;
  fromDevice?: boolean;
}

type Step = 'PICK' | 'PAY';

function Avatar({ initials, color, size = 44 }: { initials: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

export default function SendMoneyScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('PICK');
  const [search, setSearch] = useState('');
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsPermission, setContactsPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [picked, setPicked] = useState<PickedContact | null>(null);
  const [upiId, setUpiId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [paying, setPaying] = useState(false);

  const loadDeviceContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        setContactsPermission('granted');
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
          sort: Contacts.SortTypes.FirstName,
        });
        setDeviceContacts((data as any[]).filter(c => c.name && c.phoneNumbers?.length));
      } else {
        setContactsPermission('denied');
      }
    } catch { setContactsPermission('denied'); }
    finally { setLoadingContacts(false); }
  }, []);

  useEffect(() => { loadDeviceContacts(); }, [loadDeviceContacts]);

  const filteredDevice = search.trim()
    ? deviceContacts.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phoneNumbers?.some(p => p.number?.replace(/\D/g, '').includes(search.replace(/\D/g, '')))
      ).slice(0, 30)
    : deviceContacts.slice(0, 50);

  const filteredRecent = search.trim()
    ? RECENT_CONTACTS.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.upi_id.toLowerCase().includes(search.toLowerCase())
      )
    : RECENT_CONTACTS;

  function pickRecent(c: RecentContact) {
    setPicked({ name: c.name, initials: c.initials, avatar_color: c.avatar_color, upi_id: c.upi_id });
    setUpiId(c.upi_id);
    setStep('PAY');
  }

  function pickDevice(c: DeviceContact) {
    const name = c.name || 'Unknown';
    const phone = c.phoneNumbers?.[0]?.digits || c.phoneNumbers?.[0]?.number?.replace(/\D/g, '') || '';
    const initials = sendMoneyService.extractInitials(name);
    const color = sendMoneyService.avatarColor(name);
    setPicked({ name, initials, avatar_color: color, phone, upi_id: '', fromDevice: true });
    setUpiId('');
    setStep('PAY');
  }

  async function handlePay() {
    const vpa = upiId.trim();
    if (!UPI_VPA_REGEX.test(vpa)) { Alert.alert('Invalid UPI ID', 'Enter a valid UPI ID (e.g. name@upi)'); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { Alert.alert('Invalid Amount', 'Enter a valid amount.'); return; }
    setPaying(true);
    try {
      const payload: SendPayload = { upi_id: vpa, name: picked?.name || 'Payee', amount: amt, note: note.trim() };
      await sendMoneyService.pay(payload);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not initiate payment. Please try again.');
    } finally {
      setPaying(false);
    }
  }

  const isValidUpi = UPI_VPA_REGEX.test(upiId.trim());
  const canPay = isValidUpi && parseFloat(amount) > 0;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.background }}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={{ backgroundColor: '#7C3AED', paddingTop: Platform.OS === 'ios' ? 52 : 20, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <TouchableOpacity onPress={() => step === 'PAY' ? setStep('PICK') : router.back()}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.medium, fontSize: 14 }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#fff' }}>💸 Send Money</Text>
          <View style={{ width: 48 }} />
        </View>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
          Send to any UPI ID · phone contacts · instant transfer
        </Text>
      </View>

      {step === 'PICK' ? (
        <View style={{ flex: 1 }}>
          {/* Search */}
          <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E8E9F0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 12, height: 42, gap: 8 }}>
              <Text style={{ fontSize: 16 }}>🔍</Text>
              <TextInput
                value={search} onChangeText={setSearch}
                placeholder="Search name, phone, UPI ID…"
                placeholderTextColor={THEME.muted}
                style={{ flex: 1, fontFamily: FONTS.regular, fontSize: 14, color: THEME.text }}
                returnKeyType="search"
              />
              {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Text style={{ color: THEME.muted, fontSize: 16 }}>✕</Text></TouchableOpacity>}
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            {/* Enter UPI ID directly */}
            <TouchableOpacity
              onPress={() => { setPicked({ name: 'New UPI Recipient', initials: '??', avatar_color: '#6B7280', upi_id: '' }); setUpiId(''); setStep('PAY'); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: '#7C3AED', ...SHADOWS.card }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>✏️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#7C3AED' }}>Enter UPI ID manually</Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginTop: 2 }}>name@upi · 9876543210@ybl · merchant@okhdfc</Text>
              </View>
              <Text style={{ color: '#7C3AED', fontSize: 18 }}>›</Text>
            </TouchableOpacity>

            {/* Recent contacts */}
            {filteredRecent.length > 0 && (
              <>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.muted, marginBottom: 10 }}>Recent Payments</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {filteredRecent.map(c => (
                      <TouchableOpacity key={c.id} onPress={() => pickRecent(c)} style={{ alignItems: 'center', width: 68, gap: 6 }}>
                        <Avatar initials={c.initials} color={c.avatar_color} size={52} />
                        <Text style={{ fontFamily: FONTS.semiBold, fontSize: 10, color: THEME.text, textAlign: 'center' }} numberOfLines={2}>{c.name}</Text>
                        {c.last_amount && <Text style={{ fontFamily: FONTS.regular, fontSize: 9, color: THEME.muted }}>₹{c.last_amount}</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {/* Device contacts */}
            {loadingContacts ? (
              <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
                <ActivityIndicator color="#7C3AED" />
                <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted }}>Loading contacts…</Text>
              </View>
            ) : contactsPermission === 'denied' ? (
              <View style={{ alignItems: 'center', paddingVertical: 32, gap: 10 }}>
                <Text style={{ fontSize: 36 }}>📵</Text>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: THEME.text }}>Contacts permission denied</Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted, textAlign: 'center' }}>Enable contacts permission in Settings to find people by name.</Text>
              </View>
            ) : filteredDevice.length > 0 ? (
              <>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.muted, marginBottom: 10 }}>From Contacts ({filteredDevice.length})</Text>
                <View style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E8E9F0', overflow: 'hidden', ...SHADOWS.card }}>
                  {filteredDevice.map((c, idx) => {
                    const name = c.name || '';
                    const phone = c.phoneNumbers?.[0]?.number || '';
                    const initials = sendMoneyService.extractInitials(name);
                    const color = sendMoneyService.avatarColor(name);
                    return (
                      <TouchableOpacity
                        key={(c as any).id || idx}
                        onPress={() => pickDevice(c)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderBottomWidth: idx < filteredDevice.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F5' }}
                      >
                        <Avatar initials={initials} color={color} size={40} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>{name}</Text>
                          <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginTop: 1 }}>{phone}</Text>
                        </View>
                        <Text style={{ color: THEME.muted, fontSize: 14 }}>›</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : search.trim() ? (
              <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
                <Text style={{ fontSize: 32 }}>🔍</Text>
                <Text style={{ fontFamily: FONTS.medium, fontSize: 14, color: THEME.muted }}>No contacts match "{search}"</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      ) : (
        /* ── Pay Step ─────────────────────────────────────────── */
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {/* Recipient card */}
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16, ...SHADOWS.card }}>
            <Avatar initials={picked?.initials || '?'} color={picked?.avatar_color || '#6B7280'} size={60} />
            <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text, marginTop: 10 }}>{picked?.name}</Text>
            {picked?.phone && <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted, marginTop: 2 }}>{picked.phone}</Text>}
          </View>

          {/* UPI ID */}
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 14, ...SHADOWS.card }}>
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted, marginBottom: 8 }}>UPI ID / VPA</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: isValidUpi && upiId ? '#7C3AED' : '#E8E9F0', borderRadius: 12, paddingHorizontal: 12, height: 48, gap: 8 }}>
              <Text style={{ fontFamily: FONTS.semiBold, color: THEME.muted }}>@</Text>
              <TextInput
                value={upiId} onChangeText={setUpiId}
                placeholder="name@upi or 9876543210@ybl"
                placeholderTextColor={THEME.muted}
                autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
                style={{ flex: 1, fontFamily: FONTS.medium, fontSize: 14, color: THEME.text }}
              />
              {isValidUpi && upiId.length > 0 && <Text style={{ color: '#16A34A', fontSize: 18 }}>✓</Text>}
            </View>
            {picked?.fromDevice && (
              <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginTop: 6 }}>
                Enter this person's UPI ID or mobile@upi format
              </Text>
            )}
          </View>

          {/* Amount */}
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 14, ...SHADOWS.card }}>
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted, marginBottom: 8 }}>Amount</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 12, paddingHorizontal: 12, height: 56, gap: 8 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 24, color: THEME.muted }}>₹</Text>
              <TextInput
                value={amount} onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
                placeholder="0.00" placeholderTextColor={THEME.muted} keyboardType="decimal-pad"
                style={{ flex: 1, fontFamily: FONTS.bold, fontSize: 28, color: THEME.text }}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {QUICK_AMOUNTS.map(a => (
                <TouchableOpacity key={a} onPress={() => setAmount(a)}
                  style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: amount === a ? '#7C3AED' : '#E8E9F0', backgroundColor: amount === a ? '#F5F3FF' : '#fff' }}>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: amount === a ? '#7C3AED' : THEME.text }}>₹{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Note */}
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 14, ...SHADOWS.card }}>
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted, marginBottom: 8 }}>Remark (optional)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 12, paddingHorizontal: 12, height: 48, gap: 8 }}>
              <Text style={{ color: THEME.muted }}>💬</Text>
              <TextInput
                value={note} onChangeText={setNote}
                placeholder="e.g. Society event, split lunch, rent…"
                placeholderTextColor={THEME.muted} maxLength={50}
                style={{ flex: 1, fontFamily: FONTS.regular, fontSize: 14, color: THEME.text }}
              />
            </View>
          </View>

          {/* Trust strip */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 4 }}>
            {[['🔒', '256-bit Encrypted'], ['🇮🇳', 'UPI Powered'], ['⚡', 'Instant Transfer']].map(([ico, lbl]) => (
              <View key={lbl as string} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F5F3FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                <Text style={{ fontSize: 11 }}>{ico as string}</Text>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 10, color: '#7C3AED' }}>{lbl as string}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Sticky pay footer on PAY step */}
      {step === 'PAY' && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8E9F0', paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 14, ...SHADOWS.card }}>
          {canPay && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>Paying to</Text>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.text }}>{upiId}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={handlePay} disabled={!canPay || paying}
            style={{ backgroundColor: canPay ? '#7C3AED' : '#E8E9F0', borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            {paying ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={{ fontSize: 16 }}>⚡</Text>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: canPay ? '#fff' : THEME.muted }}>
                  {canPay ? `Pay ₹${amount} to ${picked?.name}` : 'Enter UPI ID & Amount'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
