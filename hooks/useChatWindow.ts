import { useState, useEffect, useCallback, useRef } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import { chatService } from '@/services/chatService';
import { tokenStore } from '@/services/apiClient';
import { CONFIG } from '@/constants/config';
import type { ChatMessageDto } from '@/types/api';

interface TypingEvent {
  userId: number;
  name: string;
  typing: boolean;
}

interface UseChatWindowReturn {
  messages: ChatMessageDto[];
  isLoading: boolean;
  isSending: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  typingNames: string[];       // names of people currently typing
  sendMessage: (text: string) => Promise<void>;
  loadMore: () => Promise<void>;
  publishTyping: (isTyping: boolean) => void;
  connected: boolean;
}

export function useChatWindow(
  conversationId: number,
  currentUserId: number,
): UseChatWindowReturn {
  const [messages, setMessages]       = useState<ChatMessageDto[]>([]);
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
        console.error('[ChatWindow] Failed to load messages:', err);
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

          // Subscribe: incoming chat messages
          client.subscribe(
            `/topic/conversation.${conversationId}`,
            (frame: IMessage) => {
              try {
                const msg: ChatMessageDto = JSON.parse(frame.body);
                setMessages((prev) => {
                  if (prev.find((m) => m.id === msg.id)) return prev;

                  // Reconcile optimistic self message
                  if (msg.senderId === currentUserId) {
                    const optIdx = prev.findIndex(
                      (m) =>
                        m.senderId === currentUserId &&
                        m.content === msg.content &&
                        typeof m.id === 'number' &&
                        m.id > 1000000000000
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
            },
          );

          // Subscribe: typing indicators
          client.subscribe(
            `/topic/typing.${conversationId}`,
            (frame: IMessage) => {
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
            },
          );
        },

        onDisconnect: () => setConnected(false),
        onStompError: (frame) => {
          console.warn('[STOMP]', frame.headers['message']);
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

    // Optimistic message shown immediately
    const optimistic: ChatMessageDto = {
      id: Date.now(),           // temp id, replaced when server echoes back
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
      // Try STOMP publish first (real-time path)
      if (stompRef.current?.connected) {
        stompRef.current.publish({
          destination: `/app/chat/conversations/${conversationId}/send`,
          body: JSON.stringify({ content: trimmed }),
        });
        // Server will broadcast back via /topic/conversation.{id};
        // we'll de-dup by id when it arrives
      } else {
        // Fallback to REST if WS is not connected
        const saved = await chatService.sendMessage(conversationId, trimmed);
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? saved : m))
        );
      }
    } catch (err) {
      console.error('[ChatWindow] Send failed:', err);
      // Remove optimistic on error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
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
      console.error('[ChatWindow] loadMore failed:', err);
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
    loadMore,
    publishTyping,
    connected,
  };
}
