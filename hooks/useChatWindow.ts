import { useState, useEffect, useCallback, useRef } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import { chatService, type PickedFile } from '@/services/chatService';
import { tokenStore } from '@/services/apiClient';
import { CONFIG } from '@/constants/config';
import { secureLog } from '@/security';
import type { ChatMessageDto } from '@/types/api';

export type LocalMessage = ChatMessageDto & { _optimisticId?: string };

let _seqCounter = 0;
function optimisticId(): string {
  return `opt_${Date.now()}_${++_seqCounter}`;
}

interface TypingEvent {
  userId: number;
  name: string;
  typing: boolean;
}

interface UseChatWindowReturn {
  messages: LocalMessage[];
  isLoading: boolean;
  isSending: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  typingNames: string[];
  sendMessage: (text: string) => Promise<void>;
  sendWithAttachments: (files: PickedFile[], text?: string) => Promise<void>;
  loadMore: () => Promise<void>;
  publishTyping: (isTyping: boolean) => void;
  connected: boolean;
}

export function useChatWindow(
  conversationId: number,
  currentUserId: number,
): UseChatWindowReturn {
  const [messages, setMessages]       = useState<LocalMessage[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isSending, setIsSending]     = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(false);
  const [page, setPage]               = useState(0);
  const [connected, setConnected]     = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());

  const stompRef     = useRef<Client | null>(null);
  const typingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load initial messages from REST ───────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const res = await chatService.getMessages(conversationId, 0);
        if (cancelled) return;
        // API returns newest-first (sort: createdAt,desc), reverse for display
        setMessages([...res.content].reverse());
        setHasMore(res.page + 1 < res.totalPages);
        setPage(0);
        // Mark read
        chatService.markRead(conversationId).catch(() => {});
      } catch (err) {
        secureLog.error('[ChatWindow] Failed to load messages', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [conversationId]);

  // ── STOMP WebSocket ────────────────────────────────────────────
  useEffect(() => {
    let client: Client;

    (async () => {
      const token = await tokenStore.getAccess();
      if (!token) return;

      client = new Client({
        brokerURL: CONFIG.WS_URL,
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 4000,

        onConnect: () => {
          setConnected(true);

          // Shared handler for incoming chat messages
          const handleIncomingMessage = (frame: IMessage) => {
            try {
              const msg: ChatMessageDto = JSON.parse(frame.body);
              setMessages((prev) => {
                if (prev.find((m) => m.id === msg.id && !m._optimisticId)) return prev;

                if (msg.senderId === currentUserId) {
                  const optIdx = prev.findIndex(
                    (m) => m._optimisticId && m.content === msg.content,
                  );
                  if (optIdx !== -1) {
                    const updated = [...prev];
                    updated[optIdx] = msg;
                    return updated;
                  }
                }

                return [...prev, msg];
              });
              chatService.markRead(conversationId).catch(() => {});
            } catch {/* malformed frame */}
          };

          // Shared handler for typing indicators
          const handleTypingEvent = (frame: IMessage) => {
            try {
              const ev: TypingEvent = JSON.parse(frame.body);
              if (ev.userId === currentUserId) return;
              setTypingUsers((prev) => {
                const next = new Map(prev);
                if (ev.typing) {
                  next.set(ev.userId, ev.name);
                } else {
                  next.delete(ev.userId);
                }
                return next;
              });
            } catch {/* ignore */}
          };

          // Subscribe: incoming chat messages (dot notation per STOMP inventory + slash alias)
          client.subscribe(`/topic/conversation.${conversationId}`, handleIncomingMessage);
          client.subscribe(`/topic/conversation/${conversationId}`, handleIncomingMessage);

          // Subscribe: typing indicators (dot notation per STOMP inventory + slash alias)
          client.subscribe(`/topic/typing.${conversationId}`, handleTypingEvent);
          client.subscribe(`/topic/typing/${conversationId}`, handleTypingEvent);
        },

        onDisconnect: () => setConnected(false),
        onStompError: (frame) => {
          secureLog.warn('[STOMP] error', { message: frame.headers['message'] });
          setConnected(false);
        },
      });

      client.activate();
      stompRef.current = client;
    })();

    return () => {
      stompRef.current?.deactivate();
      stompRef.current = null;
      setConnected(false);
    };
  }, [conversationId, currentUserId]);

  // ── Send message ───────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const optId = optimisticId();
    const optimistic: LocalMessage = {
      id: -1,
      _optimisticId: optId,
      conversationId,
      senderId: currentUserId,
      senderName: 'You',
      content: trimmed,
      type: 'text',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setIsSending(true);

    try {
      // 1. Publish over STOMP for instantaneous broker propagation
      if (stompRef.current?.connected) {
        stompRef.current.publish({
          destination: `/app/chat/conversations/${conversationId}/send`,
          body: JSON.stringify({ content: trimmed }),
        });
      }

      // 2. Persist via REST to ensure database durability and dispatch offline notifications
      const saved = await chatService.sendMessage(conversationId, trimmed);
      setMessages((prev) =>
        prev.map((m) => (m._optimisticId === optId ? saved : m))
      );
    } catch (err) {
      secureLog.error('[ChatWindow] Send failed', err);
      setMessages((prev) => prev.filter((m) => m._optimisticId !== optId));
    } finally {
      setIsSending(false);
    }
  }, [conversationId, currentUserId, isSending]);

  // ── Send message with file attachments (REST only) ─────────────
  const sendWithAttachments = useCallback(async (files: PickedFile[], text?: string) => {
    if (isSending || files.length === 0) return;

    const optId = optimisticId();
    const preview = text?.trim() || `📎 ${files[0].name}`;
    const optimistic: LocalMessage = {
      id: -1,
      _optimisticId: optId,
      conversationId,
      senderId: currentUserId,
      senderName: 'You',
      content: preview,
      type: 'file',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setIsSending(true);

    try {
      const saved = await chatService.sendWithAttachments(conversationId, files, text);
      setMessages((prev) =>
        prev.map((m) => (m._optimisticId === optId ? saved : m))
      );
    } catch (err) {
      secureLog.error('[ChatWindow] Attachment send failed', err);
      setMessages((prev) => prev.filter((m) => m._optimisticId !== optId));
    } finally {
      setIsSending(false);
    }
  }, [conversationId, currentUserId, isSending]);

  // ── Load older messages ────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await chatService.getMessages(conversationId, nextPage);
      const older = [...res.content].reverse();
      setMessages((prev) => [...older, ...prev]);
      setPage(nextPage);
      setHasMore(nextPage + 1 < res.totalPages);
    } catch (err) {
      secureLog.error('[ChatWindow] loadMore failed', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, page, hasMore, isLoadingMore]);

  // ── Typing indicator ───────────────────────────────────────────
  const publishTyping = useCallback((isTyping: boolean) => {
    if (!stompRef.current?.connected) return;

    if (typingTimer.current) clearTimeout(typingTimer.current);

    stompRef.current.publish({
      destination: `/app/chat/typing`,
      body: JSON.stringify({ conversationId, typing: isTyping }),
    });

    // Auto-stop typing after 3 s of inactivity
    if (isTyping) {
      typingTimer.current = setTimeout(() => {
        stompRef.current?.publish({
          destination: `/app/chat/typing`,
          body: JSON.stringify({ conversationId, typing: false }),
        });
      }, 3000);
    }
  }, [conversationId]);

  const typingNames = Array.from(typingUsers.values());

  return {
    messages,
    isLoading,
    isSending,
    isLoadingMore,
    hasMore,
    typingNames,
    sendMessage,
    sendWithAttachments,
    loadMore,
    publishTyping,
    connected,
  };
}
