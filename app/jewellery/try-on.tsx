import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, Alert, ActivityIndicator, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  jewelleryService,
  JewelleryProduct,
  TryOnMode,
} from '@/services/jewelleryService';

// ── Types ──────────────────────────────────────────────────────────────────
type ViewMode = 'SELECT' | 'UPLOADING' | 'PROCESSING' | 'RESULT' | 'ERROR';

const BODY_PART_LABELS: Record<string, string> = {
  EARRINGS:    'Ears & Face',
  NECKLACE:    'Neck',
  RING:        'Hand & Finger',
  BANGLE:      'Wrist',
  BRACELET:    'Wrist',
  MAANG_TIKKA: 'Forehead',
  PENDANT:     'Neck',
};

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20; // 60 s timeout

// ── Component ──────────────────────────────────────────────────────────────
export default function JewelleryTryOnScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { productId } = useLocalSearchParams<{ productId?: string }>();

  const [viewMode, setViewMode] = useState<ViewMode>('SELECT');
  const [selectedProduct, setSelectedProduct] = useState<JewelleryProduct | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [consentVisible, setConsentVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<'camera' | 'gallery' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);

  // Cleanup polling interval on unmount
  React.useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['jewellery-tryon-products'],
    queryFn: () => jewelleryService.getProducts(),
  });

  const tryOnEligibleProducts = React.useMemo(() => {
    const withArAsset = products.filter((p) => p.tryOnAssetUrl);
    if (withArAsset.length > 0) return withArAsset;
    return products.filter((p) => (p.imageUrls?.length ?? 0) > 0);
  }, [products]);

  React.useEffect(() => {
    if (productId && products.length > 0) {
      const found = products.find((p) => String(p.id) === String(productId));
      if (found) setSelectedProduct(found);
    }
  }, [productId, products]);

  // ── Wishlist ──────────────────────────────────────────────────────────────
  const wishlistMutation = useMutation({
    mutationFn: () => jewelleryService.addToWishlist(selectedProduct!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jewellery-wishlist'] });
      Alert.alert('Saved!', `${selectedProduct?.name} added to your wishlist.`);
    },
    onError: () => Alert.alert('Error', 'Could not save to wishlist. Try again.'),
  });

  // ── Poll job status ───────────────────────────────────────────────────────
  const startPolling = useCallback((jobId: string) => {
    pollCount.current = 0;
    if (pollRef.current) clearInterval(pollRef.current);
    setViewMode('PROCESSING');

    pollRef.current = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current > MAX_POLL_ATTEMPTS) {
        clearInterval(pollRef.current!);
        setErrorMsg('Processing timed out. Please try with a clearer photo.');
        setViewMode('ERROR');
        return;
      }
      try {
        const job = await jewelleryService.getPhotoJobStatus(jobId);
        if (job.status === 'COMPLETED' && job.outputUrl) {
          clearInterval(pollRef.current!);
          setResultUrl(job.outputUrl);
          setViewMode('RESULT');
        } else if (job.status === 'FAILED') {
          clearInterval(pollRef.current!);
          setErrorMsg('Processing failed. Please try a clearer, well-lit photo.');
          setViewMode('ERROR');
        }
      } catch { /* transient — keep polling */ }
    }, POLL_INTERVAL_MS);
  }, []);

  // ── Upload pipeline ───────────────────────────────────────────────────────
  const runUploadPipeline = useCallback(async (localUri: string) => {
    if (!selectedProduct) return;
    setPhotoUri(localUri);
    setViewMode('UPLOADING');
    setUploadProgress(10);

    try {
      // Step 1: Get presigned S3 URL
      const slot = await jewelleryService.requestPhotoUploadUrl();
      setUploadProgress(30);

      // Step 2: PUT photo directly to S3
      const photoBlob = await (await fetch(localUri)).blob();
      setUploadProgress(50);
      const s3Res = await fetch(slot.presignedUploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': slot.contentType },
        body: photoBlob,
      });
      if (!s3Res.ok) throw new Error(`S3 upload failed (${s3Res.status})`);
      setUploadProgress(70);

      // Step 3: Start try-on session
      const session = await jewelleryService.startTryOnSession({
        productId: selectedProduct.id,
        mode: 'PHOTO',
        platform: Platform.OS,
      });
      setUploadProgress(85);

      // Step 4: Submit photo job with s3Key
      const job = await jewelleryService.submitPhotoJob(session.id, slot.s3Key);
      setActiveJobId(job.id);
      setUploadProgress(100);

      // Step 5: Poll for result
      startPolling(job.id);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Upload failed. Please check your connection and try again.');
      setViewMode('ERROR');
    }
  }, [selectedProduct, startPolling]);

  // ── Photo pickers gated by consent ────────────────────────────────────────
  const executeAfterConsent = useCallback(async (action: 'camera' | 'gallery') => {
    if (action === 'gallery') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Allow access to your photo library to try on jewellery.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]) runUploadPipeline(res.assets[0].uri);
    } else {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Allow camera access to take a photo for try-on.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]) runUploadPipeline(res.assets[0].uri);
    }
  }, [runUploadPipeline]);

  const requestConsent = useCallback((action: 'camera' | 'gallery') => {
    if (!selectedProduct) {
      Alert.alert('Select Product', 'Please select a jewellery item first.');
      return;
    }
    setPendingAction(action);
    setConsentVisible(true);
  }, [selectedProduct]);

  const handleConsentAccept = useCallback(() => {
    setConsentVisible(false);
    if (pendingAction) executeAfterConsent(pendingAction);
  }, [pendingAction, executeAfterConsent]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleLiveAR = () =>
    Alert.alert(
      'Live AR Coming Soon',
      'Live AR try-on requires the MirrAR SDK integration. Use Photo mode for now.',
      [{ text: 'Use Photo Mode', onPress: () => requestConsent('camera') }]
    );

  const handleSaveLook = () => {
    if (!selectedProduct) return;
    wishlistMutation.mutate();
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    Alert.alert(
      'Added to Bag',
      `${selectedProduct.name} (₹${selectedProduct.totalPrice.toLocaleString('en-IN')}) has been added to your shopping bag.`,
      [
        { text: 'Continue Try-On', style: 'cancel' },
        {
          text: 'View Details',
          onPress: () => router.push(`/jewellery/${selectedProduct.id}`),
        },
        {
          text: 'Book Consultation',
          onPress: () =>
            router.push({
              pathname: '/jewellery/appointments',
              params: { vendorId: selectedProduct.vendorId },
            }),
        },
      ]
    );
  };

  const handleDeletePhoto = async () => {
    if (activeJobId) {
      try {
        await jewelleryService.deletePhoto(activeJobId);
      } catch {
        // Proceed with local reset even if already purged
      }
    }
    handleReset();
    Alert.alert('Photo Deleted', 'Your try-on photo has been scheduled for immediate erasure.');
  };

  const handleReset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setViewMode('SELECT');
    setPhotoUri(null);
    setResultUrl(null);
    setActiveJobId(null);
    setErrorMsg(null);
    setUploadProgress(0);
    pollCount.current = 0;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Virtual Try-On Studio</Text>
        {resultUrl ? (
          <TouchableOpacity onPress={() => setShowComparison(!showComparison)} style={styles.navBtn}>
            <Ionicons name="images-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {/* Studio */}
      <View style={styles.studioArea}>
        {viewMode === 'SELECT' && (
          <View style={styles.selectPrompt}>
            <Ionicons name="diamond" size={52} color="#C7D2FE" />
            <Text style={styles.selectTitle}>
              {selectedProduct ? `Try on ${selectedProduct.name}` : 'Choose a Jewellery Item'}
            </Text>
            <Text style={styles.selectSub}>
              {selectedProduct
                ? 'Take or upload a photo to see how it looks on you.'
                : 'Select from the carousel below, then take or upload a photo.'}
            </Text>
            <View style={styles.modeButtons}>
              <TouchableOpacity style={styles.modeBtn} onPress={() => requestConsent('camera')}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.modeBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modeBtn} onPress={() => requestConsent('gallery')}>
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

        {(viewMode === 'UPLOADING' || viewMode === 'PROCESSING') && (
          <View style={styles.loadingWrap}>
            {photoUri && <Image source={{ uri: photoUri }} style={styles.loadingBg} resizeMode="cover" />}
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingTitle}>
                {viewMode === 'UPLOADING' ? 'Uploading photo…' : 'Applying jewellery…'}
              </Text>
              {viewMode === 'UPLOADING' && (
                <>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                  </View>
                  <Text style={styles.progressPct}>{uploadProgress}%</Text>
                </>
              )}
              {viewMode === 'PROCESSING' && (
                <Text style={styles.loadingSub}>This usually takes 10–30 seconds</Text>
              )}
            </View>
          </View>
        )}

        {viewMode === 'RESULT' && resultUrl && (
          <View style={styles.resultWrap}>
            {showComparison ? (
              <View style={styles.compRow}>
                <View style={styles.compHalf}>
                  {photoUri && <Image source={{ uri: photoUri }} style={styles.compImg} resizeMode="cover" />}
                  <View style={styles.compLabel}><Text style={styles.compLabelText}>Before</Text></View>
                </View>
                <View style={styles.compHalf}>
                  <Image source={{ uri: resultUrl }} style={styles.compImg} resizeMode="cover" />
                  <View style={[styles.compLabel, { backgroundColor: COLORS.primary }]}>
                    <Text style={styles.compLabelText}>With Jewellery</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Image source={{ uri: resultUrl }} style={styles.resultImg} resizeMode="cover" />
            )}
            {selectedProduct && (
              <View style={styles.selectedStrip}>
                <Text style={styles.selectedName} numberOfLines={1}>{selectedProduct.name}</Text>
                <Text style={styles.selectedPrice}>₹{selectedProduct.totalPrice.toLocaleString('en-IN')}</Text>
              </View>
            )}
            <View style={styles.resultBar}>
              <TouchableOpacity style={styles.resultBtn} onPress={handleReset}>
                <Ionicons name="refresh" size={17} color="#FFFFFF" />
                <Text style={styles.resultBtnText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resultBtn} onPress={handleDeletePhoto}>
                <Ionicons name="trash-outline" size={17} color="#FCA5A5" />
                <Text style={styles.resultBtnText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resultBtn} onPress={handleSaveLook} disabled={wishlistMutation.isPending}>
                <Ionicons name={wishlistMutation.isPending ? 'hourglass' : 'heart'} size={17} color="#EF4444" />
                <Text style={styles.resultBtnText}>Save Look</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.resultBtn, styles.resultBtnPrimary]} onPress={handleAddToCart}>
                <Ionicons name="bag-add" size={17} color="#FFFFFF" />
                <Text style={[styles.resultBtnText, { color: '#FFFFFF' }]}>Add to Bag</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {viewMode === 'ERROR' && (
          <View style={styles.errorWrap}>
            <Ionicons name="cloud-offline-outline" size={52} color="#FCA5A5" />
            <Text style={styles.errorTitle}>Processing Failed</Text>
            <Text style={styles.errorMsg}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleReset}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Product carousel — visible only in SELECT mode */}
      {viewMode === 'SELECT' && (
        <View style={styles.carousel}>
          <Text style={styles.carouselTitle}>Try-On Ready Items</Text>
          {loadingProducts ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 8 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 10 }}>
              {tryOnEligibleProducts.map((product) => {
                const active = String(selectedProduct?.id) === String(product.id);
                return (
                  <TouchableOpacity key={product.id}
                    style={[styles.carouselCard, active && styles.carouselCardActive]}
                    onPress={() => setSelectedProduct(product)}>
                    {product.imageUrls?.[0]
                      ? <Image source={{ uri: product.imageUrls[0] }} style={styles.carouselImg} />
                      : <View style={styles.carouselPlaceholder}><Ionicons name="diamond-outline" size={24} color="#C7D2FE" /></View>}
                    <Text style={[styles.carouselName, active && { color: COLORS.primary }]} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={styles.carouselPrice}>₹{product.totalPrice.toLocaleString('en-IN')}</Text>
                    <View style={styles.bodyChip}>
                      <Text style={styles.bodyChipText}>{BODY_PART_LABELS[product.category] ?? 'Body'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {tryOnEligibleProducts.length === 0 && !loadingProducts && (
                <View style={{ padding: 16 }}>
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>No try-on items yet. Check back soon!</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* ── DPDP Consent Modal ─────────────────────────────────────── */}
      <Modal visible={consentVisible} transparent animationType="slide">
        <View style={styles.consentBackdrop}>
          <View style={styles.consentSheet}>
            <View style={styles.consentHandle} />
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="shield-checkmark" size={36} color="#059669" />
            </View>
            <Text style={styles.consentTitle}>Your Photo, Your Privacy</Text>
            <Text style={styles.consentBody}>
              Your photo is used <Text style={{ fontWeight: '800', color: '#0F172A' }}>only to preview jewellery</Text> on
              your image. It is processed securely and automatically deleted within{' '}
              <Text style={{ fontWeight: '800', color: '#0F172A' }}>24 hours</Text>.{'\n\n'}
              Mana Hub does not sell, share, or use your photo for face recognition.
            </Text>
            {[
              { icon: 'time-outline',         text: 'Deleted automatically within 24 hours' },
              { icon: 'lock-closed-outline',   text: 'Encrypted in transit and at rest' },
              { icon: 'person-remove-outline', text: 'Not used for identity / face recognition' },
              { icon: 'share-social-outline',  text: 'Never shared with third parties' },
            ].map((b) => (
              <View key={b.icon} style={styles.consentRow}>
                <Ionicons name={b.icon as any} size={16} color="#059669" />
                <Text style={styles.consentRowText}>{b.text}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.consentAccept} onPress={handleConsentAccept}>
              <Text style={styles.consentAcceptText}>I Understand – Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.consentDecline} onPress={() => { setConsentVisible(false); setPendingAction(null); }}>
              <Text style={styles.consentDeclineText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#F8FAFC' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingBottom: 12, paddingHorizontal: SPACING.md, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  navBtn:           { padding: 6 },
  headerTitle:      { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  studioArea:       { flex: 1, backgroundColor: '#0F172A' },

  // SELECT
  selectPrompt:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, gap: 12 },
  selectTitle:      { fontSize: 17, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  selectSub:        { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },
  modeButtons:      { flexDirection: 'row', gap: 10, marginTop: 10 },
  modeBtn:          { alignItems: 'center', gap: 5, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: RADIUS.md },
  modeBtnText:      { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  arBtn:            { backgroundColor: '#4F46E5' },

  // LOADING (upload/processing)
  loadingWrap:      { flex: 1, position: 'relative' },
  loadingBg:        { ...(StyleSheet.absoluteFill as object), opacity: 0.35 },
  loadingOverlay:   { ...(StyleSheet.absoluteFill as object), alignItems: 'center', justifyContent: 'center', gap: 12, padding: SPACING.lg },
  loadingTitle:     { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  loadingSub:       { color: '#CBD5E1', fontSize: 12 },
  progressBar:      { width: '78%', height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressFill:     { height: '100%', backgroundColor: '#22D3EE', borderRadius: 3 },
  progressPct:      { color: '#CBD5E1', fontSize: 11 },

  // RESULT
  resultWrap:       { flex: 1 },
  resultImg:        { flex: 1, width: '100%' },
  compRow:          { flex: 1, flexDirection: 'row' },
  compHalf:         { flex: 1, position: 'relative' },
  compImg:          { flex: 1, width: '100%' },
  compLabel:        { position: 'absolute', bottom: 6, left: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: RADIUS.sm, padding: 4, alignItems: 'center' },
  compLabelText:    { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  selectedStrip:    { position: 'absolute', bottom: 58, left: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between' },
  selectedName:     { color: '#FFFFFF', fontSize: 12, fontWeight: '700', flex: 1 },
  selectedPrice:    { color: '#FCD34D', fontSize: 13, fontWeight: '900' },
  resultBar:        { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 8, gap: 8, backgroundColor: 'rgba(0,0,0,0.7)' },
  resultBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 10, borderRadius: RADIUS.md },
  resultBtnText:    { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  resultBtnPrimary: { backgroundColor: COLORS.primary },

  // ERROR
  errorWrap:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: SPACING.lg },
  errorTitle:       { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  errorMsg:         { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },
  retryBtn:         { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.md, marginTop: 8 },
  retryText:        { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Carousel
  carousel:         { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#E2E8F0', paddingVertical: 12 },
  carouselTitle:    { fontSize: 11, fontWeight: '800', color: '#64748B', paddingHorizontal: SPACING.md, marginBottom: 8 },
  carouselCard:     { width: 100, borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 2, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  carouselCardActive:{ borderColor: COLORS.primary },
  carouselImg:      { width: '100%', height: 80, resizeMode: 'cover' },
  carouselPlaceholder: { width: '100%', height: 80, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  carouselName:     { fontSize: 10, fontWeight: '700', color: '#0F172A', padding: 4, paddingBottom: 0 },
  carouselPrice:    { fontSize: 9, color: '#B45309', fontWeight: '700', paddingHorizontal: 4 },
  bodyChip:         { backgroundColor: COLORS.primary, margin: 4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: RADIUS.full, alignSelf: 'flex-start' },
  bodyChipText:     { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },

  // Consent
  consentBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  consentSheet:     { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: SPACING.lg, paddingBottom: 40, paddingTop: 16 },
  consentHandle:    { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  consentTitle:     { fontSize: 17, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
  consentBody:      { fontSize: 13, color: '#475569', lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  consentRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  consentRowText:   { fontSize: 13, color: '#334155' },
  consentAccept:    { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center', marginTop: 12, marginBottom: 8 },
  consentAcceptText:{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  consentDecline:   { paddingVertical: 10, alignItems: 'center' },
  consentDeclineText:{ color: '#94A3B8', fontSize: 13, fontWeight: '600' },
});
