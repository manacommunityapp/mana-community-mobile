import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Platform, StatusBar, Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { movieService, SeatRow, SeatType, BookingResult } from '@/services/movieService';
import { THEME, FONTS, SHADOWS } from '@/constants/config';

const SEAT_TYPE_LABELS: Record<SeatType, string> = { CLASSIC: 'Classic', PREMIUM: 'Premium', RECLINER: 'Recliner' };
const MAX_SEATS = 6;

type LocalSeat = { row: string; number: number; type: SeatType };

function SeatGrid({ rows, selected, onToggle, maxNote }: {
  rows: SeatRow[];
  selected: LocalSeat[];
  onToggle: (row: string, num: number, type: SeatType) => void;
  maxNote: string;
}) {
  const selSet = new Set(selected.map(s => `${s.row}-${s.number}`));
  const grouped: Record<SeatType, SeatRow[]> = { CLASSIC: [], PREMIUM: [], RECLINER: [] };
  rows.forEach(r => { if (r.seat_type in grouped) grouped[r.seat_type].push(r); });

  const COLOR = {
    available: '#E8E9F0',
    occupied: '#374151',
    selected: THEME.primary,
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

      {/* Max-seat inline notice */}
      {maxNote ? (
        <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginTop: 4, marginBottom: 8 }}>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#92400E', textAlign: 'center' }}>
            {maxNote}
          </Text>
        </View>
      ) : null}

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

function BookingPass({ result, movieEmoji, movieTitle, theater, date, time, format, seats, total, upiPending, onDone }: {
  result: BookingResult;
  movieEmoji: string;
  movieTitle: string;
  theater: string;
  date: string;
  time: string;
  format: string;
  seats: LocalSeat[];
  total: number;
  upiPending: boolean;
  onDone: () => void;
}) {
  const [shared, setShared] = useState(false);
  const totalWithFee = Math.round(total + total * 0.0175);
  const seatList = seats.map(s => `${s.row}${s.number}`).join(', ');

  const fmtDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' }); }
    catch { return d; }
  };

  async function shareBookingId() {
    await Share.share({ message: `Booking ID: ${result.booking_id}` }).catch(() => {});
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  async function openUpi() {
    const apps = [
      result.phone_pe_url,
      result.upi_intent_url,
      `tez://upi/pay?pa=movies@setu&pn=Mana+Movies&am=${totalWithFee}&cu=INR&tr=${result.transaction_ref}`,
      `paytmmp://pay?pa=movies@setu&pn=Mana+Movies&am=${totalWithFee}&cu=INR`,
    ];
    for (const url of apps) {
      const can = await Linking.canOpenURL(url).catch(() => false);
      if (can) { await Linking.openURL(url); return; }
    }
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      {/* Success badge */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 30 }}>🎬</Text>
        </View>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 22, color: THEME.text }}>Booking Confirmed!</Text>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: '#10B981', marginTop: 3 }}>Enjoy the movie</Text>
      </View>

      {/* Ticket card */}
      <View style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', ...SHADOWS.card, marginBottom: 16 }}>
        {/* Movie strip */}
        <View style={{ backgroundColor: THEME.primary, padding: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 20, color: '#fff' }}>{movieEmoji} {movieTitle}</Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
            {format} · {theater}
          </Text>
        </View>

        {/* Dashed separator */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 0 }}>
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: THEME.background, marginLeft: -9 }} />
          <View style={{ flex: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#E5E7EB', marginHorizontal: 4 }} />
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: THEME.background, marginRight: -9 }} />
        </View>

        {/* Details */}
        <View style={{ padding: 16, gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginBottom: 3 }}>DATE</Text>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>{fmtDate(date)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginBottom: 3 }}>TIME</Text>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>{time}</Text>
            </View>
          </View>

          <View>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginBottom: 3 }}>SEATS</Text>
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>{seatList}</Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginTop: 2 }}>
              {seats.filter(s => s.type === 'CLASSIC').length > 0 && `${seats.filter(s => s.type === 'CLASSIC').length} Classic  `}
              {seats.filter(s => s.type === 'PREMIUM').length > 0 && `${seats.filter(s => s.type === 'PREMIUM').length} Premium`}
            </Text>
          </View>

          <View>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginBottom: 3 }}>BOOKING ID</Text>
            <TouchableOpacity onPress={shareBookingId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: THEME.primary, letterSpacing: 0.5 }}>
                {result.booking_id}
              </Text>
              <View style={{ backgroundColor: shared ? '#D1FAE5' : '#EEF2FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: shared ? '#065F46' : THEME.primary }}>
                  {shared ? 'Shared!' : 'Share'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dashed separator */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: THEME.background, marginLeft: -9 }} />
          <View style={{ flex: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#E5E7EB', marginHorizontal: 4 }} />
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: THEME.background, marginRight: -9 }} />
        </View>

        {/* Amount row */}
        <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted }}>Total (incl. booking fee)</Text>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 20, color: THEME.text, marginTop: 2 }}>
              ₹{totalWithFee.toLocaleString()}
            </Text>
          </View>
          {/* QR placeholder */}
          <View style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Text style={{ fontSize: 28 }}>⬛</Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 8, color: THEME.muted, marginTop: 2 }}>QR</Text>
          </View>
        </View>
      </View>

      {/* UPI payment section */}
      {upiPending ? (
        <View style={{ backgroundColor: '#FFF7ED', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FED7AA' }}>
          <Text style={{ fontFamily: FONTS.semiBold, fontSize: 14, color: '#92400E', marginBottom: 6 }}>
            Complete Payment via UPI
          </Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: '#78350F', marginBottom: 12 }}>
            Open any UPI app and pay ₹{totalWithFee.toLocaleString()} to complete your booking.
          </Text>
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FED7AA' }}>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginBottom: 2 }}>UPI ID</Text>
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 14, color: THEME.text }}>movies@setu</Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginTop: 6, marginBottom: 2 }}>Reference</Text>
            <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: THEME.text }}>{result.transaction_ref}</Text>
          </View>
          <TouchableOpacity
            onPress={openUpi}
            style={{ backgroundColor: '#F97316', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#fff' }}>Open UPI App</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ backgroundColor: '#ECFDF5', borderRadius: 14, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 20 }}>✅</Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: '#065F46', flex: 1 }}>
            Payment initiated. Complete the payment in your UPI app.
          </Text>
        </View>
      )}

      {/* Done button */}
      <TouchableOpacity
        onPress={onDone}
        style={{ backgroundColor: THEME.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4 }}
      >
        <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#fff' }}>Back to Movies</Text>
      </TouchableOpacity>
    </ScrollView>
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
  const [maxSeatNote, setMaxSeatNote] = useState('');
  const [bookErr, setBookErr] = useState('');
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [upiPending, setUpiPending] = useState(false);

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
        setMaxSeatNote(`You can select up to ${MAX_SEATS} seats at once.`);
        setTimeout(() => setMaxSeatNote(''), 2500);
        return prev;
      }
      return [...prev, { row, number, type }];
    });
  }

  async function handleBook() {
    if (selected.length === 0) {
      setBookErr('Please select at least one seat to continue.');
      return;
    }
    setBookErr('');
    setBooking(true);
    try {
      const totalWithFee = total + total * 0.0175;
      const result = await movieService.bookTickets({
        showtime_id: params.showtimeId,
        movie_id: params.movieId,
        seats: selected.map(s => `${s.row}${s.number}`),
        seat_type: selected.some(s => s.type === 'PREMIUM') ? 'PREMIUM' : 'CLASSIC',
        amount: totalWithFee,
      });

      const totalRounded = Math.round(totalWithFee);
      const upiApps = [
        result.phone_pe_url,
        result.upi_intent_url,
        `tez://upi/pay?pa=movies@setu&pn=Mana+Movies&am=${totalRounded}&cu=INR&tr=${result.transaction_ref}`,
        `paytmmp://pay?pa=movies@setu&pn=Mana+Movies&am=${totalRounded}&cu=INR`,
      ];
      let opened = false;
      for (const url of upiApps) {
        const can = await Linking.canOpenURL(url).catch(() => false);
        if (can) { await Linking.openURL(url); opened = true; break; }
      }

      setUpiPending(!opened);
      setBookingResult(result);
    } catch {
      setBookErr('Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  }

  const fmtDate = (d: string) => {
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
    } catch { return d; }
  };

  // Booking confirmed — show the pass
  if (bookingResult) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.background }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ backgroundColor: THEME.background, paddingTop: Platform.OS === 'ios' ? 52 : 24, paddingBottom: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: THEME.text }}>Your Ticket</Text>
        </View>
        <BookingPass
          result={bookingResult}
          movieEmoji={params.movieEmoji ?? '🎬'}
          movieTitle={params.movieTitle ?? ''}
          theater={params.theater ?? ''}
          date={params.date ?? ''}
          time={params.time ?? ''}
          format={params.format ?? '2D'}
          seats={selected}
          total={total}
          upiPending={upiPending}
          onDone={() => router.replace('/movies')}
        />
      </View>
    );
  }

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
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
          <SeatGrid rows={rows} selected={selected} onToggle={toggleSeat} maxNote={maxSeatNote} />
        </ScrollView>
      )}

      {/* Bottom checkout bar */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8E9F0',
        padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        ...SHADOWS.card,
      }}>
        {bookErr ? (
          <View style={{ backgroundColor: '#FEE2E2', borderRadius: 10, padding: 10, marginBottom: 10 }}>
            <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#991B1B' }}>{bookErr}</Text>
          </View>
        ) : null}

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
