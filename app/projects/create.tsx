import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { createProjectFromGovernanceResolution, type CreateProjectDto } from '@/services/projectsService';

const CATEGORIES = ['INFRASTRUCTURE','SECURITY','AMENITIES','UTILITIES','ENVIRONMENT','RENOVATION'];
const PRIORITIES = ['LOW','MEDIUM','HIGH','CRITICAL'];
const FUNDING = ['SINKING_FUND','MAINTENANCE_FUND','SPECIAL_LEVY','CORPUS'];

export default function CreateProjectScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('INFRASTRUCTURE');
  const [priority, setPriority] = useState('HIGH');
  const [budget, setBudget] = useState('');
  const [funding, setFunding] = useState('SINKING_FUND');
  const [target, setTarget] = useState('');
  const [resolutionId, setResolutionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title.trim() || !budget || !target.trim()) {
      Alert.alert('Missing Fields', 'Please fill Title, Budget, and Target Date.');
      return;
    }
    setSubmitting(true);
    const dto: CreateProjectDto = {
      title: title.trim(),
      description: desc.trim(),
      category: category as any,
      priority: priority as any,
      estimatedBudget: parseInt(budget.replace(/[^0-9]/g, ''), 10),
      fundingSource: funding as any,
      targetCompletionDate: target.trim(),
      governanceProposalId: resolutionId.trim() || undefined,
    };
    await createProjectFromGovernanceResolution(resolutionId || 'manual', resolutionId || 'manual', dto);
    setSubmitting(false);
    Alert.alert('Project Created', title + ' has been created and linked to Governance.');
    router.back();
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>New Community Project</Text>
      </View>

      <View style={s.form}>
        <Text style={s.label}>Project Title *</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder='e.g. Solar Panel Installation' placeholderTextColor='#90a4ae' />

        <Text style={s.label}>Description</Text>
        <TextInput style={[s.input, s.textarea]} value={desc} onChangeText={setDesc} multiline numberOfLines={4} placeholder='Detailed description of the project...' placeholderTextColor='#90a4ae' textAlignVertical='top' />

        <Text style={s.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c} style={[s.chip, category === c && s.chipActive]} onPress={() => setCategory(c)}>
              <Text style={[s.chipText, category === c && s.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={s.label}>Priority</Text>
        <View style={s.row}>
          {PRIORITIES.map(p => (
            <TouchableOpacity key={p} style={[s.priorityChip, priority === p && s.chipActive]} onPress={() => setPriority(p)}>
              <Text style={[s.chipText, priority === p && s.chipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Approved Budget (₹) *</Text>
        <TextInput style={s.input} value={budget} onChangeText={setBudget} keyboardType='numeric' placeholder='e.g. 1500000' placeholderTextColor='#90a4ae' />

        <Text style={s.label}>Funding Source</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
          {FUNDING.map(f => (
            <TouchableOpacity key={f} style={[s.chip, funding === f && s.chipActive]} onPress={() => setFunding(f)}>
              <Text style={[s.chipText, funding === f && s.chipTextActive]}>{f.replace(/_/g,' ')}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={s.label}>Target Completion Date * (YYYY-MM-DD)</Text>
        <TextInput style={s.input} value={target} onChangeText={setTarget} placeholder='2026-06-30' placeholderTextColor='#90a4ae' />

        <Text style={s.label}>Governance Resolution ID (optional)</Text>
        <TextInput style={s.input} value={resolutionId} onChangeText={setResolutionId} placeholder='e.g. res-007' placeholderTextColor='#90a4ae' />
        <Text style={s.hint}>Linking to a governance resolution connects the project to its AGM/EGM approval.</Text>

        <TouchableOpacity style={[s.submitBtn, submitting && s.submitBtnDisabled]} onPress={handleSubmit} disabled={submitting}>
          <Text style={s.submitText}>{submitting ? 'Creating...' : '🏗️ Create Project'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 52, backgroundColor: '#1565c0' },
  back: { fontSize: 22, color: '#fff', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  form: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#546e7a', marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 14, color: '#1a1a1a', elevation: 1 },
  textarea: { height: 100 },
  chipRow: { marginBottom: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#e3f2fd', marginRight: 8, marginBottom: 4 },
  priorityChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#e3f2fd', marginRight: 8 },
  chipActive: { backgroundColor: '#1565c0' },
  chipText: { fontSize: 12, color: '#1565c0', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  hint: { fontSize: 11, color: '#90a4ae', marginTop: 4 },
  submitBtn: { backgroundColor: '#1565c0', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 32 },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});