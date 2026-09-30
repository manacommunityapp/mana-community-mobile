import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { aiChatService, AI_TOOL_DOMAINS, type ActionPill } from '@/services/aiChatService';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { COLORS, SHADOWS, RADIUS, getAvatarColor, getInitials } from '@/constants/config';

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

const CATEGORY_TABS: { key: PromptCategory; label: string; icon: IoniconsName }[] = [
  { key: 'ALL', label: 'All', icon: 'sparkles' },
  { key: 'BILLS', label: 'Dues & Bills', icon: 'card-outline' },
  { key: 'AMENITIES', label: 'Amenities', icon: 'fitness-outline' },
  { key: 'GATE', label: 'Gate & Passes', icon: 'shield-checkmark-outline' },
  { key: 'SPORTS', label: 'Sports & Auction', icon: 'trophy-outline' },
  { key: 'BYLAWS', label: 'Rules & Bylaws', icon: 'document-text-outline' },
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

  // Initial greeting
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

  // STOMP / WebSocket listener for live AI Push events
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
      // Fallback response with helpful guide
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
      <View style={styles.markdownWrap}>
        {lines.map((line, lIdx) => {
          if (!line.trim()) {
            return <View key={lIdx} style={{ height: 6 }} />;
          }

          const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
          const cleanLine = isBullet ? line.trim().replace(/^[•-]\s*/, '') : line;
          const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);

          return (
            <View key={lIdx} style={[styles.textLineRow, isBullet && styles.bulletRow]}>
              {isBullet && (
                <Text style={[styles.bulletDot, isUser ? styles.bulletUser : styles.bulletAssistant]}>
                  •
                </Text>
              )}
              <Text style={[styles.messageText, isUser ? styles.textUser : styles.textAssistant]}>
                {parts.map((part, pIdx) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    const boldText = part.slice(2, -2);
                    return (
                      <Text
                        key={pIdx}
                        style={[styles.boldText, isUser ? styles.textUserBold : styles.textAssistantBold]}
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.avatarGlow}>
          <View style={styles.botAvatar}>
            <Ionicons name="sparkles" size={17} color="#fff" />
          </View>
          <View style={styles.onlinePill} />
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Mana AI</Text>
            <View style={styles.toolsBadge}>
              <Text style={styles.toolsBadgeText}>66 TOOLS</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>Spring AI • Community Assistant</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowToolsModal(true)}
            style={styles.headerBtn}
            hitSlop={8}
          >
            <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResetChat}
            style={styles.headerBtn}
            hitSlop={8}
          >
            <Ionicons name="refresh-outline" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Live STOMP WebSocket Push Banner */}
      {livePushEvent && (
        <View style={styles.pushBanner}>
          <View style={styles.pushBannerLeft}>
            <View style={styles.pushIconWrap}>
              <Ionicons name="flash" size={15} color="#F59E0B" />
            </View>
            <View style={styles.pushTextWrap}>
              <Text style={styles.pushTitle} numberOfLines={1}>{livePushEvent.title}</Text>
              <Text style={styles.pushBody} numberOfLines={1}>{livePushEvent.body}</Text>
            </View>
          </View>
          <View style={styles.pushActions}>
            {livePushEvent.actionUrl && (
              <TouchableOpacity
                style={styles.pushActionBtn}
                onPress={() => {
                  const url = livePushEvent.actionUrl!;
                  setLivePushEvent(null);
                  router.push(url as any);
                }}
              >
                <Text style={styles.pushActionText}>View</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setLivePushEvent(null)} hitSlop={8}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Category Filter Chips */}
      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORY_TABS.map((cat) => {
            const active = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cat.icon}
                  size={12}
                  color={active ? '#fff' : COLORS.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Quick Prompts Bar */}
      <View style={styles.quickPromptsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptsScroll}>
          {filteredPrompts.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.promptChip}
              onPress={() => handleSend(p.text)}
              activeOpacity={0.7}
            >
              <Text style={styles.promptEmoji}>{p.emoji}</Text>
              <Text style={styles.promptLabel}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Messages FlatList */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isUser = item.sender === 'user';
            return (
              <View style={[styles.messageRow, isUser ? styles.rowUser : styles.rowAssistant]}>
                {!isUser ? (
                  <View style={styles.botAvatarSmall}>
                    <Ionicons name="sparkles" size={13} color="#fff" />
                  </View>
                ) : (
                  <View style={[styles.userAvatarSmall, { backgroundColor: userAvatarColor.bg }]}>
                    <Text style={[styles.userAvatarInitials, { color: userAvatarColor.text }]}>
                      {getInitials(user?.fullName || user?.name || 'U')}
                    </Text>
                  </View>
                )}

                <View style={[styles.bubbleWrap, isUser && styles.bubbleWrapUser]}>
                  <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
                    {renderMessageContent(item.text, isUser)}

                    {/* Contextual Action Pills */}
                    {!isUser && item.actions && item.actions.length > 0 && (
                      <View style={styles.actionsWrap}>
                        {item.actions.map((act, actIdx) => (
                          <TouchableOpacity
                            key={actIdx}
                            style={[styles.actionPill, { backgroundColor: act.bg, borderColor: act.color }]}
                            onPress={() => router.push(act.route as any)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name={act.icon as IoniconsName} size={13} color={act.color} />
                            <Text style={[styles.actionPillText, { color: act.color }]}>{act.label}</Text>
                            <Ionicons name="arrow-forward" size={11} color={act.color} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <View style={styles.bubbleFooter}>
                      <Text style={[styles.timestamp, isUser ? styles.timeUser : styles.timeAssistant]}>
                        {format(item.timestamp, 'h:mm a')}
                      </Text>

                      {!isUser && item.id !== 'welcome' && (
                        <View style={styles.feedbackRow}>
                          <TouchableOpacity
                            onPress={() => handleFeedback(item.id, 'like')}
                            hitSlop={6}
                            style={styles.feedbackBtn}
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
                            style={styles.feedbackBtn}
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
              <View style={styles.thinkingContainer}>
                <View style={styles.botAvatarSmall}>
                  <Ionicons name="sparkles" size={13} color="#fff" />
                </View>
                <View style={styles.thinkingBubble}>
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.thinkingText}>Consulting 66 society tools...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Ask anything about the community..."
              placeholderTextColor={COLORS.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
            {inputText.length > 0 && (
              <TouchableOpacity onPress={() => setInputText('')} hitSlop={8} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || isThinking) && styles.sendBtnDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isThinking}
            hitSlop={6}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 66 Tools & Capabilities Modal */}
      <Modal
        visible={showToolsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowToolsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={styles.modalBadge}>
                  <Ionicons name="hardware-chip-outline" size={16} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Spring AI Capabilities</Text>
                  <Text style={styles.modalSubtitle}>66 Tools Active in Mana Community</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowToolsModal(false)}
                hitSlop={8}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Modal Domains List */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalExplainer}>
                The AI assistant uses Spring AI & Ollama with deep tool execution to query your live community database and trigger instant member actions.
              </Text>

              {AI_TOOL_DOMAINS.map((domain, dIdx) => (
                <View key={dIdx} style={styles.domainCard}>
                  <View style={styles.domainHead}>
                    <View style={styles.domainIconWrap}>
                      <Ionicons name={domain.icon as IoniconsName} size={18} color={COLORS.primary} />
                    </View>
                    <View style={styles.domainTitleWrap}>
                      <Text style={styles.domainName}>{domain.name}</Text>
                      <Text style={styles.domainCount}>{domain.count} Tools Connected</Text>
                    </View>
                  </View>
                  <Text style={styles.domainDesc}>{domain.description}</Text>

                  <View style={styles.sampleQuestionsWrap}>
                    <Text style={styles.sampleQuestionsHead}>Sample Prompts:</Text>
                    {domain.sampleQuestions.map((sq, sqIdx) => (
                      <TouchableOpacity
                        key={sqIdx}
                        style={styles.sampleQuestionBtn}
                        onPress={() => {
                          setShowToolsModal(false);
                          handleSend(sq);
                        }}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={12} color={COLORS.primary} />
                        <Text style={styles.sampleQuestionText}>{sq}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  avatarGlow: {
    position: 'relative',
  },
  botAvatar: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  onlinePill: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerInfo: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  toolsBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.xs,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  toolsBadgeText: { fontSize: 8, fontWeight: '800', color: COLORS.primary },
  headerSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // Push Banner
  pushBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1B4B',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#4338CA',
  },
  pushBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  pushIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushTextWrap: { flex: 1 },
  pushTitle: { fontSize: 12, fontWeight: '700', color: '#fff' },
  pushBody: { fontSize: 11, color: '#C7D2FE', marginTop: 1 },
  pushActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pushActionBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  pushActionText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Category Bar
  categoryBar: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 6,
  },
  categoryScroll: { paddingHorizontal: 12, gap: 6 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  categoryTextActive: { color: '#fff' },

  // Quick Prompts
  quickPromptsBar: {
    backgroundColor: COLORS.surface,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  promptLabel: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  // List & Messages
  listContent: { paddingHorizontal: 14, paddingVertical: 14, gap: 14 },
  messageRow: { flexDirection: 'row', gap: 8, maxWidth: '88%' },
  rowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  rowAssistant: { alignSelf: 'flex-start' },

  botAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  userAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  userAvatarInitials: { fontSize: 11, fontWeight: '800' },

  bubbleWrap: { flex: 1 },
  bubbleWrapUser: { alignItems: 'flex-end' },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...SHADOWS.sm,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 3,
  },
  bubbleAssistant: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 3,
  },

  markdownWrap: { gap: 4 },
  textLineRow: { flexDirection: 'row', flexWrap: 'wrap' },
  bulletRow: { paddingLeft: 2 },
  bulletDot: { fontSize: 14, marginRight: 6, lineHeight: 20 },
  bulletUser: { color: 'rgba(255,255,255,0.8)' },
  bulletAssistant: { color: COLORS.primary },

  messageText: { fontSize: 14, lineHeight: 21 },
  textUser: { color: '#fff' },
  textAssistant: { color: COLORS.text },
  boldText: { fontWeight: '700' },
  textUserBold: { color: '#fff' },
  textAssistantBold: { color: '#1E1B4B' },

  // Action Pills
  actionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
  actionPillText: { fontSize: 11, fontWeight: '700' },

  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  timestamp: { fontSize: 10 },
  timeUser: { color: 'rgba(255,255,255,0.7)' },
  timeAssistant: { color: COLORS.textMuted },
  feedbackRow: { flexDirection: 'row', gap: 8, marginLeft: 12 },
  feedbackBtn: { padding: 2 },

  // Thinking state
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
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  thinkingText: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },

  // Input Bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 90,
    color: COLORS.text,
  },
  clearBtn: { padding: 4 },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  sendBtnDisabled: { backgroundColor: '#A5B4FC' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F9FAFB',
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
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  modalSubtitle: { fontSize: 12, color: COLORS.textMuted },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: { paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  modalExplainer: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 4 },
  domainCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  domainHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  domainIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  domainTitleWrap: { flex: 1 },
  domainName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  domainCount: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  domainDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginBottom: 10 },
  sampleQuestionsWrap: {
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    padding: 10,
    gap: 6,
  },
  sampleQuestionsHead: { fontSize: 11, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  sampleQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sampleQuestionText: { fontSize: 12, color: COLORS.text, flex: 1 },
});
