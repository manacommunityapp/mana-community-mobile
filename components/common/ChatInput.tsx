import { useState, useRef, useCallback } from 'react';
import {
  View, TextInput, TouchableOpacity,
  StyleSheet, Text, Platform, ActivityIndicator,
  Image, ScrollView, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '@/constants/config';
import type { PickedFile } from '@/services/chatService';

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  onSendAttachments?: (files: PickedFile[], text?: string) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  isSending?: boolean;
  disabled?: boolean;
}

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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
          style={styles.previewStrip}
          contentContainerStyle={styles.previewContent}
        >
          {pickedFiles.map((file, i) => (
            <View key={file.uri} style={styles.previewItem}>
              {file.type.startsWith('image/') ? (
                <Image source={{ uri: file.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.previewFile}>
                  <Text style={styles.previewFileIcon}>📄</Text>
                </View>
              )}
              <TouchableOpacity style={styles.previewRemove} onPress={() => removeFile(i)}>
                <Text style={styles.previewRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.container}>
        {/* Attachment button */}
        <TouchableOpacity style={styles.iconBtn} onPress={pickImages} disabled={disabled || isSending}>
          <Text style={[styles.iconText, pickedFiles.length > 0 && styles.iconActive]}>📎</Text>
          {pickedFiles.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pickedFiles.length}</Text>
            </View>
          )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8 },
  iconBtn:         { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  iconText:        { fontSize: 20 },
  iconActive:      { opacity: 1 },
  badge:           { position: 'absolute', top: -2, right: -2, backgroundColor: COLORS.primary, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText:       { color: '#fff', fontSize: 10, fontFamily: 'DMSans-Bold', fontWeight: '700' },
  input:           { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 22, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 11 : 8, paddingBottom: Platform.OS === 'ios' ? 11 : 8, fontSize: 15, color: COLORS.text, maxHeight: 120 },
  sendBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendIcon:        { color: '#fff', fontSize: 16, marginLeft: 2 },
  previewStrip:    { backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, maxHeight: 88 },
  previewContent:  { paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  previewItem:     { width: 68, height: 68, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  previewImage:    { width: 68, height: 68, borderRadius: 10 },
  previewFile:     { width: 68, height: 68, alignItems: 'center', justifyContent: 'center' },
  previewFileIcon: { fontSize: 28 },
  previewRemove:   { position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  previewRemoveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
