import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Client, type IMessage } from '@stomp/stompjs';
import { kittyPartyService } from '@/services/kittyPartyService';
import { KittyPartyHousieTicketView } from '@/components/kittyPartyHousieTicketView';
import { CONFIG } from '@/constants/config';
import { tokenStore } from '@/services/apiClient';
import type { KittyPartyGameRoom, KittyPartyTicket, MemberRole } from '@/types/kittyPartyTypes';
import { hasPermission, isGameHost } from '@/utils/kittyPartyPermissions';

export default function KittyPartyHousieScreen() {
  const { id, role: paramRole } = useLocalSearchParams<{ id: string; role?: string }>();
  const circleId = Number(id);
  const userRole = (paramRole as MemberRole) || 'MEMBER';
  const canManageGame = isGameHost(userRole);

  const [room, setRoom] = useState<KittyPartyGameRoom | null>(null);
  const [tickets, setTickets] = useState<KittyPartyTicket[]>([]);
  const [dabbedNumbers, setDabbedNumbers] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isCalling, setIsCalling] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [wsConnected, setWsConnected] = useState(false);

  const stompRef = useRef<Client | null>(null);

  // ── WebSocket ───────────────────────────────────────────────────
  const connectWebSocket = useCallback(async (roomId: number) => {
    if (stompRef.current?.connected) return;

    const token = await tokenStore.getAccess();
    const client = new Client({
      brokerURL: CONFIG.WS_URL,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      onConnect: () => {
        setWsConnected(true);
        // Subscribe to live number calls for this room
        client.subscribe(`/topic/kitty-games/${roomId}`, (msg: IMessage) => {
          try {
            const update = JSON.parse(msg.body) as Partial<KittyPartyGameRoom>;
            setRoom((prev) => prev ? { ...prev, ...update } : prev);
          } catch {
            // ignore malformed frames
          }
        });
      },
      onDisconnect: () => setWsConnected(false),
      onStompError: () => setWsConnected(false),
    });
    client.activate();
    stompRef.current = client;
  }, []);

  const disconnectWebSocket = useCallback(() => {
    stompRef.current?.deactivate();
    stompRef.current = null;
    setWsConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  // ── Load game: list rooms for circle, pick first active/waiting ──
  useEffect(() => {
    if (circleId) {
      loadGame();
    }
  }, [circleId]);

  const loadGame = async () => {
    try {
      setLoading(true);
      disconnectWebSocket();

      const rooms = await kittyPartyService.getCircleRooms(circleId).catch(() => []);
      const activeRoom = rooms.find(
        (r) => r.status === 'IN_PROGRESS' || r.status === 'WAITING'
      ) || null;

      if (activeRoom?.id) {
        const details = await kittyPartyService.getRoomDetails(activeRoom.id);
        setRoom(details);
        const myTickets = await kittyPartyService.getMyTickets(details.id);
        setTickets(myTickets || []);
        connectWebSocket(details.id);
      } else {
        setRoom(null);
        setTickets([]);
      }
    } catch (e) {
      console.error('Failed to load Housie', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    try {
      setLoading(true);
      const newRoom = await kittyPartyService.createGameRoom(circleId, {
        roomName: 'Mana Housie Room',
        maxPlayers: 50,
        allowGuestPlayers: true,
      });
      setRoom(newRoom);
      connectWebSocket(newRoom.id);
      Alert.alert('Room Created', `Room PIN: ${newRoom.roomCode || 'Ready'}. Get your ticket and invite friends!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Required', 'Please enter a 6-character room PIN');
      return;
    }
    try {
      setLoading(true);
      const joined = await kittyPartyService.joinGameRoomByCode(joinCode.trim().toUpperCase());
      setRoom(joined);
      const myTickets = await kittyPartyService.getMyTickets(joined.id);
      setTickets(myTickets || []);
      connectWebSocket(joined.id);
      Alert.alert('Joined!', `Successfully entered "${joined.roomName}"!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to join game room by PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleGetTicket = async () => {
    if (!room) return;
    try {
      const ticket = await kittyPartyService.generateTicket(room.id);
      setTickets((prev) => [...prev, ticket]);
      Alert.alert('Ticket Ready', 'Your 90-ball Tambola ticket is generated!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to get ticket');
    }
  };

  const handleStartGame = async () => {
    if (!room) return;
    try {
      await kittyPartyService.startGame(room.id);
      const updated = await kittyPartyService.getRoomDetails(room.id);
      setRoom(updated);
      Alert.alert('Game Started!', 'The Housie game is now live. Start calling numbers!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to start game');
    }
  };

  const handleCallNumber = async () => {
    if (!room || isCalling) return;
    try {
      setIsCalling(true);
      await kittyPartyService.callNextNumber(room.id);
      // WebSocket will push the update; fall back to HTTP poll if WS is disconnected
      if (!wsConnected) {
        const updated = await kittyPartyService.getRoomDetails(room.id);
        setRoom(updated);
      }
    } catch (e: any) {
      Alert.alert('Notice', e?.message || 'Unable to call next number');
    } finally {
      setIsCalling(false);
    }
  };

  const handleClaim = async (ticketId: number, claimType: string) => {
    if (!room) return;
    try {
      const win = await kittyPartyService.claimPrize(room.id, ticketId, claimType);
      Alert.alert('🎉 Validated Winner!', `Claim '${win.claimType}' validated for ${win.userName}!`);
      const updated = await kittyPartyService.getRoomDetails(room.id);
      setRoom(updated);
    } catch (e: any) {
      Alert.alert('Claim Rejected', e?.message || 'Pattern does not match called numbers');
    }
  };

  const toggleDab = (num: number) => {
    setDabbedNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  const calledSet = new Set(room?.calledNumbers || []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#BE185D" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>🎲 Mana Play – Housie</Text>
      <Text style={styles.screenSubtitle}>
        Free-to-play 90-ball Tambola with live caller and real-time winner verification.
      </Text>

      {!room ? (
        <View style={styles.emptyContainer}>
          {canManageGame && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🎟️</Text>
              <Text style={styles.emptyTitle}>Host New Game Room</Text>
              <Text style={styles.emptyText}>Start a free Tambola room for your circle and external guests.</Text>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreateRoom}>
                <Text style={styles.createBtnText}>Create Game Room</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.emptyCard, { marginTop: 16 }]}>
            <Text style={styles.emptyIcon}>🔑</Text>
            <Text style={styles.emptyTitle}>Join via 6-Digit PIN</Text>
            <Text style={styles.emptyText}>Enter the room code shared by your friend or host.</Text>
            <TextInput
              style={styles.pinInput}
              placeholder="e.g. AB12CD"
              placeholderTextColor="#9CA3AF"
              maxLength={10}
              autoCapitalize="characters"
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
            />
            <TouchableOpacity style={styles.joinBtn} onPress={handleJoinByCode}>
              <Text style={styles.joinBtnText}>Join by PIN</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* Room PIN Banner */}
          {room.roomCode && (
            <View style={styles.pinBanner}>
              <View style={styles.pinInfo}>
                <Text style={styles.pinLabel}>ROOM CODE / PIN</Text>
                <Text style={styles.pinCodeText}>{room.roomCode}</Text>
              </View>
              <View style={styles.pinRightCol}>
                {room.allowGuestPlayers && (
                  <View style={styles.guestAllowedTag}>
                    <Text style={styles.guestAllowedTagText}>🌍 Guests Allowed</Text>
                  </View>
                )}
                <View style={[styles.wsIndicator, wsConnected ? styles.wsConnected : styles.wsDisconnected]}>
                  <Text style={styles.wsIndicatorText}>{wsConnected ? '● Live' : '○ Offline'}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Ball Caller Billboard */}
          <View style={styles.billboard}>
            <View>
              <Text style={styles.billboardLabel}>LATEST CALLED BALL</Text>
              <Text style={styles.billboardNumber}>
                {room.lastCalledNumber ? `#${room.lastCalledNumber}` : 'Waiting...'}
              </Text>
              <Text style={styles.billboardCount}>
                Called: {room.calledNumbers.length} / 90 balls
              </Text>
            </View>

            <View style={styles.billboardActions}>
              {(room.status === 'WAITING' || room.status === 'IN_PROGRESS') && tickets.length === 0 && (
                <TouchableOpacity style={styles.actionBtn} onPress={handleGetTicket}>
                  <Text style={styles.actionBtnText}>+ Get Ticket</Text>
                </TouchableOpacity>
              )}

              {room.status === 'WAITING' && canManageGame && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#059669' }]} onPress={handleStartGame}>
                  <Text style={styles.actionBtnText}>▶ Start Game</Text>
                </TouchableOpacity>
              )}

              {room.status === 'IN_PROGRESS' && canManageGame && (
                <TouchableOpacity
                  style={[styles.actionBtn, isCalling && styles.actionBtnDisabled]}
                  disabled={isCalling}
                  onPress={handleCallNumber}
                >
                  <Text style={styles.actionBtnText}>🎲 Draw Next</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Tickets Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>MY TICKETS ({tickets.length})</Text>
              {tickets.length === 0 && (
                <TouchableOpacity onPress={handleGetTicket}>
                  <Text style={styles.addTicketText}>+ Take Ticket</Text>
                </TouchableOpacity>
              )}
            </View>

            {tickets.length === 0 ? (
              <Text style={styles.noTickets}>You haven't picked a ticket yet. Tap '+ Take Ticket' above!</Text>
            ) : (
              tickets.map((t) => (
                <KittyPartyHousieTicketView
                  key={t.ticketId}
                  matrix={t.matrix}
                  ticketId={t.ticketId}
                  ticketHash={t.ticketHash}
                  calledNumbers={calledSet}
                  dabbedNumbers={dabbedNumbers}
                  onToggleDab={toggleDab}
                  onClaim={(type) => handleClaim(t.ticketId, type)}
                />
              ))
            )}
          </View>

          {/* Winners List */}
          {room.winners.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏆 WINNERS</Text>
              <View style={styles.winnersBox}>
                {room.winners.map((w) => (
                  <View key={w.id} style={styles.winnerRow}>
                    <Text style={styles.winnerType}>{w.claimType.replace(/_/g, ' ')}</Text>
                    <Text style={styles.winnerName}>{w.userName}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}
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
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  screenSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  emptyText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  createBtn: {
    backgroundColor: '#BE185D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  billboard: {
    backgroundColor: '#4C1D95',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  billboardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DDD6FE',
    letterSpacing: 1,
  },
  billboardNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 2,
  },
  billboardCount: {
    fontSize: 11,
    color: '#C4B5FD',
  },
  billboardActions: {
    alignItems: 'flex-end',
  },
  actionBtn: {
    backgroundColor: '#DB2777',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
  addTicketText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BE185D',
  },
  noTickets: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  winnersBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  winnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  winnerType: {
    fontSize: 11,
    fontWeight: '800',
    color: '#BE185D',
  },
  winnerName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  emptyContainer: {
    marginTop: 10,
  },
  pinBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  pinInfo: {
    flexDirection: 'column',
  },
  pinLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4338CA',
    letterSpacing: 0.5,
  },
  pinCodeText: {
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: '900',
    color: '#312E81',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  pinRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  guestAllowedTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  guestAllowedTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  wsIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  wsConnected: {
    backgroundColor: '#D1FAE5',
  },
  wsDisconnected: {
    backgroundColor: '#FEE2E2',
  },
  wsIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
  },
  pinInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 10,
    marginBottom: 8,
    width: '100%',
  },
  joinBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
