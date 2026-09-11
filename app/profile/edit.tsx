import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { profileService, UpdateProfileRequest } from '@/services/profileService';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants/config';

// ── Upload progress bar ────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  if (pct <= 0 || pct >= 100) return null;
  return (
    <View style={prog.track}>
      <View style={[prog.fill, { width: `${pct}%` }]} />
      <Text style={prog.label}>Uploading {pct}%</Text>
    </View>
  );
}
const prog = StyleSheet.create({
  track: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginTop: 6, overflow: 'hidden', position: 'relative' },
  fill:  { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: COLORS.primary, borderRadius: 2 },
  label: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
});

// ── Field component ────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  maxLength?: number;
  editable?: boolean;
}

function Field({
  label, value, onChangeText, placeholder, multiline,
  keyboardType = 'default', autoCapitalize = 'sentences',
  maxLength, editable = true,
}: FieldProps) {
  return (
    <View style={fld.wrap}>
      <Text style={fld.label}>{label}</Text>
      <TextInput
        style={[fld.input, multiline && fld.multiline, !editable && fld.disabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        editable={editable}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {maxLength && (
        <Text style={fld.counter}>{value.length}/{maxLength}</Text>
      )}
    </View>
  );
}
const fld = StyleSheet.create({
  wrap:      { gap: 5 },
  label:     { fontSize: 13, fontWeight: '600', color: COLORS.text },
  input:     { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface },
  multiline: { minHeight: 90, paddingTop: 12 },
  disabled:  { backgroundColor: '#F9FAFB', color: COLORS.textMuted },
  counter:   { fontSize: 11, color: COLORS.textMuted, textAlign: 'right' },
});

// ── Main screen ────────────────────────────────────────────────
export default function EditProfileScreen() {
  const router          = useRouter();
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    name:       user?.name       ?? '',
    mobile:     user?.mobile     ?? '',
    bio:        user?.bio        ?? '',
    profession: user?.profession ?? '',
    flatNumber: user?.flatNumber ?? '',
    tower:      user?.tower      ?? '',
  });

  const [photoUri,    setPhotoUri]    = useState<string | null>(null);  // local preview
  const [uploadPct,   setUploadPct]   = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving,    setIsSaving]    = useState(false);

  const set = (key: keyof typeof form) =>
    (value: string) => setForm((p) => ({ ...p, [key]: value }));

  // ── Photo picker ───────────────────────────────────────────────
  const pickFromLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const handlePickPhoto = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) takePhoto();
          if (idx === 2) pickFromLibrary();
        },
      );
    } else {
      // Android — simple Alert
      Alert.alert('Profile Photo', 'Choose a source', [
        { text: 'Camera',  onPress: takePhoto        },
        { text: 'Library', onPress: pickFromLibrary  },
        { text: 'Cancel',  style: 'cancel'           },
      ]);
    }
  }, [takePhoto, pickFromLibrary]);

  // ── Save ───────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Name is required.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Upload new photo if selected
      if (photoUri) {
        setIsUploading(true);
        const ext      = photoUri.split('.').pop()?.toLowerCase() ?? 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

        const { photoUrl } = await profileService.uploadPhoto(
          photoUri,
          mimeType,
          (pct) => setUploadPct(pct),
        );

        // Update local user state with new photo URL
        if (user) updateUser({ ...user, profilePhoto: photoUrl });
        setIsUploading(false);
        setUploadPct(0);
      }

      // 2. Save profile fields
      const payload: UpdateProfileRequest = {
        name:        form.name.trim(),
        mobile:      form.mobile.trim()     || undefined,
        bio:         form.bio.trim()        || undefined,
        profession:  form.profession.trim() || undefined,
        flatNumber:  form.flatNumber.trim() || undefined,
        tower:       form.tower.trim()      || undefined,
      };

      const updated = await profileService.updateProfile(payload);
      updateUser(updated);

      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to save. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  }, [form, photoUri, user, updateUser, router]);

  // ── Current photo to display ───────────────────────────────────
  const displayPhoto = photoUri ?? user?.profilePhoto ?? null;

  return (
    <SafeAreaView style={scr.container} edges={['top']}>
      {/* Header */}
      <View style={scr.header}>
        <TouchableOpacity onPress={() => router.back()} style={scr.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={scr.headerCancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={scr.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={scr.headerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isSaving
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Text style={scr.headerSave}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={scr.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={scr.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Avatar picker ── */}
          <View style={scr.avatarSection}>
            <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8}>
              <View style={scr.avatarWrap}>
                {displayPhoto ? (
                  <Image source={{ uri: displayPhoto }} style={scr.avatarImage} />
                ) : (
                  <View style={scr.avatarPlaceholder}>
                    <Text style={scr.avatarInitial}>
                      {form.name?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                )}
                {/* Camera badge */}
                <View style={scr.cameraBadge}>
                  <Text style={scr.cameraEmoji}>📷</Text>
                </View>
              </View>
            </TouchableOpacity>
            <Text style={scr.avatarHint}>Tap to change photo</Text>
            <ProgressBar pct={uploadPct} />
          </View>

          {/* ── Form fields ── */}
          <View style={scr.section}>
            <Text style={scr.sectionTitle}>Personal Info</Text>
            <Field label="Full Name *"   value={form.name}       onChangeText={set('name')}       placeholder="Rahul Sharma"             autoCapitalize="words"  maxLength={80} />
            <Field label="Mobile"        value={form.mobile}     onChangeText={set('mobile')}     placeholder="+91 98765 43210"          keyboardType="phone-pad" />
            <Field label="Profession"    value={form.profession} onChangeText={set('profession')} placeholder="Software Engineer"        autoCapitalize="words"  maxLength={60} />
            <Field label="Bio"           value={form.bio}        onChangeText={set('bio')}        placeholder="Tell your neighbours about yourself…" multiline maxLength={200} />
          </View>

          <View style={scr.section}>
            <Text style={scr.sectionTitle}>Residence</Text>
            <Field label="Flat / Unit No." value={form.flatNumber} onChangeText={set('flatNumber')} placeholder="A-204" />
            <Field label="Tower / Block"   value={form.tower}      onChangeText={set('tower')}      placeholder="Tower A" autoCapitalize="words" />
          </View>

          <View style={scr.section}>
            <Text style={scr.sectionTitle}>Account</Text>
            <Field label="Email" value={user?.email ?? ''} onChangeText={() => {}} editable={false} />
          </View>

          <View style={scr.bottomPad} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const scr = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.background },
  flex:             { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerBtn:        { minWidth: 60 },
  headerTitle:      { fontSize: 17, fontWeight: '700', color: COLORS.text },
  headerCancel:     { fontSize: 16, color: COLORS.textMuted },
  headerSave:       { fontSize: 16, fontWeight: '700', color: COLORS.primary, textAlign: 'right' },
  scroll:           { padding: 20, gap: 20 },
  avatarSection:    { alignItems: 'center', paddingVertical: 8 },
  avatarWrap:       { position: 'relative', marginBottom: 8 },
  avatarImage:      { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: COLORS.primary },
  avatarPlaceholder:{ width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial:    { color: '#fff', fontSize: 36, fontWeight: '800' },
  cameraBadge:      { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.surface, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  cameraEmoji:      { fontSize: 14 },
  avatarHint:       { fontSize: 13, color: COLORS.textMuted },
  section:          { gap: 14, backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle:     { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  bottomPad:        { height: 32 },
});
