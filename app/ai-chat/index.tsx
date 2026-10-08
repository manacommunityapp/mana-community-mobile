import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { aiChatService, AI_TOOL_DOMAINS, type ActionPill } from '@/services/aiChatService';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  COLORS, SHADOWS, RADIUS, SPACING, FONTS, GRADIENTS,
  getAvatarColor, getInitials,
} from '@/constants/config';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  actions?: ActionPill[];
  feedback?: 'like' | 'dislike';
}

interface PushBannerEvent {
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
  referenceId?: number;
}

type PromptCategory = 'ALL' | 'BILLS' | 'AMENITIES' | 'GATE' | 'SPORTS' | 'BYLAWS';

interface QuickPrompt {
  id: string;
  category: PromptCategory;
  emoji: string;
  label: string;
  text: string;
}

const CATEGORY_TABS: { key: PromptCategory; label: string; emoji: string }[] = [
  { key: 'ALL',       label: 'All',            emoji: '✨' },
  { key: 'BILLS',     label: 'Dues & Bills',   emoji: '💳' },
  { key: 'AMENITIES', label: 'Amenities',      emoji: '🏊' },
  { key: 'GATE',      label: 'Gate & Passes',  emoji: '🛡️' },
  { key: 'SPORTS',    label: 'Sports',         emoji: '🏆' },
  { key: 'BYLAWS',    label: 'Rules & Bylaws', emoji: '📜' },
];

const QUICK_PROMPTS: QuickPrompt[] = [
  { id: '1', category: 'AMENITIES', emoji: '🏊', label: 'Pool timings', text: 'What are the swimming pool timings and safety rules?' },
  { id: '2', category: 'BILLS', emoji: '💳', label: 'Pay maintenance dues', text: 'How do I pay my quarterly society maintenance dues?' },
  { id: '3', category: 'GATE', emoji: '🛡️', label: 'Guest gate pass', text: 'How do I generate a visitor gate pass for guests?' },
  { id: '4', category: 'AMENITIES', emoji: '🏸', label: 'Badminton court booking', text: 'How can I reserve the wooden badminton court in the clubhouse?' },
  { id: '5', category: 'SPORTS', emoji: '🏆', label: 'Mana Premier League', text: 'When is the next society cricket tournament and how do player auctions work?' },
  { id: '6', category: 'BYLAWS', emoji: '🔨', label: 'Renovation quiet hours', text: 'What are the permitted hours for apartment renovations and noisy work?' },
  { id: '7', category: 'GATE', emoji: '🅿️', label: 'EV charging points', text: 'Where are the EV fast charging bays located and what is the tariff?' },
  { id: '8', category: 'BILLS', emoji: '🧾', label: 'Sinking fund calculation', text: 'How is the society sinking fund contribution calculated for my flat?' },
  { id: '9', category: 'BYLAWS', emoji: '🐾', label: 'Pet rules in lifts', text: 'What are the society pet policies for elevators and common walking tracks?' },
  { id: '10', category: 'AMENITIES', emoji: '🛠️', label: 'Emergency plumber', text: 'How can I request an emergency plumber for a pipe leak?' },
];

export default function AiChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory>('ALL');
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [livePushEvent, setLivePushEvent] = useState<PushBannerEvent | null>(null);

  const userAvatarColor = getAvatarColor(user?.fullName || user?.name || 'Resident');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I'm your **Mana Community AI Assistant**.\n\nI am connected to **66 backend tools** spanning amenity reservations, maintenance dues, visitor gate passes, sports tournament leaderboards, live auctions, and society bylaws.\n\nHow can I help you today?",
      timestamp: new Date(),
      actions: [
        { label: 'Pay Dues', icon: 'card-outline', route: '/finance', color: '#4F46E5', bg: '#EEF2FF' },
        { label: 'Visitor Pass', icon: 'shield-checkmark-outline', route: '/visitors', color: '#0891B2', bg: '#CFFAFE' },
      ],
    },
  ]);

  const handleWebSocketMessage = useCallback((topic: string, body: unknown) => {
    if (body && typeof body === 'object') {
      const evt = body as any;
      setLivePushEvent({
        type: evt.type || 'AI_ALERT',
        title: evt.title || 'AI Assistant Alert',
        body: evt.body || '',
        actionUrl: evt.actionUrl,
        referenceId: evt.referenceId,
      });
    }
  }, []);

  useWebSocket({
    topics: user?.id ? [`/topic/notifications/${user.id}`] : [],
    onMessage: handleWebSocketMessage,
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages, isThinking]);

  const handleSend = async (messageToSend?: string) => {
    const query = (messageToSend || inputText).trim();
    if (!query || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    try {
      const response = await aiChatService.sendMessage(query, conversationId);
      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      const replyText = response.reply || 'I processed your query, but received an empty response.';
      const actions = aiChatService.getSuggestedActions(replyText);

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: response.timestamp ? new Date(response.timestamp) : new Date(),
        actions,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallbackReply: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'assistant',
        text: `Here is the society information for "${query}":\n\n• **Facility Bookings**: Reserve the Clubhouse, Badminton Courts, and Swimming Pool under Facilities.\n• **Estate Office**: Open 9:00 AM – 6:00 PM on weekdays.\n• **Security Gate**: Main gate intercom available 24x7 from Gate Passes.`,
        timestamp: new Date(),
        actions: aiChatService.getSuggestedActions(query),
      };
      setMessages((prev) => [...prev, fallbackReply]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleResetChat = () => {
    Alert.alert(
      'New Conversation',
      'Start a new conversation with the AI Assistant? Your current topic memory will be reset.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'New Topic',
          style: 'destructive',
          onPress: () => {
            setConversationId(undefined);
            setMessages([
              {
                id: `welcome-${Date.now()}`,
                sender: 'assistant',
                text: "Started a fresh conversation topic.\n\nAsk me anything about community maintenance, amenities, visitor passes, sports tournaments, or society bylaws!",
                timestamp: new Date(),
                actions: [
                  { label: 'Pay Dues', icon: 'card-outline', route: '/finance', color: '#4F46E5', bg: '#EEF2FF' },
                  { label: 'Visitor Pass', icon: 'shield-checkmark-outline', route: '/visitors', color: '#0891B2', bg: '#CFFAFE' },
                ],
              },
            ]);
          },
        },
      ],
    );
  };

  const handleFeedback = (messageId: string, type: 'like' | 'dislike') => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, feedback: m.feedback === type ? undefined : type }
          : m
      )
    );
  };

  const filteredPrompts = QUICK_PROMPTS.filter((p) => {
    if (selectedCategory === 'ALL') return true;
    return p.category === selectedCategory;
  });

  const renderMessageContent = (text: string, isUser: boolean) => {
    const lines = text.split('\n');

    return (
      <View style={s.markdownWrap}>
        {lines.map((line, lIdx) => {
          if (!line.trim()) {
            return <View key={lIdx} style={{ height: 6 }} />;
          }

          const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
          const cleanLine = isBullet ? line.trim().replace(/^[•-]\s*/, '') : line;
          const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);

          return (
            <View key={lIdx} style={[s.textLineRow, isBullet && s.bulletRow]}>
              {isBullet && (
                <Text style={[s.bulletDot, isUser ? s.bulletUser : s.bulletAssistant]}>
                  •
                </Text>
              )}
              <Text style={[s.messageText, isUser ? s.textUser : s.textAssistant]}>
                {parts.map((part, pIdx) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    const boldText = part.slice(2, -2);
                    return (
                      <Text
                        key={pIdx}
                        style={[s.boldText, isUser ? s.textUserBold : s.textAssistantBold]}
                      >
                        {boldText}
                      </Text>
                    );
                  }
                  return part;
                })}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Gradient Header ──────────────────────────── */}
      <LinearGradient
        colors={['#312E81', '#4F46E5', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={s.headerNavBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={s.headerAvatarWrap}>
          <Text style={s.headerAvatarEmoji}>✨</Text>
          <View style={s.headerOnlinePill} />
        </View>

        <View style={s.headerInfo}>
          <View style={s.headerTitleRow}>
            <Text style={s.headerTitle}>Mana AI</Text>
            <View style={s.toolsBadge}>
              <Text style={s.toolsBadgeText}>66 TOOLS</Text>
            </View>
          </View>
          <Text style={s.headerSubtitle}>Spring AI • Community Assistant</Text>
        </View>

        <View style={s.headerActions}>
          <TouchableOpacity
            onPress={() => setShowToolsModal(true)}
            style={s.headerActionBtn}
            hitSlop={8}
          >
            <Text style={s.headerActionEmoji}>ℹ️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleResetChat}
            style={s.headerActionBtn}
            hitSlop={8}
          >
            <Text style={s.headerActionEmoji}>🔄</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Live STOMP Push Banner */}
      {livePushEvent && (
        <View style={s.pushBanner}>
          <View style={s.pushBannerLeft}>
            <Text style={s.pushEmoji}>⚡</Text>
            <View style={s.pushTextWrap}>
              <Text style={s.pushTitle} numberOfLines={1}>{livePushEvent.title}</Text>
              <Text style={s.pushBody} numberOfLines={1}>{livePushEvent.body}</Text>
            </View>
          </View>
          <View style={s.pushActions}>
            {livePushEvent.actionUrl && (
              <TouchableOpacity
                style={s.pushActionBtn}
                onPress={() => {
                  const url = livePushEvent.actionUrl!;
                  setLivePushEvent(null);
                  router.push(url as any);
                }}
              >
                <Text style={s.pushActionText}>View</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setLivePushEvent(null)} hitSlop={8}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Category Filter Pills ──────────────────── */}
      <View style={s.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryScroll}>
          {CATEGORY_TABS.map((cat) => {
            const active = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[s.categoryChip, active && s.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Text style={s.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[s.categoryText, active && s.categoryTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Quick Prompts ──────────────────────────── */}
      <View style={s.quickPromptsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.promptsScroll}>
          {filteredPrompts.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={s.promptChip}
              onPress={() => handleSend(p.text)}
              activeOpacity={0.7}
            >
              <Text style={s.promptEmoji}>{p.emoji}</Text>
              <Text style={s.promptLabel}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Messages ──────────────────────────────── */}
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isUser = item.sender === 'user';
            return (
              <View style={[s.messageRow, isUser ? s.rowUser : s.rowAssistant]}>
                {!isUser ? (
                  <View style={s.botAvatarSmall}>
                    <Text style={s.botAvatarEmoji}>✨</Text>
                  </View>
                ) : (
                  <View style={[s.userAvatarSmall, { backgroundColor: userAvatarColor.bg }]}>
                    <Text style={[s.userAvatarInitials, { color: userAvatarColor.text }]}>
                      {getInitials(user?.fullName || user?.name || 'U')}
                    </Text>
                  </View>
                )}

                <View style={[s.bubbleWrap, isUser && s.bubbleWrapUser]}>
                  <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAssistant]}>
                    {renderMessageContent(item.text, isUser)}

                    {!isUser && item.actions && item.actions.length > 0 && (
                      <View style={s.actionsWrap}>
                        {item.actions.map((act, actIdx) => (
                          <TouchableOpacity
                            key={actIdx}
                            style={[s.actionPill, { backgroundColor: act.bg, borderColor: act.color }]}
                            onPress={() => router.push(act.route as any)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name={act.icon as IoniconsName} size={13} color={act.color} />
                            <Text style={[s.actionPillText, { color: act.color }]}>{act.label}</Text>
                            <Ionicons name="arrow-forward" size={11} color={act.color} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <View style={s.bubbleFooter}>
                      <Text style={[s.timestamp, isUser ? s.timeUser : s.timeAssistant]}>
                        {format(item.timestamp, 'h:mm a')}
                      </Text>

                      {!isUser && item.id !== 'welcome' && (
                        <View style={s.feedbackRow}>
                          <TouchableOpacity
                            onPress={() => handleFeedback(item.id, 'like')}
                            hitSlop={6}
                            style={s.feedbackBtn}
                          >
                            <Ionicons
                              name={item.feedback === 'like' ? 'thumbs-up' : 'thumbs-up-outline'}
                              size={12}
                              color={item.feedback === 'like' ? COLORS.primary : COLORS.textMuted}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleFeedback(item.id, 'dislike')}
                            hitSlop={6}
                            style={s.feedbackBtn}
                          >
                            <Ionicons
                              name={item.feedback === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'}
                              size={12}
                              color={item.feedback === 'dislike' ? COLORS.error : COLORS.textMuted}
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            isThinking ? (
              <View style={s.thinkingContainer}>
                <View style={s.botAvatarSmall}>
                  <Text style={s.botAvatarEmoji}>✨</Text>
                </View>
                <View style={s.thinkingBubble}>
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={s.thinkingText}>Consulting 66 society tools...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Input Bar */}
        <View style={s.inputBar}>
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              placeholder="Ask anything about the community..."
              placeholderTextColor={COLORS.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
            {inputText.length > 0 && (
              <TouchableOpacity onPress={() => setInputText('')} hitSlop={8} style={s.clearBtn}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={s.sendBtnWrap}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isThinking}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                (!inputText.trim() || isThinking)
                  ? ['#A5B4FC', '#A5B4FC']
                  : ['#312E81', '#4F46E5']
              }
              style={s.sendBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="send" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── 66 Tools Modal ─────────────────────────── */}
      <Modal
        visible={showToolsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowToolsModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <View style={s.modalTitleRow}>
                <View style={s.modalBadge}>
                  <Text style={s.modalBadgeEmoji}>🤖</Text>
                </View>
                <View>
                  <Text style={s.modalTitle}>Spring AI Capabilities</Text>
                  <Text style={s.modalSubtitle}>66 Tools Active in Mana Community</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowToolsModal(false)}
                hitSlop={8}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalScroll}>
              <Text style={s.modalExplainer}>
                The AI assistant uses Spring AI & Ollama with deep tool execution to query your live community database and trigger instant member actions.
              </Text>

              {AI_TOOL_DOMAINS.map((domain, dIdx) => (
                <View key={dIdx} style={s.domainCard}>
                  <View style={s.domainHead}>
                    <View style={s.domainIconWrap}>
                      <Ionicons name={domain.icon as IoniconsName} size={18} color="#4F46E5" />
                    </View>
                    <View style={s.domainTitleWrap}>
                      <Text style={s.domainName}>{domain.name}</Text>
                      <Text style={s.domainCount}>{domain.count} Tools Connected</Text>
                    </View>
                  </View>
                  <Text style={s.domainDesc}>{domain.description}</Text>

                  <View style={s.sampleQuestionsWrap}>
                    <Text style={s.sampleQuestionsHead}>💡 Sample Prompts</Text>
                    {domain.sampleQuestions.map((sq, sqIdx) => (
                      <TouchableOpacity
                        key={sqIdx}
                        style={s.sampleQuestionBtn}
                        onPress={() => {
                          setShowToolsModal(false);
                          handleSend(sq);
                        }}
                      >
                        <Text style={s.sampleQuestionEmoji}>💬</Text>
                        <Text style={s.sampleQuestionText}>{sq}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },

  // ── Gradient Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    gap: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerAvatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
  },
  headerAvatarEmoji: { fontSize: 20 },
  headerOnlinePill: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  headerInfo: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    fontFamily: FONTS.displayEB,
    letterSpacing: -0.3,
  },
  toolsBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.xs,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  toolsBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    fontFamily: FONTS.bold,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
    fontFamily: FONTS.regular,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  headerActionEmoji: { fontSize: 15 },

  // ── Push Banner ──
  pushBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1B4B',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pushBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  pushEmoji: { fontSize: 16 },
  pushTextWrap: { flex: 1 },
  pushTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    fontFamily: FONTS.bold,
  },
  pushBody: {
    fontSize: 11,
    color: '#C7D2FE',
    marginTop: 1,
    fontFamily: FONTS.regular,
  },
  pushActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pushActionBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  pushActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    fontFamily: FONTS.bold,
  },

  // ── Category Pills ──
  categoryBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8F0',
    paddingVertical: 8,
  },
  categoryScroll: { paddingHorizontal: 12, gap: 6 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  categoryEmoji: { fontSize: 12 },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    fontFamily: FONTS.semiBold,
  },
  categoryTextActive: { color: '#312E81', fontWeight: '700', fontFamily: FONTS.bold },

  // ── Quick Prompts ──
  quickPromptsBar: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8F0',
  },
  promptsScroll: { paddingHorizontal: 12, gap: 6 },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  promptEmoji: { fontSize: 13 },
  promptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#312E81',
    fontFamily: FONTS.semiBold,
  },

  // ── Messages ──
  listContent: { paddingHorizontal: 14, paddingVertical: 14, gap: 14 },
  messageRow: { flexDirection: 'row', gap: 8, maxWidth: '88%' },
  rowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  rowAssistant: { alignSelf: 'flex-start' },

  botAvatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  botAvatarEmoji: { fontSize: 14 },
  userAvatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  userAvatarInitials: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: FONTS.bold,
  },

  bubbleWrap: { flex: 1 },
  bubbleWrapUser: { alignItems: 'flex-end' },
  bubble: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...SHADOWS.sm,
  },
  bubbleUser: {
    backgroundColor: '#4F46E5',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    borderBottomLeftRadius: 4,
  },

  markdownWrap: { gap: 4 },
  textLineRow: { flexDirection: 'row', flexWrap: 'wrap' },
  bulletRow: { paddingLeft: 2 },
  bulletDot: { fontSize: 14, marginRight: 6, lineHeight: 20 },
  bulletUser: { color: 'rgba(255,255,255,0.8)' },
  bulletAssistant: { color: '#4F46E5' },

  messageText: { fontSize: 14, lineHeight: 21, fontFamily: FONTS.regular },
  textUser: { color: '#fff' },
  textAssistant: { color: COLORS.text },
  boldText: { fontWeight: '700', fontFamily: FONTS.bold },
  textUserBold: { color: '#fff' },
  textAssistantBold: { color: '#1E1B4B' },

  actionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8E8F0',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },

  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  timestamp: {
    fontSize: 10,
    fontFamily: FONTS.regular,
  },
  timeUser: { color: 'rgba(255,255,255,0.7)' },
  timeAssistant: { color: COLORS.textMuted },
  feedbackRow: { flexDirection: 'row', gap: 8, marginLeft: 12 },
  feedbackBtn: { padding: 2 },

  // ── Thinking ──
  thinkingContainer: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'flex-start',
    alignItems: 'center',
    marginTop: 4,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    ...SHADOWS.sm,
  },
  thinkingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    fontFamily: FONTS.regular,
  },

  // ── Input Bar ──
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8F0',
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 90,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  clearBtn: { padding: 4 },
  sendBtnWrap: { borderRadius: 20, overflow: 'hidden' },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8F0',
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBadgeEmoji: { fontSize: 18 },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  modalScroll: { paddingHorizontal: SPACING.lg, paddingTop: 14, gap: 12 },
  modalExplainer: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 4,
    fontFamily: FONTS.regular,
  },
  domainCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    ...SHADOWS.sm,
  },
  domainHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  domainIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  domainTitleWrap: { flex: 1 },
  domainName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  domainCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
    fontFamily: FONTS.semiBold,
  },
  domainDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
    marginBottom: 10,
    fontFamily: FONTS.regular,
  },
  sampleQuestionsWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: 10,
    gap: 6,
  },
  sampleQuestionsHead: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: FONTS.bold,
  },
  sampleQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  sampleQuestionEmoji: { fontSize: 12 },
  sampleQuestionText: {
    fontSize: 12,
    color: COLORS.text,
    flex: 1,
    fontFamily: FONTS.regular,
  },
});
