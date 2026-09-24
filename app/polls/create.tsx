import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Switch, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pollService } from '@/services/pollService';
import { COLORS } from '@/constants/config';
import DateTimePicker from '@react-native-community/datetimepicker';

const MAX_OPTIONS  = 6;
const MIN_OPTIONS  = 2;

export default function CreatePollScreen() {
  const router = useRouter();
  const qc     = useQueryClient();

  const [question,     setQuestion]     = useState('');
  const [options,      setOptions]      = useState<string[]>(['', '']);
  const [deadline,     setDeadline]     = useState<Date | null>(null);
  const [showPicker,   setShowPicker]   = useState(false);
  const [pickerMode,   setPickerMode]   = useState<'date' | 'time' | 'datetime'>(Platform.OS === 'ios' ? 'datetime' : 'date');
  const [multiVote,    setMultiVote]    = useState(false);
  const [anonymous,    setAnonymous]    = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  const createMutation = useMutation({
    mutationFn: () => pollService.createPoll({
      question:           question.trim(),
      options:            options.map((o) => o.trim()).filter(Boolean),
      deadline:           deadline?.toISOString(),
      allowMultipleVotes: multiVote,
      isAnonymous:        anonymous,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['polls'] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to create poll.');
    },
  });

  const filledOptions = options.filter((o) => o.trim().length > 0);
  const canSubmit     = question.trim().length > 0 && filledOptions.length >= MIN_OPTIONS;

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, '']);
    setTimeout(() => inputRefs.current[options.length]?.focus(), 100);
  };

  const removeOption = (i: number) => {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateOption = (i: number, value: string) => {
    setOptions((prev) => prev.map((o, idx) => idx === i ? value : o));
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.title}>Create Poll</Text>
        <TouchableOpacity
          onPress={() => createMutation.mutate()}
          disabled={!canSubmit || createMutation.isPending}
        >
          {createMutation.isPending
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Text style={[s.post, !canSubmit && s.postDisabled]}>Post</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Question */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Question *</Text>
            <TextInput
              style={s.questionInput}
              value={question}
              onChangeText={setQuestion}
              placeholder="Ask your community something…"
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={200}
              autoFocus
              textAlignVertical="top"
            />
            <Text style={s.charCount}>{question.length}/200</Text>
          </View>

          {/* Options */}
          <View style={s.section}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>Options *</Text>
              <Text style={s.sectionSub}>{options.length}/{MAX_OPTIONS}</Text>
            </View>

            {options.map((opt, i) => (
              <View key={i} style={s.optionRow}>
                <View style={s.optionNum}>
                  <Text style={s.optionNumText}>{i + 1}</Text>
                </View>
                <TextInput
                  ref={(el) => { inputRefs.current[i] = el; }}
                  style={s.optionInput}
                  value={opt}
                  onChangeText={(v) => updateOption(i, v)}
                  placeholder={i === 0 ? 'Option 1' : i === 1 ? 'Option 2' : `Option ${i + 1} (optional)`}
                  placeholderTextColor={COLORS.textMuted}
                  maxLength={80}
                  returnKeyType={i < options.length - 1 ? 'next' : 'done'}
                  onSubmitEditing={() => {
                    if (i < options.length - 1) inputRefs.current[i + 1]?.focus();
                    else if (options.length < MAX_OPTIONS) addOption();
                  }}
                />
                {options.length > MIN_OPTIONS && (
                  <TouchableOpacity
                    style={s.removeBtn}
                    onPress={() => removeOption(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={s.removeBtnText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {options.length < MAX_OPTIONS && (
              <TouchableOpacity style={s.addOptionBtn} onPress={addOption}>
                <Text style={s.addOptionText}>+ Add option</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Settings */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Settings</Text>

            {/* Deadline */}
            <TouchableOpacity
              style={s.settingRow}
              onPress={() => {
                setPickerMode(Platform.OS === 'ios' ? 'datetime' : 'date');
                setShowPicker(true);
              }}
            >
              <View style={s.settingInfo}>
                <Text style={s.settingLabel}>⏰ Poll deadline</Text>
                <Text style={s.settingDesc}>
                  {deadline
                    ? deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : 'No deadline (stays open)'
                  }
                </Text>
              </View>
              <Text style={s.settingChevron}>{deadline ? '✕' : '›'}</Text>
            </TouchableOpacity>
            {deadline && (
              <TouchableOpacity
                style={s.clearDeadline}
                onPress={() => setDeadline(null)}
              >
                <Text style={s.clearDeadlineText}>Clear deadline</Text>
              </TouchableOpacity>
            )}

            <View style={s.divider} />

            {/* Multiple votes */}
            <View style={s.toggleRow}>
              <View style={s.settingInfo}>
                <Text style={s.settingLabel}>☑ Allow multiple choices</Text>
                <Text style={s.settingDesc}>Voters can select more than one option</Text>
              </View>
              <Switch
                value={multiVote}
                onValueChange={setMultiVote}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={s.divider} />

            {/* Anonymous */}
            <View style={s.toggleRow}>
              <View style={s.settingInfo}>
                <Text style={s.settingLabel}>🔏 Anonymous votes</Text>
                <Text style={s.settingDesc}>Voter names are not visible to anyone</Text>
              </View>
              <Switch
                value={anonymous}
                onValueChange={setAnonymous}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Preview */}
          {question.trim().length > 0 && filledOptions.length >= 2 && (
            <View style={s.preview}>
              <Text style={s.previewLabel}>Preview</Text>
              <Text style={s.previewQuestion}>{question}</Text>
              <View style={s.previewOptions}>
                {options.filter((o) => o.trim()).map((opt, i) => (
                  <View key={i} style={s.previewOption}>
                    <View style={s.previewDot} />
                    <Text style={s.previewOptionText}>{opt}</Text>
                  </View>
                ))}
              </View>
              {deadline && (
                <Text style={s.previewMeta}>
                  Closes {deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
              {multiVote && <Text style={s.previewMeta}>Multiple votes allowed</Text>}
              {anonymous && <Text style={s.previewMeta}>🔏 Anonymous</Text>}
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date picker */}
      {showPicker && (
        <DateTimePicker
          value={deadline ?? new Date(Date.now() + 24 * 60 * 60 * 1000)}
          mode={pickerMode as any}
          minimumDate={new Date()}
          onChange={(_, date) => {
            if (Platform.OS === 'android') {
              if (pickerMode === 'date') {
                if (date) {
                  setDeadline(date);
                  setPickerMode('time');
                } else {
                  setShowPicker(false);
                }
              } else {
                setShowPicker(false);
                setPickerMode('date');
                if (date) {
                  setDeadline((prev) => {
                    const base = prev ?? new Date();
                    const combined = new Date(base);
                    combined.setHours(date.getHours());
                    combined.setMinutes(date.getMinutes());
                    return combined;
                  });
                }
              }
            } else {
              setShowPicker(false);
              if (date) setDeadline(date);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: COLORS.background },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cancel:            { fontSize: 16, color: COLORS.textMuted },
  title:             { fontSize: 17, fontWeight: '700', color: COLORS.text },
  post:              { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  postDisabled:      { color: COLORS.textMuted },
  scroll:            { padding: 16, gap: 16 },
  section:           { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: COLORS.border },
  sectionHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:      { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  sectionSub:        { fontSize: 12, color: COLORS.textMuted },
  questionInput:     { fontSize: 16, color: COLORS.text, minHeight: 80, lineHeight: 24, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12 },
  charCount:         { fontSize: 11, color: COLORS.textMuted, textAlign: 'right' },
  optionRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionNum:         { width: 26, height: 26, borderRadius: 13, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optionNumText:     { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  optionInput:       { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: COLORS.text },
  removeBtn:         { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  removeBtnText:     { fontSize: 18, color: COLORS.error, lineHeight: 22, fontWeight: '700' },
  addOptionBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, borderStyle: 'dashed' },
  addOptionText:     { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  settingRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleRow:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingInfo:       { flex: 1 },
  settingLabel:      { fontSize: 15, fontWeight: '600', color: COLORS.text },
  settingDesc:       { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  settingChevron:    { fontSize: 20, color: COLORS.textMuted },
  clearDeadline:     { alignSelf: 'flex-start' },
  clearDeadlineText: { fontSize: 13, color: COLORS.error, textDecorationLine: 'underline' },
  divider:           { height: 1, backgroundColor: COLORS.border },
  preview:           { backgroundColor: '#F5F3FF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#C4B5FD', gap: 10 },
  previewLabel:      { fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewQuestion:   { fontSize: 16, fontWeight: '700', color: COLORS.text, lineHeight: 22 },
  previewOptions:    { gap: 6 },
  previewOption:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewDot:        { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: COLORS.primary },
  previewOptionText: { fontSize: 14, color: COLORS.text },
  previewMeta:       { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
});
