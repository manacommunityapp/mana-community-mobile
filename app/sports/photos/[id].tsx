import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Modal, TextInput, Alert, ActivityIndicator,
  Dimensions, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { sportsService } from '@/services/sportsService';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants/config';
import { formatDistanceToNow } from 'date-fns';
import type { MatchPhotoDto } from '@/types/api';

const { width } = Dimensions.get('window');
const THUMB  = (width - 4) / 3;

export default function MatchPhotoGalleryScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const qc        = useQueryClient();
  const { user }  = useAuth();

  const [fullscreen,  setFullscreen]  = useState<MatchPhotoDto | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [caption,     setCaption]     = useState('');
  const [captionFor,  setCaptionFor]  = useState<string | null>(null);  // local URI pending upload

  const { data: photos = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['match-photos', id],
    queryFn:  () => sportsService.getMatchPhotos(Number(id)),
  });

  const likeMutation = useMutation({
    mutationFn: (photoId: number) => sportsService.togglePhotoLike(Number(id), photoId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['match-photos', id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (photoId: number) => sportsService.deleteMatchPhoto(Number(id), photoId),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['match-photos', id] }); setFullscreen(null); },
  });

  async function pickAndUpload() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (result.canceled) return;
    setCaptionFor(result.assets[0].uri);
    setCaption('');
  }

  async function confirmUpload() {
    if (!captionFor) return;
    setUploading(true);
    try {
      await sportsService.uploadMatchPhoto(Number(id), captionFor, caption || undefined);
      qc.invalidateQueries({ queryKey: ['match-photos', id] });
      setCaptionFor(null);
      setCaption('');
    } catch (err: any) {
      Alert.alert('Upload failed', err?.response?.data?.message ?? 'Try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Match Photos</Text>
        <TouchableOpacity style={s.uploadBtn} onPress={pickAndUpload}>
          <Text style={s.uploadBtnText}>📷 Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(p) => String(p.id)}
          numColumns={3}
          columnWrapperStyle={{ gap: 2 }}
          contentContainerStyle={{ gap: 2 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setFullscreen(item)} activeOpacity={0.85}>
              <Image source={{ uri: item.imageUrl }} style={{ width: THUMB, height: THUMB }} resizeMode="cover" />
              {item.likeCount > 0 && (
                <View style={s.thumbLike}>
                  <Text style={s.thumbLikeText}>❤️ {item.likeCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>📸</Text>
              <Text style={s.emptyTitle}>No photos yet</Text>
              <Text style={s.emptyText}>Be the first to share a match memory.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={pickAndUpload}>
                <Text style={s.emptyBtnText}>Upload Photo</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Caption modal — fires before upload */}
      <Modal visible={!!captionFor} transparent animationType="slide" onRequestClose={() => setCaptionFor(null)}>
        <KeyboardAvoidingView style={s.captionModal} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.captionSheet}>
            <Text style={s.captionTitle}>Add caption (optional)</Text>
            {captionFor && (
              <Image source={{ uri: captionFor }} style={s.captionPreview} resizeMode="cover" />
            )}
            <TextInput
              style={s.captionInput}
              value={caption}
              onChangeText={setCaption}
              placeholder="What's happening in this photo?"
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={120}
              autoFocus
            />
            <View style={s.captionActions}>
              <TouchableOpacity style={s.captionCancel} onPress={() => { setCaptionFor(null); setCaption(''); }}>
                <Text style={s.captionCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.captionUpload, uploading && { opacity: 0.6 }]} onPress={confirmUpload} disabled={uploading}>
                {uploading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.captionUploadText}>Upload</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Fullscreen viewer */}
      <Modal visible={!!fullscreen} transparent animationType="fade" onRequestClose={() => setFullscreen(null)}>
        <View style={s.fullBg}>
          <TouchableOpacity style={s.fullClose} onPress={() => setFullscreen(null)}>
            <Text style={s.fullCloseText}>✕</Text>
          </TouchableOpacity>

          {fullscreen && (
            <>
              <Image source={{ uri: fullscreen.imageUrl }} style={s.fullImg} resizeMode="contain" />

              <View style={s.fullMeta}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fullUploader}>{fullscreen.uploaderName}</Text>
                  {fullscreen.caption && <Text style={s.fullCaption}>{fullscreen.caption}</Text>}
                  <Text style={s.fullTime}>
                    {formatDistanceToNow(new Date(fullscreen.createdAt), { addSuffix: true })}
                  </Text>
                </View>

                <View style={s.fullActions}>
                  <TouchableOpacity onPress={() => likeMutation.mutate(fullscreen.id)} style={s.likeBtn}>
                    <Text style={s.likeText}>{fullscreen.isLiked ? '❤️' : '🤍'} {fullscreen.likeCount}</Text>
                  </TouchableOpacity>
                  {fullscreen.uploadedById === user?.id && (
                    <TouchableOpacity
                      onPress={() => Alert.alert('Delete Photo', 'Remove this photo?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(fullscreen.id) },
                      ])}
                      style={s.deleteBtn}
                    >
                      <Text style={s.deleteText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#000' },
  header:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:              { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:             { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
  uploadBtn:         { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  uploadBtnText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  thumbLike:         { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  thumbLikeText:     { fontSize: 10, color: '#fff', fontWeight: '600' },
  empty:             { alignItems: 'center', paddingTop: 80, gap: 10, backgroundColor: COLORS.background, flex: 1 },
  emptyEmoji:        { fontSize: 52 },
  emptyTitle:        { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyText:         { fontSize: 14, color: COLORS.textMuted },
  emptyBtn:          { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText:      { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Caption modal
  captionModal:      { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  captionSheet:      { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  captionTitle:      { fontSize: 16, fontWeight: '700', color: COLORS.text },
  captionPreview:    { width: '100%', height: 160, borderRadius: 12 },
  captionInput:      { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.text, minHeight: 70 },
  captionActions:    { flexDirection: 'row', gap: 10 },
  captionCancel:     { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  captionCancelText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  captionUpload:     { flex: 2, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  captionUploadText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Fullscreen
  fullBg:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  fullClose:         { position: 'absolute', top: 50, right: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  fullCloseText:     { color: '#fff', fontSize: 18, fontWeight: '700' },
  fullImg:           { width: '100%', height: '75%' },
  fullMeta:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  fullUploader:      { fontSize: 14, fontWeight: '700', color: '#fff' },
  fullCaption:       { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  fullTime:          { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  fullActions:       { flexDirection: 'row', gap: 10, alignItems: 'center' },
  likeBtn:           { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  likeText:          { color: '#fff', fontSize: 14, fontWeight: '600' },
  deleteBtn:         { backgroundColor: 'rgba(255,60,60,0.25)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8 },
  deleteText:        { fontSize: 16 },
});
