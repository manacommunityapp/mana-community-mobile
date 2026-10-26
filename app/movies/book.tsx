import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking, Platform, StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { movieService, SeatRow, SeatType } from '@/services/movieService';
import { THEME, FONTS, SHADOWS } from '@/constants/config';

const SEAT_TYPE_LABELS: Record<SeatType, string> = { CLASSIC: 'Classic', PREMIUM: 'Premium', RECLINER: 'Recliner' };
const MAX_SEATS = 6;

type LocalSeat = { row: string; number: number; type: SeatType };

function SeatGrid({ rows, selected, onToggle }: {
  rows: SeatRow[];
  selected: LocalSeat[];
  onToggle: (row: string, num: number, type: SeatType) => void;
}) {
  const selSet = new Set(selected.map(s => `${s.row}-${s.number}`));
  const grouped: Record<SeatType, SeatRow[]> = { CLASSIC: [], PREMIUM: [], RECLINER: [] };
  rows.forEach(r => { if (r.seat_type in grouped) grouped[r.seat_type].push(r); });

  const COLOR = {
    available: '#E8E9F0',
    occupied: '#374151',
    selected: THEME.primary,
    classic_label: '#6B7280',
    premium_label: '#7C3AED',
  };

  return (
    <View>
      {/* Screen indicator */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <View style={{ width: '70%', height: 6, backgroundColor: '#CBD5E1', borderRadius: 3, marginBottom: 4 }} />
        <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted }}>SCREEN</Text>
      </View>

      {(['CLASSIC', 'PREMIUM'] as SeatType[]).map(type => (
        grouped[type].length > 0 && (
          <View key={type} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E8E9F0' }} />
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 11, color: type === 'PREMIUM' ? '#7C3AED' : '#6B7280' }}>
                {SEAT_TYPE_LABELS[type]}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E8E9F0' }} />
            </View>
            {grouped[type].map(rowData => (
              <View key={rowData.row} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ width: 20, fontFamily: FONTS.medium, fontSize: 11, color: THEME.muted, textAlign: 'right', marginRight: 6 }}>
                  {rowData.row}
                </Text>
                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                  {rowData.seats.map(seat => {
                    const key = `${rowData.row}-${seat.number}`;
                    const isSel = selSet.has(key);
                    const isOcc = seat.status === 'OCCUPIED';
                    return (
                      <TouchableOpacity
                        key={key}
                        disabled={isOcc}
                        onPress={() => onToggle(rowData.row, seat.number, rowData.seat_type)}
                        style={{
                          width: 26, height: 24, borderRadius: 5,
                          backgroundColor: isOcc ? COLOR.occupied : isSel ? COLOR.selected : COLOR.available,
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {!isOcc && (
                          <Text style={{ fontSize: 8, color: isSel ? '#fff' : '#9CA3AF' }}>{seat.number}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )
      ))}

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
        {[
          { color: COLOR.available, label: 'Available' },
          { color: COLOR.selected, label: 'Selected' },
          { color: COLOR.occupied, label: 'Booked' },
        ].map(item => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: item.color }} />
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted }}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function BookScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    showtimeId: string; movieId: string; movieTitle: string; movieEmoji: string;
    backdropColor: string; theater: string; date: string; time: string; format: string;
    priceClassic: string; pricePremium: string;
  }>();

  const [selected, setSelected] = useState<LocalSeat[]>([]);
  const [booking, setBooking] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['seats', params.showtimeId],
    queryFn: () => movieService.getSeatLayout(params.showtimeId),
    staleTime: 60 * 1000,
  });

  const priceClassic = parseInt(params.priceClassic ?? '180', 10);
  const pricePremium = parseInt(params.pricePremium ?? '280', 10);

  const { total, breakdown } = useMemo(() => {
    const classic = selected.filter(s => s.type === 'CLASSIC').length;
    const premium = selected.filter(s => s.type === 'PREMIUM').length;
    return {
      total: classic * priceClassic + premium * pricePremium,
      breakdown: [
        classic > 0 ? `${classic} Classic × ₹${priceClassic}` : '',
        premium > 0 ? `${premium} Premium × ₹${pricePremium}` : '',
      ].filter(Boolean).join('  +  '),
    };
  }, [selected, priceClassic, pricePremium]);

  function toggleSeat(row: string, number: number, type: SeatType) {
    setSelected(prev => {
      const key = `${row}-${number}`;
      const exists = prev.find(s => `${s.row}-${s.number}` === key);
      if (exists) return prev.filter(s => `${s.row}-${s.number}` !== key);
      if (prev.length >= MAX_SEATS) {
        Alert.alert('Max Seats', `You can select up to ${MAX_SEATS} seats at once.`);
        return prev;
      }
      return [...prev, { row, number, type }];
    });
  }

  async function handleBook() {
    if (selected.length === 0) {
      Alert.alert('No Seats', 'Please select at least one seat.');
      return;
    }
    setBooking(true);
    try {
      const result = await movieService.bookTickets({
        showtime_id: params.showtimeId,
        movie_id: params.movieId,
        seats: selected.map(s => `${s.row}${s.number}`),
        seat_type: selected.some(s => s.type === 'PREMIUM') ? 'PREMIUM' : 'CLASSIC',
        amount: total + total * 0.0175, // add booking fee
      });

      const totalWithFee = Math.round(total + total * 0.0175);

      // Try PhonePe first, then generic UPI
      const tryUpi = async () => {
        const apps = [
          result.phone_pe_url,
          result.upi_intent_url,
          `tez://upi/pay?pa=movies@setu&pn=Mana+Movies&am=${totalWithFee}&cu=INR`,
          `paytmmp://pay?pa=movies@setu&pn=Mana+Movies&am=${totalWithFee}&cu=INR`,
        ];
        for (const url of apps) {
          const can = await Linking.canOpenURL(url).catch(() => false);
          if (can) { await Linking.openURL(url); return true; }
        }
        return false;
      };

      const opened = await tryUpi();
      if (!opened) {
        Alert.alert(
          'Open UPI App',
          `Pay ₹${totalWithFee.toLocaleString()} using any UPI app.\nRef: ${result.booking_id}`,
          [{ text: 'OK' }]
        );
      }

      Alert.alert(
        '🎬 Booking Confirmed!',
        `${params.movieTitle}\n${params.theater}\n${params.date} · ${params.time}\nSeats: ${selected.map(s => `${s.row}${s.number}`).join(', ')}\nBooking ID: ${result.booking_id}`,
        [{ text: 'Done', onPress: () => router.replace('/movies') }]
      );
    } catch (e) {
      Alert.alert('Error', 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  }

  const fmtDate = (d: string) => {
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
    } catch { return d; }
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.background }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={{ backgroundColor: params.backdropColor || '#1A1A2E', paddingTop: Platform.OS === 'ios' ? 52 : 20, paddingBottom: 14, paddingHorizontal: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.medium, fontSize: 13 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#fff' }}>{params.movieEmoji} {params.movieTitle}</Text>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>
          {params.theater}  ·  {fmtDate(params.date ?? '')}  ·  {params.time}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontFamily: FONTS.semiBold, fontSize: 11 }}>{params.format}</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: FONTS.regular }}>Select up to {MAX_SEATS} seats</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={THEME.primary} size="large" />
          <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: THEME.muted, marginTop: 12 }}>Loading seat map…</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          <SeatGrid rows={rows} selected={selected} onToggle={toggleSeat} />
        </ScrollView>
      )}

      {/* Bottom checkout bar */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8E9F0',
        padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        ...SHADOWS.card,
      }}>
        {selected.length > 0 ? (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted }}>
              {selected.map(s => `${s.row}${s.number}`).join('  ')}
            </Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginTop: 2 }}>{breakdown}</Text>
          </View>
        ) : (
          <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted, marginBottom: 10 }}>
            Select seats to continue
          </Text>
        )}
        <TouchableOpacity
          onPress={handleBook}
          disabled={selected.length === 0 || booking}
          style={{
            backgroundColor: selected.length > 0 ? THEME.primary : '#E8E9F0',
            borderRadius: 14, paddingVertical: 14, alignItems: 'center',
          }}
        >
          {booking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: selected.length > 0 ? '#fff' : THEME.muted }}>
              {selected.length > 0
                ? `Book ${selected.length} Seat${selected.length > 1 ? 's' : ''} · ₹${(total + Math.round(total * 0.0175)).toLocaleString()}`
                : 'Select Seats'}
            </Text>
          )}
        </TouchableOpacity>
        {selected.length > 0 && (
          <Text style={{ textAlign: 'center', fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted, marginTop: 6 }}>
            Incl. ₹{Math.round(total * 0.0175)} booking fee · Pay via PhonePe / UPI
          </Text>
        )}
      </View>
    </View>
  );
}
