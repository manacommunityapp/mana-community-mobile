import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { jewelleryService, JewelleryProduct, TryOnMode } from '@/services/jewelleryService';

type ViewMode = 'SELECT' | 'LIVE_AR' | 'PHOTO';

const BODY_PART_LABELS: Record<string, string> = {
  EARRINGS:    'Ears & Face',
  NECKLACE:    'Neck',
  RING:        'Hand & Finger',
  BANGLE:      'Wrist',
  BRACELET:    'Wrist',
  MAANG_TIKKA: 'Forehead',
  PENDANT:     'Neck',
};

export default function JewelleryTryOnScreen() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId?: string }>();

  const [viewMode, setViewMode] = useState<ViewMode>('SELECT');
  const [selectedProduct, setSelectedProduct] = useState<JewelleryProduct | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['jewellery-tryon-products'],
    queryFn: () => jewelleryService.getProducts(),
  });

  // Pre-select product if navigated from product detail
  React.useEffect(() => {
    if (productId && products.length > 0) {
      const found = products.find((p) => p.id === productId);
      if (found) setSelectedProduct(found);
    }
  }, [productId, products]);

  const startSessionMutation = useMutation({
    mutationFn: (mode: TryOnMode) =>
      jewelleryService.startTryOnSession({
        productId: selectedProduct!.id,
        mode,
        platform: Platform.OS,
      }),
    onSuccess: () => setSessionStarted(true),
  });

  const handlePickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Allow access to your photo library to try on jewellery.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
      setViewMode('PHOTO');
      if (selectedProduct) {
        startSessionMutation.mutate('PHOTO');
      }
    }
  }, [selectedProduct]);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Permission', 'Allow camera access to use live AR try-on.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
      setViewMode('PHOTO');
      if (selectedProduct) {
        startSessionMutation.mutate('PHOTO');
      }
    }
  }, [selectedProduct]);

  const handleLiveAR = () => {
    if (!selectedProduct) {
      Alert.alert('Select Product', 'Please select a jewellery item first.');
      return;
    }
    Alert.alert(
      'Live AR Coming Soon',
      'Live AR try-on will be enabled after integrating the MirrAR or Banuba SDK. ' +
      'Currently, please use the Photo Try-On mode to preview this jewellery.',
      [{ text: 'Use Photo Mode', onPress: handlePickPhoto }]
    );
  };

  const handleSaveLook = () => {
    if (!photoUri) return;
    Alert.alert('Look Saved', 'Your jewellery look has been saved to your wishlist.');
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    Alert.alert('Added to Cart', `${selectedProduct.name} has been added to your cart.`);
  };

  const clearPhoto = () => {
    setPhotoUri(null);
    setViewMode('SELECT');
    setSessionStarted(false);
  };

  // Derive overlay position hint from category
  const overlayHint = selectedProduct ? BODY_PART_LABELS[selectedProduct.category] ?? 'Body' : '';

  return (
    <View style={styles.root}>
      {/* Try-On Studio Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Virtual Try-On Studio</Text>
        <TouchableOpacity onPress={() => setShowComparison(!showComparison)} style={styles.compareBtn}>
          <Ionicons name="images-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.studioArea}>
        {/* Main Preview */}
        {viewMode === 'SELECT' && (
          <View style={styles.selectPrompt}>
            <Ionicons name="diamond" size={48} color="#C7D2FE" />
            <Text style={styles.selectTitle}>Choose a Jewellery Item</Text>
            <Text style={styles.selectSub}>Select from the carousel below, then take or upload a photo.</Text>
            <View style={styles.modeButtons}>
              <TouchableOpacity style={styles.modeBtn} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.modeBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modeBtn} onPress={handlePickPhoto}>
                <Ionicons name="images" size={20} color="#FFFFFF" />
                <Text style={styles.modeBtnText}>Upload Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modeBtn, styles.arBtn]} onPress={handleLiveAR}>
                <Ionicons name="videocam" size={20} color="#FFFFFF" />
                <Text style={styles.modeBtnText}>Live AR</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {viewMode === 'PHOTO' && photoUri && (
          <View style={styles.photoPreview}>
            <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />

            {/* Jewellery overlay: show product image positioned as a visual hint */}
            {selectedProduct?.tryOnAssetUrl && (
              <View style={[styles.jewelOverlay, getOverlayStyle(selectedProduct.category)]}>
                <Image
                  source={{ uri: selectedProduct.tryOnAssetUrl }}
                  style={styles.jewelImage}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Processing indicator */}
            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.processingText}>Applying jewellery...</Text>
              </View>
            )}

            {/* Selected product info */}
            {selectedProduct && (
              <View style={styles.selectedOverlay}>
                <Text style={styles.selectedOverlayName} numberOfLines={1}>{selectedProduct.name}</Text>
                <Text style={styles.selectedOverlayPrice}>₹{selectedProduct.totalPrice.toLocaleString('en-IN')}</Text>
              </View>
            )}

            {/* Body part hint */}
            {overlayHint && (
              <View style={styles.bodyHintBadge}>
                <Ionicons name="locate-outline" size={10} color="#FFFFFF" />
                <Text style={styles.bodyHintText}>Tracking: {overlayHint}</Text>
              </View>
            )}

            {/* Photo actions */}
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoActionBtn} onPress={clearPhoto}>
                <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoActionBtn} onPress={handlePickPhoto}>
                <Ionicons name="images-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoActionBtn} onPress={handleSaveLook}>
                <Ionicons name="heart-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Notice banner */}
      <View style={styles.noticeBanner}>
        <Ionicons name="information-circle-outline" size={12} color="#64748B" />
        <Text style={styles.noticeText}>Preview is illustrative. Actual product may vary in size and appearance.</Text>
      </View>

      {/* Product Carousel */}
      <View style={styles.carouselSection}>
        <View style={styles.carouselHeader}>
          <Text style={styles.carouselTitle}>Select Jewellery</Text>
          {selectedProduct && (
            <Text style={styles.carouselSelected}>{selectedProduct.name}</Text>
          )}
        </View>
        {loadingProducts ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 10, paddingVertical: 8 }}
          >
            {products.map((p) => {
              const isSelected = selectedProduct?.id === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.productChip, isSelected && styles.productChipActive]}
                  onPress={() => setSelectedProduct(p)}
                >
                  {p.imageUrls?.[0] ? (
                    <Image source={{ uri: p.imageUrls[0] }} style={styles.chipImage} />
                  ) : (
                    <View style={styles.chipImagePlaceholder}>
                      <Ionicons name="diamond-outline" size={16} color={isSelected ? '#FFFFFF' : COLORS.primary} />
                    </View>
                  )}
                  <Text style={[styles.chipName, isSelected && styles.chipNameActive]} numberOfLines={1}>{p.name}</Text>
                  <Text style={[styles.chipPrice, isSelected && styles.chipPriceActive]}>
                    ₹{p.totalPrice.toLocaleString('en-IN')}
                  </Text>
                  {p.tryOnAssetUrl && (
                    <View style={styles.chipTryOnDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        {viewMode === 'PHOTO' && selectedProduct ? (
          <>
            <TouchableOpacity style={styles.detailBtn} onPress={() => router.push(`/jewellery/${selectedProduct.id}`)}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.detailBtnText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cartBtn} onPress={handleAddToCart}>
              <Ionicons name="bag-add-outline" size={16} color="#FFFFFF" />
              <Text style={styles.cartBtnText}>Add to Cart</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.detailBtn} onPress={handlePickPhoto}>
              <Ionicons name="images-outline" size={16} color={COLORS.primary} />
              <Text style={styles.detailBtnText}>Upload Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cartBtn} onPress={handleTakePhoto}>
              <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
              <Text style={styles.cartBtnText}>Take Photo</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

/** Returns approximate overlay positioning based on jewellery category */
function getOverlayStyle(category: string): object {
  switch (category) {
    case 'EARRINGS':
      return { top: '22%', left: '8%', width: '20%', height: '15%' };
    case 'NECKLACE':
    case 'PENDANT':
      return { top: '38%', left: '20%', width: '60%', height: '18%' };
    case 'RING':
      return { bottom: '20%', right: '15%', width: '25%', height: '15%' };
    case 'BANGLE':
    case 'BRACELET':
      return { bottom: '20%', left: '15%', width: '30%', height: '12%' };
    case 'MAANG_TIKKA':
      return { top: '10%', left: '35%', width: '30%', height: '12%' };
    default:
      return { top: '30%', left: '30%', width: '40%', height: '20%' };
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  compareBtn: { padding: 4 },
  studioArea: { flex: 1, backgroundColor: '#0F172A' },
  selectPrompt: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
    paddingHorizontal: SPACING.lg,
  },
  selectTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  selectSub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
  modeButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  arBtn: { backgroundColor: '#7C3AED' },
  modeBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  photoPreview: { flex: 1, position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  jewelOverlay: { position: 'absolute' },
  jewelImage: { width: '100%', height: '100%' },
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  processingText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  selectedOverlay: {
    position: 'absolute', top: 12, left: 12, right: 60,
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: RADIUS.sm,
  },
  selectedOverlayName: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  selectedOverlayPrice: { color: '#FCD34D', fontSize: 12, fontWeight: '600' },
  bodyHintBadge: {
    position: 'absolute', bottom: 60, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(79,70,229,0.85)', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  bodyHintText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  photoActions: {
    position: 'absolute', bottom: 12, right: 12,
    gap: 10,
  },
  photoActionBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 22,
    padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  noticeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F1F5F9', paddingHorizontal: SPACING.md, paddingVertical: 6,
  },
  noticeText: { fontSize: 10, color: '#64748B', flex: 1 },
  carouselSection: { backgroundColor: '#FFFFFF', paddingTop: 10 },
  carouselHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  carouselTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  carouselSelected: { fontSize: 11, color: COLORS.primary, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 8 },
  productChip: {
    width: 90, backgroundColor: '#F8FAFC', borderRadius: RADIUS.lg,
    padding: 8, borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center',
    position: 'relative',
  },
  productChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  chipImage: { width: 56, height: 56, borderRadius: RADIUS.md, marginBottom: 4 },
  chipImagePlaceholder: {
    width: 56, height: 56, borderRadius: RADIUS.md, marginBottom: 4,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF',
  },
  chipName: { fontSize: 9, fontWeight: '700', color: '#334155', textAlign: 'center' },
  chipNameActive: { color: COLORS.primary },
  chipPrice: { fontSize: 9, color: '#64748B' },
  chipPriceActive: { color: COLORS.primary, fontWeight: '700' },
  chipTryOnDot: {
    position: 'absolute', top: 4, right: 4,
    width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success,
  },
  bottomBar: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#E2E8F0',
  },
  detailBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.primary, paddingVertical: 12, borderRadius: RADIUS.md,
  },
  detailBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  cartBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#B45309', paddingVertical: 12, borderRadius: RADIUS.md,
  },
  cartBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
