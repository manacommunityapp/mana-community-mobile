import { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Dimensions,
  TouchableOpacity, ActivityIndicator, TextInput,
  Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { chatService } from '@/services/chatService';
import { ConversationDto, ChatContactDto } from '@/types/api';
import {
  COLORS, SHADOWS, RADIUS, SPACING, FONTS, GRADIENTS,
  getAvatarColor, getInitials,
} from '@/constants/config';
import { formatDistanceToNow } from 'date-fns';

const SCREEN_W = Dimensions.get('window').width;

// ── ConversationItem ───────────────────────────────────────────────────────────
function ConversationItem({ item }: { item: ConversationDto }) {
  const router = useRouter();
  const isGroup = item.isGroup ?? (item.type !== 'DIRECT');
  const other = item.contact ?? item.participants?.[0];
  const name = isGroup
    ? (item.title || item.name || 'Group')
    : (other?.name || item.name || 'Resident');
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
      style={[st.item, hasUnread && st.itemUnread]}
      onPress={() => router.push(`/chat/${item.id}`)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={st.avatarWrap}>
        <View style={[st.avatar, { backgroundColor: avatarColor.bg }]}>
          <Text style={[st.avatarText, { color: avatarColor.text }]}>
            {getInitials(name)}
          </Text>
        </View>
        {Boolean((other as any)?.isOnline ?? (other as any)?.online) && (
          <View style={st.onlineDot} />
        )}
        {isGroup && (
          <View style={st.groupBadge}>
            <Text style={st.groupBadgeEmoji}>👥</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={st.itemBody}>
        <View style={st.itemHeader}>
          <Text
            style={[st.itemName, hasUnread && st.itemNameBold]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {timeFormatted ? (
            <Text style={[st.itemTime, hasUnread && st.itemTimeActive]}>
              {timeFormatted}
            </Text>
          ) : null}
        </View>
        <View style={st.itemFooter}>
          <Text
            style={[st.itemLast, hasUnread && st.itemLastBold]}
            numberOfLines={1}
          >
            {item.lastMessage ?? 'No messages yet'}
          </Text>
          {hasUnread && (
            <LinearGradient
              colors={GRADIENTS.primary as [string, string]}
              style={st.badge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={st.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </LinearGradient>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── ChatScreen ─────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const router = useRouter();
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

  const totalUnread = conversations.reduce(
    (acc, c) => acc + (c.unreadCount ?? c.unread ?? 0),
    0,
  );

  const filtered = search
    ? conversations.filter((c) => {
        const isGrp = c.isGroup ?? (c.type !== 'DIRECT');
        const title = isGrp
          ? (c.title || c.name || '')
          : (c.contact?.name || c.participants?.[0]?.name || c.name || '');
        const snippet = c.lastMessage || '';
        const q = search.toLowerCase();
        return title.toLowerCase().includes(q) || snippet.toLowerCase().includes(q);
      })
    : conversations;

  const filteredContacts = contactSearch
    ? contacts.filter((c) =>
        c.name.toLowerCase().includes(contactSearch.toLowerCase()),
      )
    : contacts;

  const handleStartDirect = async (userId: number) => {
    try {
      setIsCreating(true);
      const conv = await chatService.startDirect(userId);
      setShowNewModal(false);
      router.push(`/chat/${conv.id}`);
    } catch {
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
      router.push(`/chat/${conv.id}`);
    } catch (err: any) {
      console.warn('Group creation failed', err);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleSelectUser = (id: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id],
    );
  };

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* ── Gradient Header ─────────────────────────────── */}
      <LinearGradient
        colors={['#312E81', '#4F46E5', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.header}
      >
        <View style={st.headerTop}>
          <View style={st.headerLeft}>
            <Text style={st.headerEmoji}>💬</Text>
            <View>
              <Text style={st.headerTitle}>Messages</Text>
              <Text style={st.headerSubtitle}>Community Chat</Text>
            </View>
          </View>
          <TouchableOpacity
            style={st.newBtn}
            onPress={() => setShowNewModal(true)}
            activeOpacity={0.8}
          >
            <Text style={st.newBtnEmoji}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* Stats strip */}
        <View style={st.statsRow}>
          <View style={st.statItem}>
            <Text style={st.statNum}>{conversations.length}</Text>
            <Text style={st.statLabel}>Chats</Text>
          </View>
          <View style={st.statDivider} />
          <View style={st.statItem}>
            <Text style={st.statNum}>{totalUnread}</Text>
            <Text style={st.statLabel}>Unread</Text>
          </View>
          <View style={st.statDivider} />
          <View style={st.statItem}>
            <Text style={st.statNum}>
              {conversations.filter((c) => c.isGroup ?? c.type !== 'DIRECT').length}
            </Text>
            <Text style={st.statLabel}>Groups</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Search bar ─────────────────────────────────── */}
      <View style={st.searchWrap}>
        <View style={st.searchRow}>
          <Text style={st.searchEmoji}>🔍</Text>
          <TextInput
            style={st.search}
            placeholder="Search conversations..."
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
        <View style={st.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => <ConversationItem item={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={st.list}
          ListHeaderComponent={
            !search ? (
              <TouchableOpacity
                style={st.aiBanner}
                onPress={() => router.push('/ai-chat')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#312E81', '#4F46E5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={st.aiGradient}
                >
                  <View style={st.aiAvatarWrap}>
                    <Text style={st.aiAvatarEmoji}>✨</Text>
                  </View>
                  <View style={st.aiTextWrap}>
                    <View style={st.aiTitleRow}>
                      <Text style={st.aiTitle}>Mana AI Assistant</Text>
                      <View style={st.aiBadge}>
                        <Text style={st.aiBadgeText}>66 TOOLS</Text>
                      </View>
                    </View>
                    <Text style={st.aiSub} numberOfLines={1}>
                      Ask about dues, passes, bookings & bylaws
                    </Text>
                  </View>
                  <Text style={st.aiArrow}>›</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={st.empty}>
              <View style={st.emptyCircle}>
                <Text style={st.emptyEmoji}>💬</Text>
              </View>
              <Text style={st.emptyTitle}>
                {search ? 'No results' : 'No conversations yet'}
              </Text>
              <Text style={st.emptyDesc}>
                {search
                  ? 'Try a different search term.'
                  : 'Start chatting with your neighbors!'}
              </Text>
              {!search && (
                <TouchableOpacity
                  style={st.emptyBtnWrap}
                  onPress={() => setShowNewModal(true)}
                >
                  <LinearGradient
                    colors={['#312E81', '#4F46E5']}
                    style={st.emptyBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={st.emptyBtnEmoji}>✏️</Text>
                    <Text style={st.emptyBtnText}>New Message</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── New Conversation Modal ──────────────────────── */}
      <Modal
        visible={showNewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewModal(false)}
      >
        <SafeAreaView style={st.modalContainer}>
          {/* Modal Header */}
          <View style={st.modalHeader}>
            <TouchableOpacity onPress={() => setShowNewModal(false)} hitSlop={8} style={st.modalCloseBtn}>
              <Ionicons name="close" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <View style={st.modalHeaderCenter}>
              <Text style={st.modalHeaderEmoji}>✉️</Text>
              <Text style={st.modalTitle}>New Conversation</Text>
            </View>
            <View style={{ width: 38 }} />
          </View>

          {/* Segment: Direct / Group */}
          <View style={st.modalTabs}>
            {(['DIRECT', 'GROUP'] as const).map((t) => {
              const active = modalTab === t;
              const emoji = t === 'DIRECT' ? '👤' : '👥';
              const label = t === 'DIRECT' ? 'Direct Chat' : 'Group Chat';
              return (
                <TouchableOpacity
                  key={t}
                  style={[st.modalTab, active && st.modalTabActive]}
                  onPress={() => setModalTab(t)}
                >
                  <Text style={st.modalTabEmoji}>{emoji}</Text>
                  <Text style={[st.modalTabText, active && st.modalTabTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {modalTab === 'GROUP' && (
            <View style={st.groupInputWrap}>
              <Text style={st.inputLabel}>📝 Group Name</Text>
              <TextInput
                style={st.groupInput}
                placeholder="e.g., Badminton Champions, Block B Wing 2"
                placeholderTextColor={COLORS.textMuted}
                value={groupTitle}
                onChangeText={setGroupTitle}
              />
            </View>
          )}

          {/* Contact search */}
          <View style={st.contactSearchWrap}>
            <Text style={st.contactSearchEmoji}>🔍</Text>
            <TextInput
              style={st.contactSearchInput}
              placeholder="Search community residents..."
              placeholderTextColor={COLORS.textMuted}
              value={contactSearch}
              onChangeText={setContactSearch}
            />
          </View>

          {/* Contact list */}
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
                    style={[st.contactRow, isSelected && st.contactRowSelected]}
                    onPress={() => {
                      if (modalTab === 'DIRECT') {
                        handleStartDirect(item.id);
                      } else {
                        toggleSelectUser(item.id);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[st.contactAvatar, { backgroundColor: color.bg }]}>
                      <Text style={[st.contactAvatarText, { color: color.text }]}>
                        {item.avatarInitials || getInitials(item.name)}
                      </Text>
                    </View>
                    <View style={st.contactInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={st.contactName}>{item.name}</Text>
                        {item.isVerified && (
                          <Text style={st.verifiedEmoji}>✅</Text>
                        )}
                      </View>
                      <Text style={st.contactRole}>{item.role || 'Resident'}</Text>
                    </View>

                    {modalTab === 'GROUP' ? (
                      <View style={[st.checkbox, isSelected && st.checkboxActive]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={st.emptyContacts}>
                  <Text style={st.emptyContactsEmoji}>🔍</Text>
                  <Text style={st.emptyContactsText}>No residents found</Text>
                </View>
              }
            />
          )}

          {/* Group create footer */}
          {modalTab === 'GROUP' && (
            <View style={st.groupFooter}>
              <TouchableOpacity
                style={st.createGroupBtnWrap}
                onPress={handleCreateGroup}
                disabled={!groupTitle.trim() || selectedUserIds.length === 0 || isCreating}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    (!groupTitle.trim() || selectedUserIds.length === 0 || isCreating)
                      ? ['#A5B4FC', '#A5B4FC']
                      : ['#312E81', '#4F46E5']
                  }
                  style={st.createGroupBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isCreating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={st.createGroupBtnEmoji}>👥</Text>
                      <Text style={st.createGroupBtnText}>
                        Create Group ({selectedUserIds.length})
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // ── Gradient Header ──
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerEmoji: { fontSize: 26 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    fontFamily: FONTS.displayEB,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  newBtnEmoji: { fontSize: 18 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    fontFamily: FONTS.displayEB,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: FONTS.medium,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
  },

  // ── Search ──
  searchWrap: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    ...SHADOWS.sm,
  },
  searchEmoji: { fontSize: 14 },
  search: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },

  // ── List ──
  list: { paddingBottom: 20 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Conversation Item ──
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 13,
    gap: 13,
    backgroundColor: '#fff',
    marginHorizontal: SPACING.lg,
    marginBottom: 6,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    ...SHADOWS.sm,
  },
  itemUnread: {
    backgroundColor: '#F5F7FF',
    borderColor: '#E0E7FF',
  },
  avatarWrap: { position: 'relative', width: 50, height: 50, flexShrink: 0 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 18,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  groupBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  groupBadgeEmoji: { fontSize: 10 },
  itemBody: { flex: 1, gap: 4 },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
    fontFamily: FONTS.medium,
  },
  itemNameBold: { fontWeight: '700', fontFamily: FONTS.bold },
  itemTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 8,
    fontFamily: FONTS.regular,
  },
  itemTimeActive: { color: '#4F46E5', fontWeight: '600', fontFamily: FONTS.semiBold },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLast: {
    fontSize: 13,
    color: COLORS.textMuted,
    flex: 1,
    fontFamily: FONTS.regular,
  },
  itemLastBold: { color: COLORS.textSecondary, fontWeight: '500', fontFamily: FONTS.medium },
  badge: {
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: FONTS.bold,
  },

  // ── AI Banner ──
  aiBanner: {
    marginHorizontal: SPACING.lg,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  aiGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  aiAvatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  aiAvatarEmoji: { fontSize: 20 },
  aiTextWrap: { flex: 1 },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    fontFamily: FONTS.displayBold,
  },
  aiBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.xs,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  aiBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    fontFamily: FONTS.bold,
  },
  aiSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  aiArrow: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '300',
  },

  // ── Empty State ──
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyEmoji: { fontSize: 32 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    fontFamily: FONTS.displayBold,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: FONTS.regular,
  },
  emptyBtnWrap: {
    marginTop: 16,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  emptyBtnEmoji: { fontSize: 16 },
  emptyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONTS.displayBold,
  },

  // ── Modal ──
  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8F0',
  },
  modalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  modalHeaderCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalHeaderEmoji: { fontSize: 18 },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },

  // Segment Tabs
  modalTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  modalTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: RADIUS.md - 2,
  },
  modalTabActive: {
    backgroundColor: '#EEF2FF',
    ...SHADOWS.sm,
  },
  modalTabEmoji: { fontSize: 14 },
  modalTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    fontFamily: FONTS.semiBold,
  },
  modalTabTextActive: { color: '#312E81', fontWeight: '700', fontFamily: FONTS.bold },

  groupInputWrap: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: FONTS.semiBold,
  },
  groupInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },

  contactSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  contactSearchEmoji: { fontSize: 14 },
  contactSearchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 11,
    marginHorizontal: SPACING.lg,
    marginBottom: 6,
    borderRadius: RADIUS.lg,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    gap: 12,
  },
  contactRowSelected: { backgroundColor: '#EEF2FF', borderColor: '#E0E7FF' },
  contactAvatar: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  contactInfo: { flex: 1, gap: 2 },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.semiBold,
  },
  contactRole: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  verifiedEmoji: { fontSize: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E8E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  emptyContacts: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyContactsEmoji: { fontSize: 28 },
  emptyContactsText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONTS.regular,
  },

  groupFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8F0',
    ...SHADOWS.md,
  },
  createGroupBtnWrap: { borderRadius: RADIUS.md, overflow: 'hidden' },
  createGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
  },
  createGroupBtnEmoji: { fontSize: 16 },
  createGroupBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONTS.displayBold,
  },
});
