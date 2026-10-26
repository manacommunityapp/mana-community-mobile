import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Platform, StatusBar, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import {
  experiencesService, Experience, OrganizerReport, OrganizerAttendee, CATEGORY_META,
} from '@/services/experiencesService';
import { THEME, FONTS, SHADOWS, COLORS } from '@/constants/config';

// ── Stat Tile ─────────────────────────────────────────────────────────────────

function StatTile({ label, value, sub, color, emoji }: {
  label: string; value: string; sub?: string; color: string; emoji: string;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, ...SHADOWS.sm }}>
      <Text style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</Text>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 20, color }}>{value}</Text>
      <Text style={{ fontFamily: FONTS.semiBold, fontSize: 11, color: THEME.text, marginTop: 2 }}>{label}</Text>
      {sub && <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted, marginTop: 1 }}>{sub}</Text>}
    </View>
  );
}

// ── Attendee Row ──────────────────────────────────────────────────────────────

function AttendeeRow({ attendee }: { attendee: OrganizerAttendee }) {
  const initials = attendee.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const refundColors: Record<string, string> = { REQUESTED: '#D97706', APPROVED: '#2563EB', PROCESSED: '#059669' };
  const statusColors: Record<string, string> = { CONFIRMED: '#059669', CANCELLED: '#DC2626', ATTENDED: '#2563EB', WAITLISTED: '#D97706' };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F4F7' }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primary }}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>{attendee.name}</Text>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginTop: 1 }}>
          {attendee.ticket_type} · {attendee.attendee_count}x
          {attendee.coupon_used ? ` · 🏷️ ${attendee.coupon_used}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primary }}>
          {attendee.amount_paid === 0 ? 'Free' : `₹${attendee.amount_paid.toLocaleString('en-IN')}`}
        </Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {attendee.checked_in && (
            <View style={{ backgroundColor: '#D1FAE5', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 9, color: '#065F46' }}>✓ IN</Text>
            </View>
          )}
          {attendee.refund_status && attendee.refund_status !== 'NONE' && (
            <View style={{ backgroundColor: '#FEF3C7', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 9, color: refundColors[attendee.refund_status] ?? '#D97706' }}>
                REFUND
              </Text>
            </View>
          )}
          <View style={{ backgroundColor: statusColors[attendee.status] + '22', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 9, color: statusColors[attendee.status] }}>
              {attendee.status}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Event Report Panel ────────────────────────────────────────────────────────

function EventReportPanel({ experience }: { experience: Experience }) {
  const { data: report, isLoading } = useQuery({
    queryKey: ['organizer-report', experience.id],
    queryFn: () => experiencesService.getOrganizerReport(experience.id),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!report) return null;

  const checkinPct = report.registered_count > 0
    ? Math.round((report.checked_in_count / report.registered_count) * 100) : 0;
  const capacityPct = Math.round((report.registered_count / report.capacity) * 100);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      {/* Revenue row */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatTile
          emoji="💰"
          label="Gross Revenue"
          value={report.gross_revenue === 0 ? 'Free' : `₹${(report.gross_revenue / 1000).toFixed(1)}k`}
          color={COLORS.primary}
        />
        <StatTile
          emoji="🏦"
          label="Net Settlement"
          value={report.gross_revenue === 0 ? '—' : `₹${(report.net_settlement / 1000).toFixed(1)}k`}
          sub={report.gross_revenue > 0 ? `after 5% fee` : undefined}
          color="#059669"
        />
      </View>

      {/* Registration row */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatTile
          emoji="🎟️"
          label="Registered"
          value={`${report.registered_count}/${report.capacity}`}
          sub={`${capacityPct}% capacity`}
          color="#7C3AED"
        />
        <StatTile
          emoji="✅"
          label="Checked In"
          value={`${report.checked_in_count}`}
          sub={`${checkinPct}% attendance`}
          color="#0891B2"
        />
      </View>

      {/* Capacity bar */}
      <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, ...SHADOWS.sm }}>
        <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text, marginBottom: 10 }}>Capacity Fill</Text>
        <View style={{ height: 10, backgroundColor: '#F1F4F7', borderRadius: 5, overflow: 'hidden', marginBottom: 6 }}>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: COLORS.primary, width: `${Math.min(capacityPct, 100)}%` }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted }}>{report.registered_count} registered</Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted }}>{report.capacity} capacity</Text>
        </View>
      </View>

      {/* Ticket breakdown */}
      {report.ticket_breakdown.length > 0 && (
        <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, ...SHADOWS.sm }}>
          <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text, marginBottom: 10 }}>Ticket Breakdown</Text>
          {report.ticket_breakdown.map(t => (
            <View key={t.type} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F1F4F7' }}>
              <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: THEME.text }}>{t.type}</Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted }}>{t.count} tickets</Text>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primary }}>
                  {t.revenue === 0 ? 'Free' : `₹${t.revenue.toLocaleString('en-IN')}`}
                </Text>
              </View>
            </View>
          ))}
          {report.coupon_usage_count > 0 && (
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: '#059669', marginTop: 8 }}>
              🏷️ {report.coupon_usage_count} booking{report.coupon_usage_count !== 1 ? 's' : ''} used a coupon
            </Text>
          )}
        </View>
      )}

      {/* Refund summary */}
      {report.refunds_total > 0 && (
        <View style={{ backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14 }}>
          <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#991B1B' }}>💸 Refunds</Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: '#B91C1C', marginTop: 4 }}>
            ₹{report.refunds_total.toLocaleString('en-IN')} pending refund requests
          </Text>
        </View>
      )}

      {/* Attendee list */}
      <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, ...SHADOWS.sm }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: THEME.text, marginBottom: 2 }}>
          Attendees ({report.attendees.length})
        </Text>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginBottom: 10 }}>
          {report.checked_in_count} checked in · {report.attendees.filter(a => a.status === 'CANCELLED').length} cancelled
        </Text>
        {report.attendees.map(a => (
          <AttendeeRow key={a.booking_id} attendee={a} />
        ))}
      </View>
    </ScrollView>
  );
}

// ── Event Row (for the list) ──────────────────────────────────────────────────

function OrganizerEventRow({ exp, onSelect, selected }: {
  exp: Experience;
  onSelect: () => void;
  selected: boolean;
}) {
  const meta = CATEGORY_META[exp.category];
  const progress = exp.registered_count / exp.capacity;

  return (
    <TouchableOpacity
      onPress={onSelect}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 8,
        backgroundColor: selected ? '#EEF2FF' : '#fff',
        borderRadius: 16, borderWidth: 2,
        borderColor: selected ? COLORS.primary : '#E8E9F0',
        ...SHADOWS.sm,
      }}
    >
      <View style={{
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: exp.backdrop_color,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 24 }}>{exp.emoji}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }} numberOfLines={1}>{exp.title}</Text>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted }}>
          {meta.emoji} {meta.label} · {format(parseISO(exp.start_date), 'd MMM yyyy')}
        </Text>
        {/* Mini progress bar */}
        <View style={{ height: 3, backgroundColor: '#F1F4F7', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
          <View style={{ height: 3, borderRadius: 2, backgroundColor: COLORS.primary, width: `${Math.min(progress * 100, 100)}%` }} />
        </View>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted }}>
          {exp.registered_count}/{exp.capacity} registered
        </Text>
      </View>
      {selected && <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />}
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function OrganizerScreen() {
  const router = useRouter();
  const [selectedExp, setSelectedExp] = useState<Experience | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['my-organized'],
    queryFn: () => experiencesService.getMyOrganizedExperiences(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <View style={{ flex: 1, backgroundColor: THEME.background }}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#064E3B', '#047857']}
        style={{ paddingTop: Platform.OS === 'ios' ? 54 : 22, paddingBottom: 18, paddingHorizontal: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.medium, fontSize: 14 }}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#fff' }}>📊 Organizer Portal</Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              Revenue, attendance & attendee management
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/experiences/create')}
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}
          >
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: '#fff' }}>+ New</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : events.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 52 }}>🎪</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 17, color: THEME.text, marginTop: 16, textAlign: 'center' }}>
            No events yet
          </Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: THEME.muted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            Create your first experience and start managing registrations and revenue.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/experiences/create')}
            style={{ marginTop: 20, backgroundColor: '#047857', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13 }}
          >
            <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#fff' }}>Create Experience</Text>
          </TouchableOpacity>
        </View>
      ) : selectedExp ? (
        // Report detail view
        <View style={{ flex: 1 }}>
          {/* Sub-header */}
          <View style={{ backgroundColor: '#fff', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#EBEFF2', ...SHADOWS.sm }}>
            <TouchableOpacity onPress={() => setSelectedExp(null)}>
              <Ionicons name="arrow-back" size={22} color={THEME.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 22 }}>{selectedExp.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: THEME.text }} numberOfLines={1}>{selectedExp.title}</Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted }}>
                {format(parseISO(selectedExp.start_date), 'EEE, d MMM yyyy')} · {selectedExp.start_time}
              </Text>
            </View>
          </View>
          <EventReportPanel experience={selectedExp} />
        </View>
      ) : (
        // Event list
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: THEME.text, marginBottom: 12 }}>
            My Events ({events.length})
          </Text>
          {events.map(exp => (
            <OrganizerEventRow
              key={exp.id}
              exp={exp}
              selected={false}
              onSelect={() => setSelectedExp(exp)}
            />
          ))}

          <View style={{ marginTop: 8, backgroundColor: '#EEF2FF', borderRadius: 16, padding: 16, gap: 6 }}>
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.primary }}>💡 Organizer Tips</Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted, lineHeight: 18 }}>
              • Share coupon codes with your community to boost registrations{'\n'}
              • Enable group pricing for bulk attendees{'\n'}
              • Settlement processed within 3–5 days after event ends
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
