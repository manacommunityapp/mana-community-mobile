import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/config';
import {
  socialGroupService,
  type GroupMessage,
  type GroupEvent,
  type GroupExpense,
} from '@/services/socialGroupService';

type Tab = 'chat' | 'events' | 'expenses';

function ChatTab({ groupId }: { groupId: number }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const flatRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['social-messages', groupId],
    queryFn: () => socialGroupService.getMessages(groupId),
    refetchInterval: 15_000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => socialGroupService.sendMessage(groupId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-messages', groupId] });
      setText('');
    },
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMutation.mutate(trimmed);
  };

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
      <FlatList
        ref={flatRef}
        data={[...messages].reverse()}
        keyExtractor={m => String(m.id)}
        inverted
        contentContainerStyle={styles.chatList}
        renderItem={({ item }) => (
          <View style={styles.msgRow}>
            <View style={styles.msgAvatar}>
              <Text style={styles.msgAvatarText}>{item.senderName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.msgBubble}>
              <Text style={styles.msgSender}>{item.senderName}</Text>
              <Text style={styles.msgContent}>{item.content}</Text>
              <Text style={styles.msgTime}>
                {new Date(item.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>No messages yet. Start the conversation!</Text>
          </View>
        }
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.chatInput}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sendMutation.isPending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
        >
          {sendMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function EventsTab({ groupId }: { groupId: number }) {
  const qc = useQueryClient();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['social-events', groupId],
    queryFn: () => socialGroupService.getEvents(groupId),
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: number; status: 'GOING' | 'NOT_GOING' | 'MAYBE' }) =>
      socialGroupService.rsvp(groupId, eventId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-events', groupId] }),
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />;

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {events.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No upcoming events for this group.</Text>
        </View>
      ) : (
        events.map(event => (
          <View key={event.id} style={styles.eventCard}>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventMeta}>
                {new Date(event.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {event.location ? ` · ${event.location}` : ''}
              </Text>
            </View>
            <View style={styles.rsvpRow}>
              {(['GOING', 'MAYBE', 'NOT_GOING'] as const).map(status => (
                <TouchableOpacity
                  key={status}
                  style={[styles.rsvpChip, event.rsvpStatus === status && styles.rsvpChipActive]}
                  onPress={() => rsvpMutation.mutate({ eventId: event.id, status })}
                >
                  <Text style={[styles.rsvpChipText, event.rsvpStatus === status && styles.rsvpChipTextActive]}>
                    {status === 'GOING' ? '✓ Going' : status === 'MAYBE' ? '? Maybe' : '✗ No'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function ExpensesTab({ groupId }: { groupId: number }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['social-expenses', groupId],
    queryFn: () => socialGroupService.getExpenses(groupId),
  });

  const addMutation = useMutation({
    mutationFn: () => socialGroupService.addExpense(groupId, desc, parseFloat(amount)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-expenses', groupId] });
      setShowAdd(false);
      setDesc('');
      setAmount('');
    },
  });

  const totalBalance = expenses.reduce((s, e) => s + e.myBalance, 0);

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />;

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={[styles.balanceCard, { backgroundColor: totalBalance >= 0 ? COLORS.successLight : COLORS.errorLight }]}>
        <Text style={styles.balanceLabel}>Your Balance</Text>
        <Text style={[styles.balanceAmt, { color: totalBalance >= 0 ? COLORS.successDark : COLORS.errorDark }]}>
          {totalBalance >= 0 ? '+' : ''}₹{Math.abs(totalBalance).toLocaleString('en-IN')}
        </Text>
        <Text style={styles.balanceHint}>{totalBalance >= 0 ? 'Others owe you' : 'You owe others'}</Text>
      </View>

      <TouchableOpacity style={styles.addExpenseBtn} onPress={() => setShowAdd(!showAdd)}>
        <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
        <Text style={styles.addExpenseBtnText}>Add Expense</Text>
      </TouchableOpacity>

      {showAdd && (
        <View style={styles.addExpenseForm}>
          <TextInput
            style={styles.expInput}
            value={desc}
            onChangeText={setDesc}
            placeholder="What was it for?"
            placeholderTextColor={COLORS.textMuted}
          />
          <TextInput
            style={styles.expInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="Amount (₹)"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={[styles.submitExpBtn, (addMutation.isPending || !desc || !amount) && styles.submitExpBtnDisabled]}
            onPress={() => addMutation.mutate()}
            disabled={addMutation.isPending || !desc || !amount}
          >
            {addMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitExpBtnText}>Submit</Text>}
          </TouchableOpacity>
        </View>
      )}

      {expenses.map(exp => (
        <View key={exp.id} style={styles.expCard}>
          <View style={styles.expInfo}>
            <Text style={styles.expDesc}>{exp.description}</Text>
            <Text style={styles.expMeta}>Paid by {exp.paidByName} · ₹{exp.amount.toLocaleString('en-IN')}</Text>
          </View>
          <Text style={[styles.expShare, { color: exp.myBalance >= 0 ? COLORS.successDark : COLORS.errorDark }]}>
            {exp.myBalance >= 0 ? '+' : ''}₹{Math.abs(exp.myBalance).toLocaleString('en-IN')}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const id = Number(groupId);
  const [tab, setTab] = useState<Tab>('chat');

  const { data: group, isLoading } = useQuery({
    queryKey: ['social-group', id],
    queryFn: () => socialGroupService.getGroup(id),
    enabled: !!id,
  });

  if (isLoading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.groupName} numberOfLines={1}>{group?.name ?? 'Group'}</Text>
          <Text style={styles.groupMeta}>{group?.memberCount ?? 0} members</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {(['chat', 'events', 'expenses'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tabItem, tab === t && styles.tabItemActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabItemText, tab === t && styles.tabItemTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'chat' && <ChatTab groupId={id} />}
        {tab === 'events' && <EventsTab groupId={id} />}
        {tab === 'expenses' && <ExpensesTab groupId={id} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderSlate },
  backBtn: { marginRight: 12 },
  groupName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  groupMeta: { fontSize: 12, color: COLORS.textMuted },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.borderSlate },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabItemText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  tabItemTextActive: { color: COLORS.primary, fontWeight: '700' },
  chatList: { paddingHorizontal: 16, paddingVertical: 12 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  msgAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  msgAvatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  msgBubble: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 10, ...SHADOWS.sm },
  msgSender: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  msgContent: { fontSize: 14, color: COLORS.text },
  msgTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.borderSlate, backgroundColor: COLORS.surface },
  chatInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingHorizontal: 12, paddingVertical: 8, maxHeight: 80 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  sendBtnDisabled: { opacity: 0.5 },
  emptyChat: { alignItems: 'center', paddingTop: 60 },
  emptyChatText: { fontSize: 14, color: COLORS.textMuted },
  tabContent: { padding: 16 },
  emptyCard: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
  eventCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, ...SHADOWS.sm },
  eventInfo: { marginBottom: 10 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  eventMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  rsvpRow: { flexDirection: 'row', gap: 8 },
  rsvpChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderSlate, backgroundColor: COLORS.backgroundAlt },
  rsvpChipActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  rsvpChipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  rsvpChipTextActive: { color: COLORS.primary, fontWeight: '700' },
  balanceCard: { borderRadius: RADIUS.lg, padding: 20, alignItems: 'center', marginBottom: 16 },
  balanceLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  balanceAmt: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  balanceHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  addExpenseBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  addExpenseBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginLeft: 6 },
  addExpenseForm: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, marginBottom: 16, ...SHADOWS.sm },
  expInput: { borderWidth: 1, borderColor: COLORS.borderSlate, borderRadius: RADIUS.md, padding: 10, fontSize: 14, color: COLORS.text, marginBottom: 10 },
  submitExpBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 12, alignItems: 'center' },
  submitExpBtnDisabled: { opacity: 0.5 },
  submitExpBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  expCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, marginBottom: 8, ...SHADOWS.sm },
  expInfo: { flex: 1 },
  expDesc: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  expMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  expShare: { fontSize: 15, fontWeight: '700', marginLeft: 12 },
});
