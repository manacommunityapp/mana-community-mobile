import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { AttendanceCalendar } from '@/components/hrm/AttendanceCalendar';
import { hrmService } from '@/services/hrmService';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import type { AttendanceRecord } from '@/types/hrm';

function formatTime(iso?: string): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AttendanceScreen() {
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data: records, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hrm-attendance', from, to],
    queryFn: () => hrmService.getMyAttendance(from, to),
  });

  const attendance = records ?? [];
  const presentCount = attendance.filter(a => a.attendanceStatus === 'PRESENT').length;
  const absentCount = attendance.filter(a => a.attendanceStatus === 'ABSENT').length;
  const halfDayCount = attendance.filter(a => a.attendanceStatus === 'HALF_DAY').length;
  const leaveCount = attendance.filter(a => a.attendanceStatus === 'ON_LEAVE').length;

  const handleMonthChange = useCallback((m: number, y: number) => {
    setMonth(m);
    setYear(y);
  }, []);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header title="My Attendance" leftIcon="arrow-back" onLeftPress={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={COLORS.primary} />}
        contentContainerStyle={s.content}
      >
        {isLoading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        ) : (
          <>
            {/* Summary Cards */}
            <View style={s.summaryRow}>
              {[
                { label: 'Present', value: presentCount, color: COLORS.success },
                { label: 'Absent', value: absentCount, color: COLORS.error },
                { label: 'Half Day', value: halfDayCount, color: COLORS.warning },
                { label: 'Leave', value: leaveCount, color: '#3B82F6' },
              ].map(item => (
                <View key={item.label} style={s.summaryCard}>
                  <View style={[s.summaryDot, { backgroundColor: item.color }]} />
                  <Text style={s.summaryValue}>{item.value}</Text>
                  <Text style={s.summaryLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Calendar */}
            <View style={s.calendarWrap}>
              <AttendanceCalendar
                records={attendance}
                month={month}
                year={year}
                onMonthChange={handleMonthChange}
                onDayPress={setSelectedRecord}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal visible={!!selectedRecord} transparent animationType="fade" onRequestClose={() => setSelectedRecord(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSelectedRecord(null)}>
          <View style={s.modal}>
            {selectedRecord && (
              <>
                <Text style={s.modalTitle}>{selectedRecord.attendanceDate}</Text>
                <View style={s.modalRow}>
                  <Text style={s.modalLabel}>Status</Text>
                  <Text style={s.modalValue}>{selectedRecord.attendanceStatus.replace('_', ' ')}</Text>
                </View>
                <View style={s.modalRow}>
                  <Text style={s.modalLabel}>Check In</Text>
                  <Text style={s.modalValue}>{formatTime(selectedRecord.firstCheckIn)}</Text>
                </View>
                <View style={s.modalRow}>
                  <Text style={s.modalLabel}>Check Out</Text>
                  <Text style={s.modalValue}>{formatTime(selectedRecord.lastCheckOut)}</Text>
                </View>
                <View style={s.modalRow}>
                  <Text style={s.modalLabel}>Work Hours</Text>
                  <Text style={s.modalValue}>
                    {selectedRecord.totalWorkMinutes > 0
                      ? `${Math.floor(selectedRecord.totalWorkMinutes / 60)}h ${selectedRecord.totalWorkMinutes % 60}m`
                      : '--'}
                  </Text>
                </View>
                {selectedRecord.remarks && (
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>Remarks</Text>
                    <Text style={s.modalValue}>{selectedRecord.remarks}</Text>
                  </View>
                )}
                <TouchableOpacity style={s.closeBtn} onPress={() => setSelectedRecord(null)}>
                  <Text style={s.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingBottom: 40 },
  loadingBox: { marginTop: 80, alignItems: 'center' },

  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sm,
    padding: 10,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  summaryDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontFamily: FONTS.displayBold, color: COLORS.text, fontWeight: '700' },
  summaryLabel: { fontSize: 10, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },

  calendarWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    ...SHADOWS.card,
    borderRadius: RADIUS.md,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: 14,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalLabel: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textMuted },
  modalValue: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.text, fontWeight: '600' },
  closeBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
  },
  closeBtnText: { color: '#FFFFFF', fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700' },
});
