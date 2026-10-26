import { useState, useRef, useCallback } from 'react';
import {
  View, TextInput, TouchableOpacity,
  StyleSheet, Text, Platform, ActivityIndicator,
  Image, ScrollView, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { PickedFile } from '@/services/chatService';

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  onSendAttachments?: (files: PickedFile[], text?: string) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  isSending?: boolean;
  disabled?: boolean;
}

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function ChatInput({ onSend, onSendAttachments, onTyping, isSending = false, disabled = false }: ChatInputProps) {
  const [text, setText]           = useState('');
  const [inputHeight, setHeight]  = useState(44);
  const [pickedFiles, setPickedFiles] = useState<PickedFile[]>([]);
  const typingRef                 = useRef(false);
  const typingTimeout             = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeText = useCallback((value: string) => {
    setText(value);

    if (!onTyping) return;

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
    const hasFiles = pickedFiles.length > 0;
    if ((!trimmed && !hasFiles) || isSending) return;

    setText('');
    setHeight(44);

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (typingRef.current) {
      typingRef.current = false;
      onTyping?.(false);
    }

    if (hasFiles && onSendAttachments) {
      const files = [...pickedFiles];
      setPickedFiles([]);
      await onSendAttachments(files, trimmed || undefined);
    } else if (trimmed) {
      await onSend(trimmed);
    }
  }, [text, pickedFiles, isSending, onSend, onSendAttachments, onTyping]);

  const pickImages = useCallback(async () => {
    if (pickedFiles.length >= MAX_ATTACHMENTS) {
      Alert.alert('Limit reached', `You can attach up to ${MAX_ATTACHMENTS} files per message.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_ATTACHMENTS - pickedFiles.length,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    const newFiles: PickedFile[] = [];
    for (const asset of result.assets) {
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        Alert.alert('File too large', `${asset.fileName ?? 'File'} exceeds the 10 MB limit.`);
        continue;
      }
      newFiles.push({
        uri: asset.uri,
        name: asset.fileName ?? `image_${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      });
    }

    setPickedFiles((prev) => [...prev, ...newFiles].slice(0, MAX_ATTACHMENTS));
  }, [pickedFiles.length]);

  const removeFile = useCallback((index: number) => {
    setPickedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const canSend = (text.trim().length > 0 || pickedFiles.length > 0) && !isSending && !disabled;

  return (
    <View>
      {/* Attachment preview strip */}
      {pickedFiles.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={st.previewStrip}
          contentContainerStyle={st.previewContent}
        >
          {pickedFiles.map((file, i) => (
            <View key={file.uri} style={st.previewItem}>
              {file.type.startsWith('image/') ? (
                <Image source={{ uri: file.uri }} style={st.previewImage} />
              ) : (
                <View style={st.previewFile}>
                  <Text style={st.previewFileIcon}>📄</Text>
                </View>
              )}
              <TouchableOpacity style={st.previewRemove} onPress={() => removeFile(i)}>
                <Text style={st.previewRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={st.container}>
        {/* Attachment button */}
        <TouchableOpacity style={st.iconBtn} onPress={pickImages} disabled={disabled || isSending}>
          <Text style={st.iconEmoji}>📎</Text>
          {pickedFiles.length > 0 && (
            <View style={st.attachBadge}>
              <Text style={st.attachBadgeText}>{pickedFiles.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Text input */}
        <TextInput
          style={[st.input, { height: Math.max(44, Math.min(inputHeight, 120)) }]}
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

        {/* Send button */}
        <TouchableOpacity
          style={st.sendBtnWrap}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={canSend ? ['#312E81', '#4F46E5'] : ['#E8E8F0', '#E8E8F0']}
            style={st.sendBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isSending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[st.sendIcon, !canSend && st.sendIconDisabled]}>➤</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8F0',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    position: 'relative',
  },
  iconEmoji: { fontSize: 18 },
  attachBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  attachBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.xl,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 11 : 8,
    paddingBottom: Platform.OS === 'ios' ? 11 : 8,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 120,
    fontFamily: FONTS.regular,
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  sendBtnWrap: { borderRadius: 20, overflow: 'hidden', marginBottom: 2 },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { color: '#fff', fontSize: 16, marginLeft: 2 },
  sendIconDisabled: { color: COLORS.textMuted },
  previewStrip: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8F0',
    maxHeight: 88,
  },
  previewContent: { paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  previewItem: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  previewImage: { width: 68, height: 68, borderRadius: RADIUS.md },
  previewFile: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFileIcon: { fontSize: 28 },
  previewRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRemoveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
