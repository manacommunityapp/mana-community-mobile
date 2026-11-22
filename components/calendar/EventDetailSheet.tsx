import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Platform, ActionSheetIOS,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarEventDto } from '@/services/calendarService';
import { CALENDAR_CONFIG } from '@/constants/calendarConfig';

const REMINDER_OPTIONS = [
  { label: '15 minutes before', minutes: 15 },
  { label: '30 minutes before', minutes: 30 },
  { label: '1 hour before',     minutes: 60 },
  { label: '1 day before',      minutes: 1440 },
  { label: 'Remove reminder',   minutes: -1 },
];

interface Props {
  event: CalendarEventDto;
  onClose: () => void;
  onReminderChange: (eventSource: string, sourceId: string, minutesBefore: number, eventStartTime: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (event: CalendarEventDto) => void;
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch { return iso; }
}

export function EventDetailSheet({ event, onClose, onReminderChange, onDelete, onEdit }: Props) {
  const [working, setWorking] = useState(false);
  const cfg = CALENDAR_CONFIG[event.calendarType];
  const isPersonal = event.eventSource === 'PERSONAL';

  const handleReminderPress = () => {
    const labels = REMINDER_OPTIONS.map(o => o.label);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...labels, 'Cancel'], cancelButtonIndex: labels.length },
        async (idx) => {
          if (idx < REMINDER_OPTIONS.length) {
            const opt = REMINDER_OPTIONS[idx];
            setWorking(true);
            try {
              await onReminderChange(event.eventSource, event.sourceId, opt.minutes, event.startTime);
            } finally { setWorking(false); }
          }
        }
      );
    } else {
      Alert.alert(
        'Set Reminder',
        undefined,
        [
          ...REMINDER_OPTIONS.map(opt => ({
            text: opt.label,
            onPress: async () => {
              setWorking(true);
              try {
                await onReminderChange(event.eventSource, event.sourceId, opt.minutes, event.startTime);
              } finally { setWorking(false); }
            },
          })),
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setWorking(true);
          try { await onDelete(event.id); } catch { setWorking(false); }
        },
      },
    ]);
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={[styles.handle]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.typeBadge, { backgroundColor: cfg?.color ?? '#4F46E5' }]}>
              <Ionicons name={cfg?.icon as any ?? 'calendar-outline'} size={12} color="#fff" />
              <Text style={styles.typeBadgeText}>{cfg?.label ?? event.calendarType}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={[styles.title, event.isCancelled && styles.cancelled]}>{event.title}</Text>

            {event.isCancelled && (
              <View style={styles.cancelledRow}>
                <Ionicons name="close-circle" size={14} color="#DC2626" />
                <Text style={styles.cancelledText}>This event has been cancelled</Text>
              </View>
            )}

            {/* Date/time */}
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                {event.allDay ? 'All day — ' : ''}{fmtDateTime(event.startTime)}
                {!event.allDay && ` → ${fmtDateTime(event.endTime)}`}
              </Text>
            </View>

            {event.location && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color="#6B7280" />
                <Text style={styles.infoText}>{event.location}</Text>
              </View>
            )}

            {event.description && (
              <Text style={styles.description}>{event.description}</Text>
            )}

            {/* Reminder row */}
            <View style={styles.reminderRow}>
              <View style={styles.reminderLeft}>
                <Ionicons name="notifications-outline" size={16} color="#6B7280" />
                <Text style={styles.reminderText}>
                  {event.hasReminder ? 'Reminder set' : 'No reminder'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeBtn}
                onPress={handleReminderPress}
                disabled={working}
              >
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* Personal event actions */}
            {isPersonal && (
              <View style={styles.actions}>
                {onEdit && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => { onClose(); onEdit(event); }}
                  >
                    <Ionicons name="create-outline" size={15} color="#4F46E5" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={handleDelete}
                  disabled={working}
                >
                  <Ionicons name="trash-outline" size={15} color="#fff" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  cancelled: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  cancelledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  cancelledText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reminderText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  editBtn: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
