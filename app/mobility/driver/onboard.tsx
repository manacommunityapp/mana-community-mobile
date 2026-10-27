import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { mobilityDriverService } from '@/services/mobilityService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { VehicleType, DocumentType } from '@/types/mobility';

type Step = 'VEHICLE' | 'DOCUMENTS' | 'REVIEW';

const VEHICLE_TYPES: { type: VehicleType; label: string; icon: keyof typeof Ionicons.glyphMap; sublabel: string }[] = [
  { type: 'BIKE',     label: 'Bike',     icon: 'bicycle',   sublabel: 'Two-wheeler' },
  { type: 'AUTO',     label: 'Auto',     icon: 'car-sport', sublabel: 'Three-wheeler' },
  { type: 'MINI_CAB', label: 'Mini Cab', icon: 'car',       sublabel: 'Hatchback' },
  { type: 'SEDAN',    label: 'Sedan',    icon: 'car',       sublabel: 'Sedan / Saloon' },
  { type: 'SUV',      label: 'SUV',      icon: 'car',       sublabel: 'Large vehicle' },
];

const REQUIRED_DOCS: { type: DocumentType; label: string; description: string }[] = [
  { type: 'DRIVING_LICENCE', label: 'Driving Licence',       description: 'Valid DL — front & back' },
  { type: 'VEHICLE_RC',      label: 'Vehicle RC',             description: 'Registration certificate' },
  { type: 'INSURANCE',       label: 'Vehicle Insurance',      description: 'Valid insurance document' },
  { type: 'PAN_CARD',        label: 'PAN Card',               description: 'For payment settlement' },
  { type: 'AADHAAR',         label: 'Aadhaar Card',           description: 'Government-issued ID' },
];

export default function DriverOnboardScreen() {
  const router      = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep]               = useState<Step>('VEHICLE');
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleModel, setVehicleModel]   = useState('');
  const [vehicleColor, setVehicleColor]   = useState('');
  const [vehicleYear, setVehicleYear]     = useState('');

  const goBack = useCallback(() => {
    if (step === 'VEHICLE')   { router.back(); return true; }
    if (step === 'DOCUMENTS') { setStep('VEHICLE'); return true; }
    if (step === 'REVIEW')    { setStep('DOCUMENTS'); return true; }
    return false;
  }, [step, router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', goBack);
      return () => sub.remove();
    }, [goBack]),
  );

  const { data: existingDocs } = useQuery({
    queryKey: ['mobility-driver-docs'],
    queryFn:  mobilityDriverService.getDocuments,
  });

  const registerMutation = useMutation({
    mutationFn: () => mobilityDriverService.register({
      vehicleType:    vehicleType!,
      vehicleNumber:  vehicleNumber.trim().toUpperCase(),
      vehicleModel:   vehicleModel.trim(),
      vehicleColor:   vehicleColor.trim(),
      vehicleYear:    Number(vehicleYear),
      serviceZoneIds: [],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobility-driver-profile'] });
      router.replace('/mobility/driver' as any);
    },
    onError: () => Alert.alert('Error', 'Registration failed. Please try again.'),
  });

  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  async function pickAndUploadDocument(docType: DocumentType) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission required', 'Allow photo access to upload your document.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: false });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('docType', docType);
    formData.append('file', { uri: asset.uri, name: asset.fileName || `${docType}.jpg`, type: asset.mimeType || 'image/jpeg' } as any);
    setUploadingType(docType);
    try {
      await mobilityDriverService.uploadDocument(formData);
      await queryClient.invalidateQueries({ queryKey: ['mobility-driver-docs'] });
      Alert.alert('Uploaded', `${docType.replaceAll('_', ' ')} submitted for review.`);
    } catch { Alert.alert('Upload failed', 'Please choose a clear image and try again.'); }
    finally { setUploadingType(null); }
  }

  function handleVehicleNext() {
    if (!vehicleType)             { Alert.alert('Required', 'Select vehicle type'); return; }
    if (!vehicleNumber.trim())    { Alert.alert('Required', 'Enter vehicle registration number'); return; }
    if (!vehicleModel.trim())     { Alert.alert('Required', 'Enter vehicle model'); return; }
    if (!vehicleYear.trim() || isNaN(Number(vehicleYear))) { Alert.alert('Required', 'Enter valid year'); return; }
    setStep('DOCUMENTS');
  }

  const uploadedTypes = new Set(existingDocs?.map(d => d.type) ?? []);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Driver Registration</Text>
          <Text style={s.headerSub}>
            {step === 'VEHICLE' ? 'Step 1 · Vehicle details' :
             step === 'DOCUMENTS' ? 'Step 2 · Upload documents' : 'Step 3 · Review & submit'}
          </Text>
        </View>
        <View style={s.stepIndicator}>
          {(['VEHICLE', 'DOCUMENTS', 'REVIEW'] as Step[]).map((st, i) => (
            <View
              key={st}
              style={[s.stepDot,
                step === st && s.stepDotActive,
                i < (['VEHICLE', 'DOCUMENTS', 'REVIEW'] as Step[]).indexOf(step) && s.stepDotDone,
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Step 1: Vehicle ─────────────────────────────────────── */}
        {step === 'VEHICLE' && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Vehicle Type</Text>
            <View style={s.vehicleGrid}>
              {VEHICLE_TYPES.map((v) => (
                <TouchableOpacity
                  key={v.type}
                  style={[s.vehicleCard, vehicleType === v.type && s.vehicleCardSelected]}
                  onPress={() => setVehicleType(v.type)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={v.icon}
                    size={24}
                    color={vehicleType === v.type ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text style={[s.vehicleLabel, vehicleType === v.type && s.vehicleLabelSelected]}>{v.label}</Text>
                  <Text style={s.vehicleSublabel}>{v.sublabel}</Text>
                  {vehicleType === v.type && (
                    <View style={s.checkmark}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.sectionTitle, { marginTop: 6 }]}>Vehicle Details</Text>

            {[
              { label: 'Registration Number', placeholder: 'e.g. TS09AB1234', value: vehicleNumber, onChange: setVehicleNumber, upper: true },
              { label: 'Model (Make & Name)', placeholder: 'e.g. Honda Activa 5G', value: vehicleModel, onChange: setVehicleModel, upper: false },
              { label: 'Color',               placeholder: 'e.g. White',           value: vehicleColor, onChange: setVehicleColor, upper: false },
              { label: 'Year of Manufacture', placeholder: 'e.g. 2021',            value: vehicleYear,  onChange: setVehicleYear, upper: false, numeric: true },
            ].map(({ label, placeholder, value, onChange, upper, numeric }) => (
              <View key={label}>
                <Text style={s.inputLabel}>{label}</Text>
                <View style={s.inputRow}>
                  <TextInput
                    style={s.input}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    value={value}
                    onChangeText={(t) => onChange(upper ? t.toUpperCase() : t)}
                    autoCapitalize={upper ? 'characters' : 'words'}
                    keyboardType={numeric ? 'number-pad' : 'default'}
                  />
                </View>
              </View>
            ))}

            <TouchableOpacity style={s.ctaBtn} onPress={handleVehicleNext} activeOpacity={0.85}>
              <Text style={s.ctaBtnText}>Continue to Documents</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: Documents ──────────────────────────────────── */}
        {step === 'DOCUMENTS' && (
          <View style={s.section}>
            <View style={s.infoCard}>
              <Ionicons name="information-circle" size={16} color={COLORS.primary} />
              <Text style={s.infoText}>
                Upload clear photos of all documents. Your application will be reviewed by the
                operations team. Driving eligibility requires all mandatory documents to be valid.
              </Text>
            </View>

            {REQUIRED_DOCS.map((doc) => {
              const isUploaded = uploadedTypes.has(doc.type);
              return (
                <View key={doc.type} style={s.docCard}>
                  <View style={[s.docIcon, { backgroundColor: isUploaded ? '#ECFDF5' : COLORS.surfaceAlt }]}>
                    <Ionicons
                      name={isUploaded ? 'checkmark-circle' : 'document-outline'}
                      size={22}
                      color={isUploaded ? '#059669' : COLORS.textMuted}
                    />
                  </View>
                  <View style={s.docInfo}>
                    <Text style={s.docLabel}>{doc.label}</Text>
                    <Text style={s.docDesc}>{doc.description}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.uploadBtn, isUploaded && s.uploadBtnDone]}
                    onPress={() => pickAndUploadDocument(doc.type)}
                    disabled={uploadingType !== null}
                  >
                    <Text style={[s.uploadBtnText, isUploaded && s.uploadBtnTextDone]}>
                      {uploadingType === doc.type ? 'Uploading…' : isUploaded ? 'Uploaded' : 'Upload'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <TouchableOpacity style={s.ctaBtn} onPress={() => setStep('REVIEW')} activeOpacity={0.85}>
              <Text style={s.ctaBtnText}>Continue to Review</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 3: Review ─────────────────────────────────────── */}
        {step === 'REVIEW' && (
          <View style={s.section}>
            <View style={s.reviewCard}>
              <Text style={s.reviewTitle}>Application Summary</Text>
              <View style={s.reviewRow}><Text style={s.reviewLabel}>Vehicle type</Text><Text style={s.reviewValue}>{vehicleType}</Text></View>
              <View style={s.reviewRow}><Text style={s.reviewLabel}>Registration</Text><Text style={s.reviewValue}>{vehicleNumber}</Text></View>
              <View style={s.reviewRow}><Text style={s.reviewLabel}>Model</Text><Text style={s.reviewValue}>{vehicleModel}</Text></View>
              <View style={s.reviewRow}><Text style={s.reviewLabel}>Year</Text><Text style={s.reviewValue}>{vehicleYear}</Text></View>
              <View style={s.reviewRow}>
                <Text style={s.reviewLabel}>Documents</Text>
                <Text style={s.reviewValue}>{uploadedTypes.size} / {REQUIRED_DOCS.length} uploaded</Text>
              </View>
            </View>

            <View style={s.termsCard}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
              <Text style={s.termsText}>
                By submitting, you confirm that all information is accurate and that you hold a valid driving
                licence for the selected vehicle category. False information may lead to permanent suspension.
              </Text>
            </View>

            <TouchableOpacity
              style={[s.ctaBtn, registerMutation.isPending && s.ctaBtnDisabled]}
              onPress={() => registerMutation.mutate()}
              activeOpacity={0.85}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Text style={s.ctaBtnText}>Submit Application</Text>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  </>
              }
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.background },

  header:             {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12, ...SHADOWS.sm,
  },
  backBtn:            {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  headerTitle:        { fontSize: 17, fontFamily: FONTS.displayBold, color: COLORS.text },
  headerSub:          { fontSize: 11.5, color: COLORS.textMuted, fontFamily: FONTS.medium, marginTop: 1 },
  stepIndicator:      { marginLeft: 'auto', flexDirection: 'row', gap: 6 },
  stepDot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  stepDotActive:      { backgroundColor: COLORS.primary, width: 20 },
  stepDotDone:        { backgroundColor: COLORS.success },

  scroll:             { padding: 16, gap: 16 },
  section:            { gap: 14 },
  sectionTitle:       { fontSize: 15, fontFamily: FONTS.displayBold, color: COLORS.text },

  vehicleGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vehicleCard:        {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: COLORS.border, position: 'relative', ...SHADOWS.sm,
  },
  vehicleCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  vehicleLabel:       { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.text },
  vehicleLabelSelected: { color: COLORS.primary },
  vehicleSublabel:    { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.regular },
  checkmark:          { position: 'absolute', top: 8, right: 8 },

  inputLabel:         { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.text, marginBottom: 4 },
  inputRow:           {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, ...SHADOWS.sm,
  },
  input:              { height: 46, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.text },

  infoCard:           {
    flexDirection: 'row', gap: 8, backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md, padding: 12,
  },
  infoText:           { flex: 1, fontSize: 12.5, color: COLORS.primary, fontFamily: FONTS.regular, lineHeight: 18 },

  docCard:            {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  docIcon:            {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  docInfo:            { flex: 1 },
  docLabel:           { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
  docDesc:            { fontSize: 11.5, color: COLORS.textMuted, fontFamily: FONTS.regular, marginTop: 2 },
  uploadBtn:          {
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  uploadBtnDone:      { backgroundColor: '#ECFDF5' },
  uploadBtnText:      { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.primary },
  uploadBtnTextDone:  { color: '#059669' },

  reviewCard:         {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, gap: 10,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  reviewTitle:        { fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.text, marginBottom: 4 },
  reviewRow:          { flexDirection: 'row', justifyContent: 'space-between' },
  reviewLabel:        { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.regular },
  reviewValue:        { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.text },

  termsCard:          {
    flexDirection: 'row', gap: 8, backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  termsText:          { flex: 1, fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.regular, lineHeight: 18 },

  ctaBtn:             {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 15,
    ...SHADOWS.primary,
  },
  ctaBtnDisabled:     { opacity: 0.6 },
  ctaBtnText:         { color: '#fff', fontFamily: FONTS.bold, fontSize: 15 },
});
