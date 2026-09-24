import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, TextInput as TI,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/hooks/useOnboarding';
import { COLORS } from '@/constants/config';

function StepHeader({ step, total, title, sub }: {
  step: number; total: number; title: string; sub: string;
}) {
  return (
    <View style={sh.wrap}>
      {/* Progress bar */}
      <View style={sh.barTrack}>
        <View style={[sh.barFill, { width: `${(step / total) * 100}%` }]} />
      </View>
      <Text style={sh.stepLabel}>Step {step} of {total}</Text>
      <Text style={sh.title}>{title}</Text>
      <Text style={sh.sub}>{sub}</Text>
    </View>
  );
}

const sh = StyleSheet.create({
  wrap:      { gap: 6, paddingBottom: 4 },
  barTrack:  { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  barFill:   { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  stepLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  title:     { fontSize: 24, fontWeight: '800', color: COLORS.text, lineHeight: 30 },
  sub:       { fontSize: 14, color: COLORS.textMuted },
});

export { StepHeader };

export default function AccountStep() {
  const router      = useRouter();
  const { setAccount, name: savedName, email: savedEmail, phone: savedPhone } = useOnboarding();

  const [name,    setName]    = useState(savedName);
  const [email,   setEmail]   = useState(savedEmail);
  const [phone,   setPhone]   = useState(savedPhone);
  const [password,setPwd]     = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});

  const emailRef = useRef<TI>(null);
  const phoneRef = useRef<TI>(null);
  const pwdRef   = useRef<TI>(null);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim())               e.name     = 'Full name is required';
    if (!email.trim() || !email.includes('@')) e.email = 'Valid email required';
    if (phone.length < 10)          e.phone    = 'Enter a valid 10-digit number';
    if (password.length < 8)        e.password = 'Minimum 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (!validate()) return;
    setAccount({ name: name.trim(), email: email.trim(), phone, password });
    router.push('/onboarding/community');
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StepHeader
            step={1} total={4}
            title="Create your account"
            sub="Let's start with the basics"
          />

          {/* Full name */}
          <View style={s.field}>
            <Text style={s.label}>Full name</Text>
            <TextInput
              style={[s.input, errors.name && s.inputError]}
              value={name}
              onChangeText={setName}
              placeholder="Priya Sharma"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            {errors.name && <Text style={s.error}>{errors.name}</Text>}
          </View>

          {/* Email */}
          <View style={s.field}>
            <Text style={s.label}>Email</Text>
            <TextInput
              ref={emailRef}
              style={[s.input, errors.email && s.inputError]}
              value={email}
              onChangeText={setEmail}
              placeholder="priya@email.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
            />
            {errors.email && <Text style={s.error}>{errors.email}</Text>}
          </View>

          {/* Phone */}
          <View style={s.field}>
            <Text style={s.label}>Phone number</Text>
            <View style={[s.phoneWrap, errors.phone && s.inputError]}>
              <Text style={s.phoneCode}>🇮🇳 +91</Text>
              <TextInput
                ref={phoneRef}
                style={s.phoneInput}
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                returnKeyType="next"
                onSubmitEditing={() => pwdRef.current?.focus()}
              />
            </View>
            {errors.phone && <Text style={s.error}>{errors.phone}</Text>}
          </View>

          {/* Password */}
          <View style={s.field}>
            <Text style={s.label}>Password</Text>
            <View style={[s.pwdWrap, errors.password && s.inputError]}>
              <TextInput
                ref={pwdRef}
                style={s.pwdInput}
                value={password}
                onChangeText={setPwd}
                placeholder="Min 8 characters"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPwd}
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.eyeIcon}>{showPwd ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={s.error}>{errors.password}</Text>}
          </View>

          <View style={{ height: 8 }} />

          <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={s.nextBtnText}>Continue →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.signInLink} onPress={() => router.push('/auth/login')}>
            <Text style={s.signInText}>Already have an account? <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Sign in</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.background },
  scroll:     { padding: 24, gap: 16 },
  field:      { gap: 6 },
  label:      { fontSize: 14, fontWeight: '600', color: COLORS.text },
  input:      { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface },
  inputError: { borderColor: COLORS.error },
  error:      { fontSize: 12, color: COLORS.error, fontWeight: '500' },
  phoneWrap:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surface, overflow: 'hidden' },
  phoneCode:  { paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: COLORS.text, borderRightWidth: 1, borderRightColor: COLORS.border, backgroundColor: '#F9FAFB' },
  phoneInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: COLORS.text },
  pwdWrap:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surface },
  pwdInput:   { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: COLORS.text },
  eyeIcon:    { paddingHorizontal: 14, fontSize: 18 },
  nextBtn:    { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  nextBtnText:{ color: '#fff', fontWeight: '800', fontSize: 16 },
  signInLink: { alignItems: 'center', paddingVertical: 8 },
  signInText: { fontSize: 14, color: COLORS.textMuted },
});
