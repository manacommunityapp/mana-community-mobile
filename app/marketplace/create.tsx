import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Image, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceService } from '@/services/marketplaceService';
import { COLORS } from '@/constants/config';
import type { MarketplaceCategory, ListingCondition } from '@/types/api';

const MAX_IMAGES = 5;

const CATEGORIES: { key: MarketplaceCategory; label: string; emoji: string }[] = [
  { key: 'FURNITURE',   label: 'Furniture',   emoji: '🛋️' },
  { key: 'ELECTRONICS', label: 'Electronics', emoji: '📱' },
  { key: 'CLOTHING',    label: 'Clothing',    emoji: '👕' },
  { key: 'BOOKS',       label: 'Books',       emoji: '📚' },
  { key: 'SPORTS',      label: 'Sports',      emoji: '🏋️' },
  { key: 'KITCHEN',     label: 'Kitchen',     emoji: '🍳' },
  { key: 'GARDEN',      label: 'Garden',      emoji: '🌱' },
  { key: 'SERVICES',    label: 'Services',    emoji: '🔧' },
  { key: 'OTHER',       label: 'Other',       emoji: '📦' },
];

const CONDITIONS: { key: ListingCondition; label: string; desc: string }[] = [
  { key: 'NEW',      label: 'New',       desc: 'Unused, with tags/box' },
  { key: 'LIKE_NEW', label: 'Like New',  desc: 'Used once or twice' },
  { key: 'GOOD',     label: 'Good',      desc: 'Minor wear, fully functional' },
  { key: 'FAIR',     label: 'Fair',      desc: 'Visible wear, works fine' },
  { key: 'POOR',     label: 'Poor',      desc: 'Heavy wear or minor damage' },
];

interface LocalImage {
  uri:      string;
  uploaded: boolean;
  url?:     string;    // CDN URL after upload
  error?:   boolean;
}

// ── Photo grid ─────────────────────────────────────────────────
function PhotoGrid({
  images,
  onAdd,
  onRemove,
  uploading,
}: {
  images:    LocalImage[];
  onAdd:     () => void;
  onRemove:  (i: number) => void;
  uploading: boolean;
}) {
  return (
    <View style={pg.grid}>
      {images.map((img, i) => (
        <View key={img.uri} style={pg.thumb}>
          <Image source={{ uri: img.uri }} style={pg.image} resizeMode="cover" />
          {!img.uploaded && (
            <View style={pg.overlay}>
              {img.error
                ? <Text style={pg.errorText}>✕</Text>
                : <ActivityIndicator size="small" color="#fff" />
              }
            </View>
          )}
          {i === 0 && <View style={pg.mainBadge}><Text style={pg.mainBadgeText}>Main</Text></View>}
          <TouchableOpacity style={pg.removeBtn} onPress={() => onRemove(i)}>
            <Text style={pg.removeBtnText}>×</Text>
          </TouchableOpacity>
        </View>
      ))}
      {images.length < MAX_IMAGES && (
        <TouchableOpacity style={pg.addBtn} onPress={onAdd} disabled={uploading}>
          <Text style={pg.addBtnEmoji}>📷</Text>
          <Text style={pg.addBtnText}>Add Photo</Text>
          <Text style={pg.addBtnSub}>{images.length}/{MAX_IMAGES}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const pg = StyleSheet.create({
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb:         { width: 96, height: 96, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  image:         { width: '100%', height: '100%' },
  overlay:       { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  errorText:     { color: '#EF4444', fontSize: 22, fontWeight: '800' },
  mainBadge:     { position: 'absolute', bottom: 4, left: 4, backgroundColor: COLORS.primary, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  mainBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  removeBtn:     { position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: '#fff', fontSize: 16, lineHeight: 20, fontWeight: '700' },
  addBtn:        { width: 96, height: 96, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: '#F9FAFB' },
  addBtnEmoji:   { fontSize: 22 },
  addBtnText:    { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  addBtnSub:     { fontSize: 10, color: COLORS.textMuted },
});

// ── Main screen ────────────────────────────────────────────────
export default function CreateListingScreen() {
  const router  = useRouter();
  const qc      = useQueryClient();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEdit  = !!editId;

  // Load existing listing for edit mode
  const { data: existing } = useQuery({
    queryKey:  ['listing', editId],
    queryFn:   () => marketplaceService.getListing(Number(editId)),
    enabled:   isEdit,
  });

  const [title,        setTitle]       = useState('');
  const [description,  setDescription] = useState('');
  const [price,        setPrice]       = useState('');
  const [isFree,       setIsFree]      = useState(false);
  const [isNegotiable, setNegotiable]  = useState(false);
  const [category,     setCategory]    = useState<MarketplaceCategory>('OTHER');
  const [condition,    setCondition]   = useState<ListingCondition>('GOOD');
  const [images,       setImages]      = useState<LocalImage[]>([]);
  const [uploading,    setUploading]   = useState(false);

  // Pre-fill form from existing listing
  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setDescription(existing.description);
    setPrice(String(existing.price));
    setIsFree(existing.isFree);
    setNegotiable(existing.isNegotiable);
    setCategory(existing.category);
    setCondition(existing.condition);
    setImages(existing.imageUrls.map((url) => ({ uri: url, uploaded: true, url })));
  }, [existing]);

  // Pick photos
  const handlePickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.8,
    });
    if (result.canceled) return;

    const newImages: LocalImage[] = result.assets.map((a) => ({
      uri: a.uri, uploaded: false,
    }));
    setImages((prev) => [...prev, ...newImages].slice(0, MAX_IMAGES));

    // Upload each image
    setUploading(true);
    for (const img of newImages) {
      const ext  = img.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      try {
        const url = await marketplaceService.uploadImage(img.uri, mime);
        setImages((prev) =>
          prev.map((p) => p.uri === img.uri ? { ...p, uploaded: true, url } : p)
        );
      } catch {
        setImages((prev) =>
          prev.map((p) => p.uri === img.uri ? { ...p, uploaded: true, error: true } : p)
        );
      }
    }
    setUploading(false);
  }, [images.length]);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      const uploadedUrls = images.filter((i) => i.uploaded && i.url && !i.error).map((i) => i.url!);
      const payload = {
        title:        title.trim(),
        description:  description.trim(),
        price:        isFree ? 0 : Number(price.replace(/[^0-9]/g, '')),
        isFree,
        isNegotiable,
        category,
        condition,
        imageUrls:    uploadedUrls,
      };
      return isEdit
        ? marketplaceService.updateListing(Number(editId), payload)
        : marketplaceService.createListing(payload);
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['marketplace'] });
      qc.invalidateQueries({ queryKey: ['listing', editId] });
      router.replace(`/marketplace/${saved.id}`);
    },
    onError: () => Alert.alert('Error', 'Failed to save listing. Please try again.'),
  });

  const canSave =
    title.trim().length > 0 &&
    (isFree || price.trim().length > 0) &&
    !uploading &&
    !saveMutation.isPending;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.title}>{isEdit ? 'Edit Listing' : 'New Listing'}</Text>
        <TouchableOpacity onPress={() => saveMutation.mutate()} disabled={!canSave}>
          {saveMutation.isPending
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Text style={[s.save, !canSave && s.saveDisabled]}>
                {isEdit ? 'Update' : 'Post'}
              </Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Photos */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Photos</Text>
            <Text style={s.sectionSub}>First photo is the main image. Up to {MAX_IMAGES} photos.</Text>
            <PhotoGrid
              images={images}
              onAdd={handlePickPhoto}
              onRemove={handleRemoveImage}
              uploading={uploading}
            />
          </View>

          {/* Details */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Details</Text>
            <View style={s.field}>
              <Text style={s.label}>Title *</Text>
              <TextInput
                style={s.input}
                value={title}
                onChangeText={setTitle}
                placeholder="What are you selling?"
                placeholderTextColor={COLORS.textMuted}
                maxLength={100}
              />
              <Text style={s.counter}>{title.length}/100</Text>
            </View>
            <View style={s.field}>
              <Text style={s.label}>Description</Text>
              <TextInput
                style={[s.input, s.textarea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the item — age, defects, accessories included…"
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={s.counter}>{description.length}/500</Text>
            </View>
          </View>

          {/* Pricing */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Pricing</Text>
            <View style={s.toggleRow}>
              <View>
                <Text style={s.toggleLabel}>🎁 List as Free</Text>
                <Text style={s.toggleSub}>Give it away to a neighbour</Text>
              </View>
              <Switch value={isFree} onValueChange={setIsFree} trackColor={{ false: COLORS.border, true: COLORS.success }} thumbColor="#fff" />
            </View>
            {!isFree && (
              <>
                <View style={s.field}>
                  <Text style={s.label}>Price (₹) *</Text>
                  <View style={s.priceInputWrap}>
                    <Text style={s.pricePrefix}>₹</Text>
                    <TextInput
                      style={s.priceInput}
                      value={price}
                      onChangeText={setPrice}
                      placeholder="0"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="number-pad"
                      maxLength={8}
                    />
                  </View>
                </View>
                <View style={s.toggleRow}>
                  <View>
                    <Text style={s.toggleLabel}>Price Negotiable</Text>
                    <Text style={s.toggleSub}>Buyers can make offers</Text>
                  </View>
                  <Switch value={isNegotiable} onValueChange={setNegotiable} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor="#fff" />
                </View>
              </>
            )}
          </View>

          {/* Category */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Category *</Text>
            <View style={s.optionGrid}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[s.optionChip, category === c.key && s.optionChipActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text style={s.optionEmoji}>{c.emoji}</Text>
                  <Text style={[s.optionLabel, category === c.key && s.optionLabelActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Condition */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Condition *</Text>
            {CONDITIONS.map((c) => (
              <TouchableOpacity
                key={c.key}
                style={[s.condRow, condition === c.key && s.condRowActive]}
                onPress={() => setCondition(c.key)}
              >
                <View style={[s.radio, condition === c.key && s.radioActive]}>
                  {condition === c.key && <View style={s.radioDot} />}
                </View>
                <View>
                  <Text style={[s.condLabel, condition === c.key && s.condLabelActive]}>{c.label}</Text>
                  <Text style={s.condDesc}>{c.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cancel:          { fontSize: 16, color: COLORS.textMuted },
  title:           { fontSize: 17, fontWeight: '700', color: COLORS.text },
  save:            { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  saveDisabled:    { color: COLORS.textMuted },
  scroll:          { padding: 16, gap: 16 },
  section:         { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle:    { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionSub:      { fontSize: 12, color: COLORS.textMuted, marginTop: -6 },
  field:           { gap: 5 },
  label:           { fontSize: 14, fontWeight: '600', color: COLORS.text },
  input:           { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface },
  textarea:        { minHeight: 100, paddingTop: 12 },
  counter:         { fontSize: 11, color: COLORS.textMuted, textAlign: 'right' },
  toggleRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toggleLabel:     { fontSize: 15, fontWeight: '600', color: COLORS.text },
  toggleSub:       { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  priceInputWrap:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.surface, overflow: 'hidden' },
  pricePrefix:     { fontSize: 18, fontWeight: '700', color: COLORS.text, paddingLeft: 14, paddingRight: 4, paddingVertical: 12 },
  priceInput:      { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.text, paddingVertical: 12, paddingRight: 14 },
  optionGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.border },
  optionChipActive:{ backgroundColor: '#EEF2FF', borderColor: COLORS.primary },
  optionEmoji:     { fontSize: 15 },
  optionLabel:     { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  optionLabelActive: { color: COLORS.primary, fontWeight: '700' },
  condRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  condRowActive:   { backgroundColor: '#EEF2FF', borderColor: COLORS.primary },
  radio:           { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  radioActive:     { borderColor: COLORS.primary },
  radioDot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  condLabel:       { fontSize: 15, fontWeight: '600', color: COLORS.text },
  condLabelActive: { color: COLORS.primary },
  condDesc:        { fontSize: 12, color: COLORS.textMuted },
});
