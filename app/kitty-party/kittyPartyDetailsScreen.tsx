import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { kittyPartyService } from '@/services/kittyPartyService';
import type { KittyPartyCircleSummary, KittyPartyMember } from '@/types/kittyPartyTypes';

export default function KittyPartyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const circleId = Number(id);

  const [circle, setCircle] = useState<KittyPartyCircleSummary | null>(null);
  const [members, setMembers] = useState<KittyPartyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (circleId) {
      loadDetails();
    }
  }, [circleId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const [circleData, membersData] = await Promise.all([
        kittyPartyService.getCircleDetails(circleId),
        kittyPartyService.getCircleMembers(circleId),
      ]);
      setCircle(circleData);
      setMembers(membersData || []);
    } catch (e) {
      console.error('Failed to load mobile circle details', e);
    } finally {
      setLoading(false);
    }
  };

  const handleShareCircle = async () => {
    if (!circle) return;
    const message = `Hey neighbor! Join our "${circle.circleName}" kitty circle on Mana Community App!`;
    try {
      await Share.share({ message });
    } catch {
      Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`).catch(() => {
        Alert.alert('Invite Link', message);
      });
    }
  };

  const handleJoinRequest = async () => {
    try {
      await kittyPartyService.requestToJoin(circleId, 'I would like to join this circle.');
      Alert.alert('Request Sent', 'Your join request was submitted to the circle admin.');
      loadDetails();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit join request');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#BE185D" />
      </View>
    );
  }

  if (!circle) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Circle not found</Text>
      </View>
    );
  }

  const isMember = !!circle.currentUserRole;
  const isAdmin = circle.currentUserRole === 'OWNER' || circle.currentUserRole === 'ADMIN';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Circle Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.badgeRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{circle.categoryCode}</Text>
          </View>
          <Text style={styles.privacyTag}>{circle.privacyType.replace('_', ' ')}</Text>
        </View>

        <Text style={styles.circleTitle}>{circle.circleName}</Text>
        <Text style={styles.circleDesc}>
          {circle.description || 'Active community social and kitty circle.'}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            👥 {members.length} / {circle.maxMembers || '∞'} members
          </Text>
          {circle.allowExternalMembers && (
            <Text style={styles.guestAllowedBadge}>
              🌍 Guests Allowed ({circle.externalMembersCount || 0}/{circle.maxExternalMembers || 0})
            </Text>
          )}
          {circle.currentUserRole && (
            <Text style={styles.roleTag}>Role: {circle.currentUserRole}</Text>
          )}
        </View>

        {isMember && (
          <TouchableOpacity
            style={styles.shareCircleBtn}
            onPress={handleShareCircle}
            activeOpacity={0.8}
          >
            <Text style={styles.shareCircleBtnText}>💬 Invite via WhatsApp / Share</Text>
          </TouchableOpacity>
        )}

        {!isMember && (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={handleJoinRequest}
            activeOpacity={0.8}
          >
            <Text style={styles.joinButtonText}>Request to Join Circle</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Circle Hub Features */}
      {isMember && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CIRCLE MODULES</Text>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() =>
              router.push({
                pathname: '/kitty-party/kittyPartyLedgerScreen',
                params: { id: circleId },
              })
            }
          >
            <Text style={styles.moduleIcon}>👛</Text>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleName}>Kitty Savings & Rotation</Text>
              <Text style={styles.moduleSub}>Record-only monthly pool and rotation tracker</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() =>
              router.push({
                pathname: '/kitty-party/kittyPartyHousieScreen',
                params: { id: circleId },
              })
            }
          >
            <Text style={styles.moduleIcon}>🎲</Text>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleName}>Mana Play (Tambola / Housie)</Text>
              <Text style={styles.moduleSub}>Live 90-ball multiplayer game with ticket dabbing</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() =>
              router.push({
                pathname: '/kitty-party/kittyPartyEventScreen',
                params: { circleId, id: circleId },
              })
            }
          >
            <Text style={styles.moduleIcon}>🎉</Text>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleName}>Party Gatherings & RSVP</Text>
              <Text style={styles.moduleSub}>Monthly meetups, calendar RSVPs & guest tracking</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() =>
              router.push({
                pathname: '/kitty-party/kittyPartyExpenseScreen',
                params: { id: circleId },
              })
            }
          >
            <Text style={styles.moduleIcon}>🧾</Text>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleName}>Party Bill Splitting</Text>
              <Text style={styles.moduleSub}>Track food, venue, and cake expenditures</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() =>
              router.push({
                pathname: '/kitty-party/kittyPartyFeedScreen',
                params: { circleId, id: circleId, isAdmin: String(isAdmin) },
              })
            }
          >
            <Text style={styles.moduleIcon}>💬</Text>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleName}>Discussion Feed & Polls</Text>
              <Text style={styles.moduleSub}>Circle announcements, voting polls & comments</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() =>
              router.push({
                pathname: '/kitty-party/kittyPartyLeaderboardScreen',
                params: { circleId, id: circleId },
              })
            }
          >
            <Text style={styles.moduleIcon}>🏆</Text>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleName}>Housie Leaderboard & Trophies</Text>
              <Text style={styles.moduleSub}>Circle rankings, win counts & player badges</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() =>
              router.push({
                pathname: '/kitty-party/kittyPartyVendorPackagesScreen',
                params: { circleId, id: circleId },
              })
            }
          >
            <Text style={styles.moduleIcon}>🛍️</Text>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleName}>Curated Party Vendors</Text>
              <Text style={styles.moduleSub}>Catering, themes, balloon decor & emcees</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Members List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MEMBERS ({members.length})</Text>
        <View style={styles.membersContainer}>
          {members.map((m) => (
            <View key={m.memberId} style={styles.memberRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{m.fullName.charAt(0)}</Text>
              </View>
              <View style={styles.memberMeta}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.memberName}>{m.fullName}</Text>
                    {m.isExternal && (
                      <View style={styles.guestBadge}>
                        <Text style={styles.guestBadgeText}>Guest</Text>
                      </View>
                    )}
                  </View>
                  {m.isExternal && (
                    <Text style={styles.guestSponsorText} numberOfLines={1}>
                      🌍 {m.externalSocietyName || 'Guest'}{m.sponsorName ? ` • via ${m.sponsorName}` : ''}
                    </Text>
                  )}
                </View>
                <Text style={styles.memberRole}>
                  {m.flatUnit ? `🏢 ${m.flatUnit} • ${m.roleCode}` : m.roleCode}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#BE185D',
  },
  privacyTag: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  circleTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },
  circleDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metaText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  roleTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BE185D',
  },
  joinButton: {
    backgroundColor: '#BE185D',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 10,
  },
  moduleIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  moduleSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  chevron: {
    fontSize: 16,
    fontWeight: '800',
    color: '#BE185D',
  },
  membersContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FCE7F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#BE185D',
  },
  memberMeta: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  memberRole: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  shareCircleBtn: {
    marginTop: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareCircleBtnText: {
    color: '#065F46',
    fontWeight: '700',
    fontSize: 13,
  },
  guestAllowedBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  guestBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  guestBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
  },
  guestSponsorText: {
    fontSize: 10,
    color: '#059669',
    marginTop: 2,
  },
});
