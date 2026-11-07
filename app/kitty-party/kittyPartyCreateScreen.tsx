import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { kittyPartyService } from '@/services/kittyPartyService';

export default function KittyPartyCreateScreen() {
  const router = useRouter();
  const [circleName, setCircleName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryCode, setCategoryCode] = useState('KITTY');
  const [privacyType, setPrivacyType] = useState('PRIVATE');
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [maxMembers, setMaxMembers] = useState('15');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!circleName.trim()) {
      Alert.alert('Required', 'Please enter a circle name');
      return;
    }

    try {
      setSubmitting(true);
      const res = await kittyPartyService.createCircle({
        circleName: circleName.trim(),
        description: description.trim() || undefined,
        categoryCode,
        privacyType,
        approvalRequired,
        maxMembers: parseInt(maxMembers, 10) || 20,
      });

      Alert.alert('Success', 'Circle created successfully!', [
        {
          text: 'Open Circle',
          onPress: () => {
            if (res?.id) {
              router.replace({
                pathname: '/kitty-party/kittyPartyDetailsScreen',
                params: { id: res.id },
              });
            } else {
              router.back();
            }
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create circle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Create Social Circle</Text>
      <Text style={styles.headerSubtitle}>
        Setup your monthly kitty group, ladies circle, or neighborhood gathering.
      </Text>

      {/* Circle Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>CIRCLE NAME *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Lotus Heights Queens Kitty"
          value={circleName}
          onChangeText={setCircleName}
        />
      </View>

      {/* Category Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>CATEGORY</Text>
        <View style={styles.chipsRow}>
          {[
            { code: 'KITTY', label: 'Monthly Kitty' },
            { code: 'LADIES_CLUB', label: 'Ladies Club' },
            { code: 'FAMILY', label: 'Family' },
            { code: 'FRIENDS', label: 'Friends & Games' },
            { code: 'PROFESSIONAL', label: 'Women Network' },
          ].map((cat) => (
            <TouchableOpacity
              key={cat.code}
              style={[styles.chip, categoryCode === cat.code && styles.chipActive]}
              onPress={() => setCategoryCode(cat.code)}
            >
              <Text
                style={[styles.chipText, categoryCode === cat.code && styles.chipTextActive]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Privacy Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>PRIVACY LEVEL</Text>
        <View style={styles.privacyRow}>
          {[
            { code: 'PRIVATE', label: 'Private (Approval Req)' },
            { code: 'INVITE_ONLY', label: 'Invite Only' },
            { code: 'COMMUNITY_PUBLIC', label: 'Public' },
          ].map((p) => (
            <TouchableOpacity
              key={p.code}
              style={[styles.privacyBox, privacyType === p.code && styles.privacyBoxActive]}
              onPress={() => setPrivacyType(p.code)}
            >
              <Text
                style={[
                  styles.privacyText,
                  privacyType === p.code && styles.privacyTextActive,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Max Members */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>MAX MEMBERS</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={maxMembers}
          onChangeText={setMaxMembers}
        />
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>DESCRIPTION / RULES</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          placeholder="Describe meeting schedule, monthly pool target, or theme..."
          value={description}
          onChangeText={setDescription}
        />
      </View>

      {/* Approval Required */}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Require Admin Approval to Join</Text>
        <Switch
          value={approvalRequired}
          onValueChange={setApprovalRequired}
          trackColor={{ false: '#D1D5DB', true: '#F472B6' }}
          thumbColor={approvalRequired ? '#BE185D' : '#F3F4F6'}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        disabled={submitting}
        onPress={handleCreate}
        activeOpacity={0.8}
      >
        <Text style={styles.submitButtonText}>
          {submitting ? 'Creating...' : 'Create Circle'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  chipActive: {
    backgroundColor: '#BE185D',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  privacyRow: {
    gap: 8,
  },
  privacyBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#F9FAFB',
  },
  privacyBoxActive: {
    borderColor: '#BE185D',
    backgroundColor: '#FDF2F8',
  },
  privacyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  privacyTextActive: {
    color: '#BE185D',
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  submitButton: {
    backgroundColor: '#BE185D',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#BE185D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
