import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Linking } from 'react-native';
import type { KittyPartyEvent, KittyPartyRsvpResponse } from '@/types/kittyPartyTypes';

interface Props {
  event: KittyPartyEvent;
  onRsvp: (response: KittyPartyRsvpResponse) => void;
  onPress?: () => void;
}

export const KittyPartyEventCard: React.FC<Props> = ({ event, onRsvp, onPress }) => {
  const isGoing = event.currentUserRsvp === 'GOING';
  const isMaybe = event.currentUserRsvp === 'MAYBE';
  const isNotGoing = event.currentUserRsvp === 'NOT_GOING';
  const isWaitlisted = event.currentUserRsvp === 'WAITLISTED';

  const handleShareWhatsApp = () => {
    const text = `🎉 Join "${event.eventName}" on ${formatEventDate(event.startTime)} at ${event.venueAddress || event.venueType}! RSVP on Mana Community App.`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`).catch(() => {
      Share.share({ message: text });
    });
  };

  const formatEventDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const formatEventTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{event.eventType.replace(/_/g, ' ')}</Text>
          </View>
          {event.recurrenceRule && event.recurrenceRule !== 'NONE' && (
            <View style={styles.recurrenceBadge}>
              <Text style={styles.recurrenceText}>🔁 {event.recurrenceRule}</Text>
            </View>
          )}
        </View>
        {event.maxAttendees && (
          <Text style={styles.capText}>
            Cap: {event.goingCount}/{event.maxAttendees}
          </Text>
        )}
      </View>

      {/* Title & Description */}
      <Text style={styles.title} numberOfLines={1}>
        {event.eventName}
      </Text>
      {event.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {event.description}
        </Text>
      ) : null}

      {/* Timing and Venue Box */}
      <View style={styles.metaContainer}>
        <Text style={styles.metaLine}>
          📅 <Text style={styles.metaHighlight}>{formatEventDate(event.startTime)}</Text> • {formatEventTime(event.startTime)} - {formatEventTime(event.endTime)}
        </Text>
        <Text style={styles.metaLine} numberOfLines={1}>
          📍 {event.venueType.replace(/_/g, ' ')}{event.venueAddress ? ` • ${event.venueAddress}` : ''}
        </Text>
        {event.hostName ? (
          <Text style={styles.metaLine}>
            👑 Host: <Text style={styles.metaHighlight}>{event.hostName}</Text>
          </Text>
        ) : null}
      </View>

      {/* RSVP Stats Bar */}
      <View style={styles.statsRow}>
        <Text style={styles.goingStat}>✓ {event.goingCount} Going</Text>
        <Text style={styles.maybeStat}>? {event.maybeCount} Maybe</Text>
        <Text style={styles.notGoingStat}>✕ {event.notGoingCount} Can't</Text>
        {event.currentUserRsvp && (
          <View style={[styles.userStatusPill, isGoing ? styles.userStatusGoing : styles.userStatusOther]}>
            <Text style={styles.userStatusText}>{isWaitlisted ? 'WAITLIST' : event.currentUserRsvp}</Text>
          </View>
        )}
      </View>

      {/* Gate Pass Badge */}
      {isGoing && event.gatePassCode && (
        <View style={styles.gatePassContainer}>
          <View style={styles.gatePassHeader}>
            <Text style={styles.gatePassTitle}>🎟️ VISITOR GATE PASS</Text>
            <View style={styles.gatePassCodeBadge}>
              <Text style={styles.gatePassCodeText}>{event.gatePassCode}</Text>
            </View>
          </View>
          <Text style={styles.gatePassHint}>
            Show this code at the security gate for quick society entry.
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.rsvpBtn, isGoing ? styles.rsvpBtnActiveGoing : styles.rsvpBtnOutline]}
          onPress={() => onRsvp('GOING')}
        >
          <Text style={[styles.rsvpBtnText, isGoing ? styles.rsvpBtnTextActive : styles.rsvpBtnTextGoing]}>
            ✓ Going
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rsvpBtn, isMaybe ? styles.rsvpBtnActiveMaybe : styles.rsvpBtnOutline]}
          onPress={() => onRsvp('MAYBE')}
        >
          <Text style={[styles.rsvpBtnText, isMaybe ? styles.rsvpBtnTextActive : styles.rsvpBtnTextMaybe]}>
            Maybe
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rsvpBtn, isNotGoing ? styles.rsvpBtnActiveCant : styles.rsvpBtnOutline]}
          onPress={() => onRsvp('NOT_GOING')}
        >
          <Text style={[styles.rsvpBtnText, isNotGoing ? styles.rsvpBtnTextActive : styles.rsvpBtnTextCant]}>
            Can't Go
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShareWhatsApp}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.shareBtnText}>💬</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  typeBadgeText: {
    color: '#065F46',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  recurrenceBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  recurrenceText: {
    color: '#4338CA',
    fontSize: 10,
    fontWeight: '700',
  },
  capText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 8,
  },
  metaContainer: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 10,
    gap: 4,
  },
  metaLine: {
    fontSize: 11,
    color: '#4B5563',
  },
  metaHighlight: {
    fontWeight: '700',
    color: '#1F2937',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 10,
    gap: 12,
  },
  goingStat: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  maybeStat: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  notGoingStat: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  userStatusPill: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  userStatusGoing: {
    backgroundColor: '#D1FAE5',
  },
  userStatusOther: {
    backgroundColor: '#FEF3C7',
  },
  userStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rsvpBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rsvpBtnOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rsvpBtnActiveGoing: {
    backgroundColor: '#059669',
  },
  rsvpBtnActiveMaybe: {
    backgroundColor: '#D97706',
  },
  rsvpBtnActiveCant: {
    backgroundColor: '#4B5563',
  },
  rsvpBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rsvpBtnTextActive: {
    color: '#FFFFFF',
  },
  rsvpBtnTextGoing: {
    color: '#059669',
  },
  rsvpBtnTextMaybe: {
    color: '#D97706',
  },
  rsvpBtnTextCant: {
    color: '#6B7280',
  },
  shareBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: {
    fontSize: 12,
  },
  gatePassContainer: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  gatePassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gatePassTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  gatePassCodeBadge: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gatePassCodeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '900',
    color: '#78350F',
    letterSpacing: 1,
  },
  gatePassHint: {
    fontSize: 10,
    color: '#B45309',
  },
});
