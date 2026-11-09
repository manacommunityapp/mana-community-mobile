import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { kittyPartyService } from '@/services/kittyPartyService';
import type {
  KittyPartyEvent,
  KittyPartyRsvpResponse,
  CreateKittyPartyEventRequest,
  KittyPartyEventType,
  KittyPartyVenueType,
} from '@/types/kittyPartyTypes';
import { KittyPartyEventCard } from '@/components/kittyPartyEventCard';

export default function KittyPartyEventScreen() {
  const { circleId: paramCircleId, id: paramId } = useLocalSearchParams<{ circleId?: string; id?: string }>();
  const router = useRouter();
  const circleId = Number(paramCircleId || paramId || 0);

  const [events, setEvents] = useState<KittyPartyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<KittyPartyEventType>('KITTY_MONTHLY');
  const [venueType, setVenueType] = useState<KittyPartyVenueType>('HOST_HOME');
  const [venueAddress, setVenueAddress] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Guest RSVP Modal State
  const [selectedEventForGuest, setSelectedEventForGuest] = useState<KittyPartyEvent | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [rsvpNotes, setRsvpNotes] = useState('');
  const [submittingRsvp, setSubmittingRsvp] = useState(false);

  useEffect(() => {
    if (circleId) {
      loadEvents();
    }
  }, [circleId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await kittyPartyService.getEvents(circleId);
      setEvents(res || []);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleQuickRsvp = async (event: KittyPartyEvent, response: KittyPartyRsvpResponse) => {
    try {
      await kittyPartyService.submitRsvp(event.id, { response, guestCount: 0 });
      Alert.alert('RSVP Updated', `You are marked as ${response}`);
      loadEvents();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update RSVP');
    }
  };

  const handleDetailedRsvpSubmit = async () => {
    if (!selectedEventForGuest) return;
    try {
      setSubmittingRsvp(true);
      await kittyPartyService.submitRsvp(selectedEventForGuest.id, {
        response: 'GOING',
        guestCount,
        notes: rsvpNotes.trim() || undefined,
      });
      setSelectedEventForGuest(null);
      Alert.alert('RSVP Confirmed', `Going with ${guestCount} extra guest(s)!`);
      loadEvents();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit RSVP');
    } finally {
      setSubmittingRsvp(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!eventName.trim()) {
      Alert.alert('Required', 'Please enter a gathering title');
      return;
    }

    // Default dates if blank (next Saturday evening)
    const now = new Date();
    const defaultStart = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    defaultStart.setHours(18, 0, 0, 0);
    const defaultEnd = new Date(defaultStart.getTime() + 3 * 60 * 60 * 1000);

    const startIso = startTime.trim() || defaultStart.toISOString().slice(0, 19);
    const endIso = endTime.trim() || defaultEnd.toISOString().slice(0, 19);

    try {
      setSubmittingCreate(true);
      const payload: CreateKittyPartyEventRequest = {
        eventName: eventName.trim(),
        description: description.trim() || undefined,
        eventType,
        venueType,
        venueAddress: venueAddress.trim() || undefined,
        startTime: startIso,
        endTime: endIso,
        maxAttendees: maxAttendees.trim() ? Number(maxAttendees) : undefined,
        recurrenceRule: 'MONTHLY',
      };

      await kittyPartyService.createEvent(circleId, payload);
      setShowCreateModal(false);
      resetCreateForm();
      Alert.alert('Success', 'Gathering scheduled successfully!');
      loadEvents();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create gathering');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const resetCreateForm = () => {
    setEventName('');
    setDescription('');
    setVenueAddress('');
    setStartTime('');
    setEndTime('');
    setMaxAttendees('');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading gatherings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Party Gatherings</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Plan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents(); }} />}
      >
        {/* Intro Banner */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>🎉 Gatherings & RSVP Calendar</Text>
          <Text style={styles.bannerSubtitle}>
            Schedule your monthly meetups, track guest headcounts, manage potlucks, and check in attendees.
          </Text>
        </View>

        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🗓️</Text>
            <Text style={styles.emptyTitle}>No Gatherings Scheduled</Text>
            <Text style={styles.emptySubtitle}>
              Tap the "+ Plan" button above to schedule your circle's next monthly meetup.
            </Text>
          </View>
        ) : (
          events.map((event) => (
            <KittyPartyEventCard
              key={event.id}
              event={event}
              onRsvp={(resp) => handleQuickRsvp(event, resp)}
              onPress={() => setSelectedEventForGuest(event)}
            />
          ))
        )}
      </ScrollView>

      {/* RSVP with Guests Modal */}
      <Modal
        visible={!!selectedEventForGuest}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEventForGuest(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>RSVP with Extra Guests</Text>
            <Text style={styles.modalSubtitle} numberOfLines={1}>
              {selectedEventForGuest?.eventName}
            </Text>

            <View style={styles.counterRow}>
              <Text style={styles.counterLabel}>Bringing extra guests?</Text>
              <View style={styles.counterControls}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setGuestCount(Math.max(0, guestCount - 1))}
                >
                  <Text style={styles.counterBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{guestCount}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setGuestCount(guestCount + 1)}
                >
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.inputLabel}>Potluck / Dishes (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Bringing samosas & sweets"
              value={rsvpNotes}
              onChangeText={setRsvpNotes}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSelectedEventForGuest(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleDetailedRsvpSubmit}
                disabled={submittingRsvp}
              >
                <Text style={styles.submitBtnText}>
                  {submittingRsvp ? 'Saving...' : 'Confirm Going'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Schedule Gathering Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.createModalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Schedule Gathering</Text>
              <Text style={styles.modalSubtitle}>Plan your circle meetup or party celebration</Text>

              <Text style={styles.inputLabel}>Gathering Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. November Gold Kitty & High Tea"
                value={eventName}
                onChangeText={setEventName}
              />

              <Text style={styles.inputLabel}>Venue Address / Residence</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Villa #42 or Clubhouse Hall A"
                value={venueAddress}
                onChangeText={setVenueAddress}
              />

              <Text style={styles.inputLabel}>Max Attendee Limit (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 20 (leave blank for unlimited)"
                keyboardType="numeric"
                value={maxAttendees}
                onChangeText={setMaxAttendees}
              />

              <Text style={styles.inputLabel}>Theme & Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Dress code, games, potluck items..."
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleCreateEvent}
                  disabled={submittingCreate}
                >
                  <Text style={styles.submitBtnText}>
                    {submittingCreate ? 'Saving...' : 'Schedule'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  backBtn: {
    padding: 6,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  addBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  bannerCard: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 17,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  createModalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 16,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  counterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  counterValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
    marginBottom: 12,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
