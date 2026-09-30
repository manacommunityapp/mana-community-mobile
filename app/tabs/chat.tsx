import { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, TextInput,
  Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { chatService } from '@/services/chatService';
import { ConversationDto, ChatContactDto } from '@/types/api';
import { Header } from '@/components/common/Header';
import { COLORS, SHADOWS, RADIUS, getAvatarColor, getInitials } from '@/constants/config';
import { formatDistanceToNow } from 'date-fns';

// ── ConversationItem ───────────────────────────────────────────────────────────
function ConversationItem({ item }: { item: ConversationDto }) {
  const router = useRouter();
  const isGroup = item.isGroup ?? (item.type !== 'DIRECT');
  const other = item.contact ?? item.participants?.[0];
  const name = isGroup ? (item.title || item.name || 'Group') : (other?.name || item.name || 'Resident');
  const unread = item.unreadCount ?? item.unread ?? 0;
  const hasUnread = unread > 0;
  const avatarColor = getAvatarColor(name);
  const lastTime = item.lastMessageAt || item.lastMessageTime;

  let timeFormatted = '';
  if (lastTime) {
    try {
      timeFormatted = formatDistanceToNow(new Date(lastTime), { addSuffix: false });
    } catch {
      timeFormatted = '';
    }
  }

  return (
    <TouchableOpacity
      style={[styles.item, hasUnread && styles.itemUnread]}
      onPress={() => router.push(`/chat/${item.id}`)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
          <Text style={[styles.avatarText, { color: avatarColor.text }]}>
            {getInitials(name)}
          </Text>
        </View>
        {Boolean((other as any)?.isOnline ?? (other as any)?.online) && <View style={styles.onlineDot} />}
        {isGroup && (
          <View style={styles.groupBadge}>
            <Ionicons name="people" size={9} color="#fff" />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.itemBody}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemName, hasUnread && styles.itemNameBold]} numberOfLines={1}>
            {name}
          </Text>
          {timeFormatted ? (
            <Text style={[styles.itemTime, hasUnread && styles.itemTimeActive]}>
              {timeFormatted}
            </Text>
          ) : null}
        </View>
        <View style={styles.itemFooter}>
          <Text style={[styles.itemLast, hasUnread && styles.itemLastBold]} numberOfLines={1}>
            {item.lastMessage ?? 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── ChatScreen ─────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [modalTab, setModalTab] = useState<'DIRECT' | 'GROUP'>('DIRECT');
  const [contactSearch, setContactSearch] = useState('');
  const [groupTitle, setGroupTitle] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: chatService.getConversations,
    refetchInterval: 10_000,
  });

  const { data: contacts = [], isLoading: isContactsLoading } = useQuery({
    queryKey: ['chatContacts'],
    queryFn: chatService.getContacts,
    enabled: showNewModal,
  });

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount ?? c.unread ?? 0), 0);

  const filtered = search
    ? conversations.filter((c) => {
        const isGrp = c.isGroup ?? (c.type !== 'DIRECT');
        const title = isGrp ? (c.title || c.name || '') : (c.contact?.name || c.participants?.[0]?.name || c.name || '');
        const snippet = c.lastMessage || '';
        const q = search.toLowerCase();
        return title.toLowerCase().includes(q) || snippet.toLowerCase().includes(q);
      })
    : conversations;

  const filteredContacts = contactSearch
    ? contacts.filter((c) => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
    : contacts;

  const handleStartDirect = async (userId: number) => {
    try {
      setIsCreating(true);
      const conv = await chatService.startDirect(userId);
      setShowNewModal(false);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push(`/chat/${conv.id}`);
    } catch {
      // fallback navigate directly
      setShowNewModal(false);
      router.push(`/chat/${userId}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupTitle.trim() || selectedUserIds.length === 0) return;
    try {
      setIsCreating(true);
      const conv = await chatService.createGroup(groupTitle.trim(), selectedUserIds);
      setShowNewModal(false);
      setGroupTitle('');
      setSelectedUserIds([]);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push(`/chat/${conv.id}`);
    } catch (err: any) {
      console.warn('Group creation failed', err);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleSelectUser = (id: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Messages"
        subtitle={totalUnread > 0 ? `${totalUnread} unread` : undefined}
        actions={[{ icon: 'create-outline', onPress: () => setShowNewModal(true) }]}
      />

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
          <TextInput
            style={styles.search}
            placeholder="Search conversations or messages..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => <ConversationItem item={item} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !search ? (
              <TouchableOpacity
                style={styles.aiBanner}
                onPress={() => router.push('/ai-chat')}
                activeOpacity={0.85}
              >
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                </View>
                <View style={styles.aiTextWrap}>
                  <View style={styles.aiTitleRow}>
                    <Text style={styles.aiTitle}>Mana AI Assistant</Text>
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>66 TOOLS</Text>
                    </View>
                  </View>
                  <Text style={styles.aiSub} numberOfLines={1}>
                    Ask about dues, guest passes, court bookings & bylaws
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="chatbubbles-outline" size={36} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {search ? 'No results' : 'No conversations yet'}
              </Text>
              <Text style={styles.emptyText}>
                {search ? 'Try a different search term.' : 'Start chatting with your neighbors!'}
              </Text>
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => setShowNewModal(true)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.startBtnText}>New Message or Group</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ── New Conversation Modal ────────────────────────────────────────── */}
      <Modal
        visible={showNewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNewModal(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Conversation</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Segmented Control: Direct vs Group */}
          <View style={styles.modalTabs}>
            <TouchableOpacity
              style={[styles.modalTab, modalTab === 'DIRECT' && styles.modalTabActive]}
              onPress={() => setModalTab('DIRECT')}
            >
              <Ionicons
                name="person-outline"
                size={16}
                color={modalTab === 'DIRECT' ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.modalTabText, modalTab === 'DIRECT' && styles.modalTabTextActive]}>
                Direct Chat
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalTab, modalTab === 'GROUP' && styles.modalTabActive]}
              onPress={() => setModalTab('GROUP')}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={modalTab === 'GROUP' ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.modalTabText, modalTab === 'GROUP' && styles.modalTabTextActive]}>
                Group Chat
              </Text>
            </TouchableOpacity>
          </View>

          {modalTab === 'GROUP' && (
            <View style={styles.groupInputWrap}>
              <Text style={styles.inputLabel}>Group Subject / Name</Text>
              <TextInput
                style={styles.groupInput}
                placeholder="e.g., Badminton Champions, Block B Wing 2"
                placeholderTextColor={COLORS.textMuted}
                value={groupTitle}
                onChangeText={setGroupTitle}
              />
            </View>
          )}

          {/* Contact Search */}
          <View style={styles.contactSearchWrap}>
            <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.contactSearchInput}
              placeholder="Search community residents..."
              placeholderTextColor={COLORS.textMuted}
              value={contactSearch}
              onChangeText={setContactSearch}
            />
          </View>

          {/* Contacts List */}
          {isContactsLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
          ) : (
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingBottom: modalTab === 'GROUP' ? 90 : 20 }}
              renderItem={({ item }) => {
                const isSelected = selectedUserIds.includes(item.id);
                const color = getAvatarColor(item.name);
                return (
                  <TouchableOpacity
                    style={[styles.contactRow, isSelected && styles.contactRowSelected]}
                    onPress={() => {
                      if (modalTab === 'DIRECT') {
                        handleStartDirect(item.id);
                      } else {
                        toggleSelectUser(item.id);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.contactAvatar, { backgroundColor: color.bg }]}>
                      <Text style={[styles.contactAvatarText, { color: color.text }]}>
                        {item.avatarInitials || getInitials(item.name)}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.contactName}>{item.name}</Text>
                        {item.isVerified && (
                          <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                        )}
                      </View>
                      <Text style={styles.contactRole}>{item.role || 'Resident'}</Text>
                    </View>

                    {modalTab === 'GROUP' ? (
                      <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContacts}>
                  <Text style={styles.emptyText}>No residents found</Text>
                </View>
              }
            />
          )}

          {/* Group Chat Submit Footer */}
          {modalTab === 'GROUP' && (
            <View style={styles.groupFooter}>
              <TouchableOpacity
                style={[
                  styles.createGroupBtn,
                  (!groupTitle.trim() || selectedUserIds.length === 0 || isCreating) &&
                    styles.createGroupBtnDisabled,
                ]}
                onPress={handleCreateGroup}
                disabled={!groupTitle.trim() || selectedUserIds.length === 0 || isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="people" size={18} color="#fff" />
                    <Text style={styles.createGroupBtnText}>
                      Create Group ({selectedUserIds.length})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  // ── Search
  searchWrap:   { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 0, borderWidth: 1, borderColor: COLORS.border },
  search:       { flex: 1, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  // ── List item
  item:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  itemUnread:   { backgroundColor: '#F5F7FF' },
  // ── Avatar
  avatarWrap:   { position: 'relative', width: 50, height: 50, flexShrink: 0 },
  avatar:       { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontFamily: 'DMSans-Bold', fontWeight: '700', fontSize: 19 },
  onlineDot:    { position: 'absolute', bottom: 1, right: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.success, borderWidth: 2.5, borderColor: COLORS.surface },
  groupBadge:   { position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.surface },
  // ── Item body
  itemBody:     { flex: 1, gap: 4 },
  itemHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName:     { fontSize: 15, fontWeight: '500', color: COLORS.text, flex: 1 },
  itemNameBold: { fontWeight: '700' },
  itemTime:     { fontSize: 12, color: COLORS.textMuted, marginLeft: 8 },
  itemTimeActive:{ color: COLORS.primary, fontWeight: '600' },
  itemFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLast:     { fontSize: 13, color: COLORS.textMuted, flex: 1 },
  itemLastBold: { color: COLORS.textSecondary, fontWeight: '500' },
  badge:        { backgroundColor: COLORS.primary, borderRadius: 12, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8 },
  badgeText:    { color: '#fff', fontSize: 11, fontWeight: '700' },
  // ── Empty
  empty:        { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 32 },
  emptyIconWrap:{ width: 76, height: 76, borderRadius: 38, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptyText:    { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  startBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: RADIUS.full, marginTop: 12 },
  startBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // ── Modal Styles ─────────────────────────────────────────────
  modalContainer: { flex: 1, backgroundColor: COLORS.surface },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  modalTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    margin: 14,
    borderRadius: RADIUS.md,
    padding: 3,
  },
  modalTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: RADIUS.md - 2,
  },
  modalTabActive: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  modalTabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  modalTabTextActive: { color: COLORS.primary, fontWeight: '700' },
  groupInputWrap: {
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 6,
  },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  groupInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.text,
  },
  contactSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  contactSearchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  contactRowSelected: { backgroundColor: '#EEF2FF' },
  contactAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: { fontSize: 15, fontWeight: '700' },
  contactInfo: { flex: 1, gap: 2 },
  contactName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  contactRole: { fontSize: 12, color: COLORS.textMuted },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  emptyContacts: { alignItems: 'center', paddingVertical: 40 },
  groupFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.md,
  },
  createGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
  },
  createGroupBtnDisabled: {
    backgroundColor: '#A5B4FC',
  },
  createGroupBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // AI Banner
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    padding: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    gap: 12,
    ...SHADOWS.sm,
  },
  aiAvatar: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTextWrap: { flex: 1 },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiTitle: { fontSize: 14, fontWeight: '800', color: '#1E1B4B' },
  aiBadge: {
    backgroundColor: '#4F46E5',
    borderRadius: RADIUS.xs,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  aiBadgeText: { fontSize: 8, fontWeight: '800', color: '#fff' },
  aiSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
