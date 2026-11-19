import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calendarService, CalendarEventDto, PersonalEventRequest, CalendarType } from '@/services/calendarService';
import { CALENDAR_CONFIG, CALENDAR_TYPES, EVENT_COLORS, RECURRENCE_OPTIONS } from '@/constants/calendarConfig';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (event: CalendarEventDto) => void;
  editingEvent?: CalendarEventDto;
}

function nowPlusFmt(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hours, 0, 0, 0);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

function localToIso(local: string): string {
  try {
    const d = new Date(local.trim());
    return isNaN(d.getTime()) ? '' : d.toISOString();
  } catch { return ''; }
}

export function CreateEventSheet({ visible, onClose, onCreated, editingEvent }: Props) {
  const [title, setTitle] = useState('');
  const [calType, setCalType] = useState<CalendarType>('MY_CALENDAR');
  const [startText, setStartText] = useState('');
  const [endText, setEndText] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [rruleKey, setRruleKey] = useState(0);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editingEvent) {
        setTitle(editingEvent.title);
        setCalType(editingEvent.calendarType);
        setStartText(editingEvent.startTime.slice(0, 16).replace('T', ' '));
        setEndText(editingEvent.endTime.slice(0, 16).replace('T', ' '));
        setAllDay(editingEvent.allDay);
        setDescription(editingEvent.description ?? '');
        setLocation(editingEvent.location ?? '');
        setColor(editingEvent.color || EVENT_COLORS[0]);
        const ridx = RECURRENCE_OPTIONS.findIndex(r => r.rrule === (editingEvent.metadata?.rrule ?? ''));
        setRruleKey(ridx >= 0 ? ridx : 0);
      } else {
        setTitle('');
        setCalType('MY_CALENDAR');
        setStartText(nowPlusFmt(1));
        setEndText(nowPlusFmt(2));
        setAllDay(false);
        setRruleKey(0);
        setDescription('');
        setLocation('');
        setColor(EVENT_COLORS[0]);
      }
    }
  }, [visible, editingEvent?.id]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter an event title.');
      return;
    }
    const startIso = allDay
      ? new Date(startText.trim()).toISOString()
      : localToIso(startText);
    const endIso = allDay
      ? new Date(endText.trim()).toISOString()
      : localToIso(endText);

    if (!startIso || !endIso) {
      Alert.alert('Invalid Date', 'Please enter dates as YYYY-MM-DD HH:MM');
      return;
    }

    const req: PersonalEventRequest = {
      title: title.trim(),
      calendarType: calType,
      startTime: startIso,
      endTime: endIso,
      allDay,
      rrule: RECURRENCE_OPTIONS[rruleKey]?.rrule || undefined,
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      color,
      timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; } })(),
    };

    setSaving(true);
    try {
      let saved: CalendarEventDto;
      if (editingEvent) {
        saved = await calendarService.updatePersonal(editingEvent.id, req);
      } else {
        saved = await calendarService.createPersonal(req);
      }
      onCreated(saved);
    } catch (e: unknown) {
      Alert.alert('Error', (e as any)?.response?.data?.message ?? 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kavWrapper}
        >
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {editingEvent ? 'Edit Event' : 'New Event'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
              {/* Title */}
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Doctor appointment"
                placeholderTextColor="#9CA3AF"
              />

              {/* Calendar type */}
              <Text style={styles.label}>Calendar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {CALENDAR_TYPES.map(t => {
                  const cfg = CALENDAR_CONFIG[t];
                  const active = calType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeChip, active && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                      onPress={() => setCalType(t)}
                    >
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* All-day toggle */}
              <View style={styles.allDayRow}>
                <Text style={styles.label}>All day</Text>
                <Switch value={allDay} onValueChange={setAllDay} />
              </View>

              {/* Start */}
              <Text style={styles.label}>Start</Text>
              <TextInput
                style={styles.input}
                value={startText}
                onChangeText={setStartText}
                placeholder="YYYY-MM-DD HH:MM"
                placeholderTextColor="#9CA3AF"
                keyboardType="numbers-and-punctuation"
              />

              {/* End */}
              <Text style={styles.label}>End</Text>
              <TextInput
                style={styles.input}
                value={endText}
                onChangeText={setEndText}
                placeholder="YYYY-MM-DD HH:MM"
                placeholderTextColor="#9CA3AF"
                keyboardType="numbers-and-punctuation"
              />

              {/* Recurrence */}
              <Text style={styles.label}>Repeat</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {RECURRENCE_OPTIONS.map((opt, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.typeChip, rruleKey === i && styles.typeChipActive]}
                    onPress={() => setRruleKey(i)}
                  >
                    <Text style={[styles.typeChipText, rruleKey === i && styles.typeChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Description */}
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional notes…"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />

              {/* Location */}
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Optional location"
                placeholderTextColor="#9CA3AF"
              />

              {/* Color */}
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorRow}>
                {EVENT_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      color === c && styles.colorCircleSelected,
                    ]}
                    onPress={() => setColor(c)}
                  />
                ))}
              </View>

              {/* Save */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Event'}</Text>
              </TouchableOpacity>

              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  kavWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  body: {
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  inputMulti: {
    height: 72,
    textAlignVertical: 'top',
  },
  chipScroll: {
    flexDirection: 'row',
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    marginRight: 6,
  },
  typeChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  typeChipTextActive: {
    color: '#fff',
  },
  allDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#111827',
  },
  saveBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnDisabled: {
    backgroundColor: '#A5B4FC',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
