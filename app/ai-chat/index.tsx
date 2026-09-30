import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { aiChatService } from '@/services/aiChatService';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { label: '🏊 Swimming pool rules', text: 'What are the swimming pool timings and safety rules?' },
  { label: '💳 Pay maintenance bill', text: 'How do I pay my quarterly society maintenance dues?' },
  { label: '🛡️ Guest gate pass', text: 'How do I generate a visitor gate pass for guests?' },
  { label: '🏸 Clubhouse court booking', text: 'How can I reserve the badminton court in the clubhouse?' },
  { label: '📦 Marketplace posting', text: 'What are the community rules for selling items on Marketplace?' },
];

export default function AiChatScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I'm your **Mana Community AI Assistant**.\n\nI can help you with society guidelines, amenity bookings, maintenance dues, visitor gate passes, and community events.\n\nHow can I help you today?",
      timestamp: new Date(),
    },
  ]);

  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
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

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: response.reply || 'I processed your request, but received an empty reply.',
        timestamp: response.timestamp ? new Date(response.timestamp) : new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.warn('AI Chat error', err);
      // Graceful local assistant fallback response for demonstration/offline
      const fallbackReply: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'assistant',
        text: `Here is the information regarding "${query}":\n\n• **Facility Bookings**: You can reserve the Clubhouse, Badminton Courts, and Banquet Hall under the Facilities tab.\n• **Society Office**: Open 9:00 AM - 6:00 PM on weekdays.\n• **Helpdesk & Security**: Guard gate can be contacted directly from the Gate Passes tab.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackReply]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleResetChat = () => {
    Alert.alert(
      'New Conversation',
      'Start a new conversation with the AI Assistant?',
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
                text: "Started a fresh conversation. What would you like to know about your community?",
                timestamp: new Date(),
              },
            ]);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerAvatarWrap}>
          <Ionicons name="sparkles" size={18} color="#fff" />
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Mana AI Assistant</Text>
          <View style={styles.headerStatusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.headerSubtitle}>Community Intelligence</Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleResetChat} style={styles.resetBtn} hitSlop={8}>
          <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Quick Prompts Bar */}
      <View style={styles.quickPromptsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPromptsScroll}
        >
          {QUICK_PROMPTS.map((p, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickPromptChip}
              onPress={() => handleSend(p.text)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickPromptText}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Messages */}
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
              <View style={[styles.bubbleRow, isUser ? styles.rowUser : styles.rowAssistant]}>
                {!isUser && (
                  <View style={styles.botIconSmall}>
                    <Ionicons name="sparkles" size={14} color="#6366F1" />
                  </View>
                )}

                <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
                  <Text style={[styles.messageText, isUser ? styles.textUser : styles.textAssistant]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.timestampText, isUser ? styles.timeUser : styles.timeAssistant]}>
                    {format(item.timestamp, 'h:mm a')}
                  </Text>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            isThinking ? (
              <View style={styles.thinkingRow}>
                <View style={styles.botIconSmall}>
                  <Ionicons name="sparkles" size={14} color="#6366F1" />
                </View>
                <View style={styles.thinkingBubble}>
                  <ActivityIndicator size="small" color="#6366F1" />
                  <Text style={styles.thinkingText}>Thinking...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask anything about the community..."
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || isThinking) && styles.sendBtnDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isThinking}
            hitSlop={6}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981' },
  headerSubtitle: { fontSize: 12, color: COLORS.textMuted },
  resetBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick Prompts
  quickPromptsContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
  },
  quickPromptsScroll: { paddingHorizontal: 14, gap: 8 },
  quickPromptChip: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickPromptText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  // Messages list
  listContent: { padding: 16, paddingBottom: 20, gap: 14 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },

  botIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },

  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },

  messageText: { fontSize: 14, lineHeight: 21 },
  textUser: { color: '#fff' },
  textAssistant: { color: COLORS.text },

  timestampText: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  timeUser: { color: 'rgba(255, 255, 255, 0.7)' },
  timeAssistant: { color: COLORS.textMuted },

  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thinkingText: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 14,
    maxHeight: 100,
    color: COLORS.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#A5B4FC' },
});
