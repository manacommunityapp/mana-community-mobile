import { useState, useRef, useCallback } from 'react';
import {
  View, TextInput, TouchableOpacity,
  StyleSheet, Text, Platform, ActivityIndicator,
} from 'react-native';
import { COLORS } from '@/constants/config';

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  isSending?: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onTyping, isSending = false, disabled = false }: ChatInputProps) {
  const [text, setText]           = useState('');
  const [inputHeight, setHeight]  = useState(44);
  const typingRef                 = useRef(false);
  const typingTimeout             = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeText = useCallback((value: string) => {
    setText(value);

    if (!onTyping) return;

    // Publish "typing" once per burst, debounce "stopped"
    if (value.length > 0 && !typingRef.current) {
      typingRef.current = true;
      onTyping(true);
    }

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      typingRef.current = false;
      onTyping(false);
    }, 2500);
  }, [onTyping]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setText('');
    setHeight(44);

    // Stop typing indicator immediately
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (typingRef.current) {
      typingRef.current = false;
      onTyping?.(false);
    }

    await onSend(trimmed);
  }, [text, isSending, onSend, onTyping]);

  const canSend = text.trim().length > 0 && !isSending && !disabled;

  return (
    <View style={styles.container}>
      {/* Attachment button (placeholder) */}
      <TouchableOpacity style={styles.iconBtn} disabled={disabled}>
        <Text style={styles.iconText}>📎</Text>
      </TouchableOpacity>

      {/* Text input */}
      <TextInput
        style={[styles.input, { height: Math.max(44, Math.min(inputHeight, 120)) }]}
        value={text}
        onChangeText={handleChangeText}
        placeholder="Type a message…"
        placeholderTextColor={COLORS.textMuted}
        multiline
        onContentSizeChange={(e) => setHeight(e.nativeEvent.contentSize.height + 24)}
        editable={!disabled}
        returnKeyType="default"
        blurOnSubmit={false}
      />

      {/* Send / loading */}
      <TouchableOpacity
        style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={!canSend}
        activeOpacity={0.8}
      >
        {isSending
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.sendIcon}>➤</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8 },
  iconBtn:         { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  iconText:        { fontSize: 20 },
  input:           { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 22, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 11 : 8, paddingBottom: Platform.OS === 'ios' ? 11 : 8, fontSize: 15, color: COLORS.text, maxHeight: 120 },
  sendBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendIcon:        { color: '#fff', fontSize: 16, marginLeft: 2 },
});
