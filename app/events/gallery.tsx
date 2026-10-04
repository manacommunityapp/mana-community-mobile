import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Alert, Modal, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { eventGalleryService } from '@/services/eventGalleryService';
import { mediaService } from '@/services/mediaService';
import { useAppBack } from '@/hooks/useAppBack';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import type { EventGalleryItemResponse } from '@/types/events';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 40) / 2;

export default function EventGalleryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const eventId = Number(id);

  const [selectedPhoto, setSelectedPhoto] = useState<EventGalleryItemResponse | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);

  const { goBack } = useAppBack({
    fallbackRoute: id ? `/events/${id}` : '/events',
    onBeforeBack: () => {
      if (selectedPhoto) {
        setSelectedPhoto(null);
        return true;
      }
    },
  });

  const { data: albums = [] } = useQuery({
    queryKey: ['event-albums', eventId],
    queryFn: () => eventGalleryService.getAlbums(eventId),
    enabled: !!eventId,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['event-gallery', eventId, selectedAlbum],
    queryFn: () => eventGalleryService.getByEvent(eventId, selectedAlbum),
    enabled: !!eventId,
  });

  const handlePickAndUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setIsUploading(true);
        const asset = result.assets[0];
        const filename = asset.uri.split('/').pop() || 'event_photo.jpg';
        const uploaded = await mediaService.uploadMedia(
          {
            uri: asset.uri,
            name: filename,
            type: asset.mimeType || 'image/jpeg',
          },
          {
            module: 'EVENT',
            moduleId: String(eventId),
            communityId: 1,
            mediaType: 'IMAGE',
          }
        );
        await eventGalleryService.create({
          eventId,
          url: uploaded.url,
          mediaId: uploaded.id,
          mediaType: 'IMAGE',
          albumName: selectedAlbum || 'Highlights',
        });
        qc.invalidateQueries({ queryKey: ['event-gallery', eventId] });
        Alert.alert('Uploaded!', 'Your photo has been added to the event gallery.');
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.message || 'Could not upload photo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Event Gallery</Text>
        <TouchableOpacity onPress={handlePickAndUpload} disabled={isUploading} style={s.uploadBtn}>
          {isUploading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="cloud-upload-outline" size={22} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Album Filters */}
      {albums.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.albumsScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
          <TouchableOpacity
            style={[s.albumChip, !selectedAlbum && s.albumChipActive]}
            onPress={() => setSelectedAlbum(undefined)}
          >
            <Text style={[s.albumText, !selectedAlbum && s.albumTextActive]}>All Photos</Text>
          </TouchableOpacity>
          {albums.map((album) => (
            <TouchableOpacity
              key={album}
              style={[s.albumChip, selectedAlbum === album && s.albumChipActive]}
              onPress={() => setSelectedAlbum(album)}
            >
              <Text style={[s.albumText, selectedAlbum === album && s.albumTextActive]}>{album}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : items.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="images-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.emptyTitle}>No Photos in Gallery</Text>
          <Text style={s.emptySub}>Tap the upload button above to add the first memory!</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.grid}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={s.photoCard}
              onPress={() => setSelectedPhoto(item)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: item.url || item.thumbnailUrl || '' }} style={s.photoImage} />
              {item.caption && <Text style={s.photoCaption} numberOfLines={1}>{item.caption}</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Full-Screen Preview Modal */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade">
        <View style={s.previewOverlay}>
          <TouchableOpacity style={s.closeBtn} onPress={() => setSelectedPhoto(null)}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto.url }}
              style={s.previewImage}
              resizeMode="contain"
            />
          )}
          {selectedPhoto?.caption && (
            <View style={s.previewCaptionBox}>
              <Text style={s.previewCaptionText}>{selectedPhoto.caption}</Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', fontWeight: 'bold', color: COLORS.text },
  uploadBtn: { padding: 6 },
  albumsScroll: { maxHeight: 44, marginVertical: 8 },
  albumChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: 8,
  },
  albumChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  albumText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  albumTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 14 },
  photoCard: {
    width: ITEM_WIDTH, height: ITEM_WIDTH, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOWS.sm,
  },
  photoImage: { width: '100%', height: '100%' },
  photoCaption: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, padding: 4, textAlign: 'center',
  },
  emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
  previewImage: { width: '100%', height: '80%' },
  previewCaptionBox: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: 10 },
  previewCaptionText: { color: '#fff', fontSize: 13, textAlign: 'center' },
});
