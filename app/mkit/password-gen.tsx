import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Share, Switch, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { generatePassword, type PasswordGenOptions } from '@/utils/mkitCalculators';

export default function PasswordGenScreen() {
  const router = useRouter();
  const [length, setLength] = useState<number>(16);
  const [includeUpper, setIncludeUpper] = useState(true);
  const [includeLower, setIncludeLower] = useState(true);
  const [includeNum, setIncludeNum] = useState(true);
  const [includeSym, setIncludeSym] = useState(true);
  const [avoidAmbiguous, setAvoidAmbiguous] = useState(true);

  const [pwData, setPwData] = useState(() =>
    generatePassword({
      length: 16,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
      avoidAmbiguous: true,
    })
  );

  const regenerate = () => {
    setPwData(
      generatePassword({
        length,
        includeUppercase: includeUpper,
        includeLowercase: includeLower,
        includeNumbers: includeNum,
        includeSymbols: includeSym,
        avoidAmbiguous,
      })
    );
  };

  useEffect(() => {
    regenerate();
  }, [length, includeUpper, includeLower, includeNum, includeSym, avoidAmbiguous]);

  const handleShareOrCopy = async () => {
    try {
      await Share.share({
        message: pwData.password,
        title: 'Generated Password',
      });
    } catch (e: any) {
      Alert.alert('Error', 'Unable to share/copy password');
    }
  };

  const setPreset = (preset: 'pin' | 'standard' | 'high') => {
    if (preset === 'pin') {
      setLength(6);
      setIncludeUpper(false);
      setIncludeLower(false);
      setIncludeNum(true);
      setIncludeSym(false);
      setAvoidAmbiguous(false);
    } else if (preset === 'standard') {
      setLength(16);
      setIncludeUpper(true);
      setIncludeLower(true);
      setIncludeNum(true);
      setIncludeSym(true);
      setAvoidAmbiguous(true);
    } else {
      setLength(24);
      setIncludeUpper(true);
      setIncludeLower(true);
      setIncludeNum(true);
      setIncludeSym(true);
      setAvoidAmbiguous(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Password & PIN Generator</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Password Display Card */}
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Generated Password</Text>
          
          <View style={styles.pwBox}>
            <TextInput
              style={styles.pwText}
              value={pwData.password}
              editable={false}
              selectTextOnFocus
              multiline
            />
            <TouchableOpacity onPress={regenerate} style={styles.regenBtn}>
              <Ionicons name="refresh" size={20} color="#A78BFA" />
            </TouchableOpacity>
          </View>

          {/* Strength Bar */}
          <View style={styles.strengthSection}>
            <View style={styles.strengthRow}>
              <Text style={styles.strengthText}>Strength: <Text style={styles.strengthHighlight}>{pwData.strength}</Text></Text>
              <Text style={styles.entropyText}>{pwData.entropyBits} bits entropy</Text>
            </View>
            <View style={styles.strengthBarBg}>
              <View
                style={[
                  styles.strengthBarFill,
                  {
                    width: `${Math.min(100, Math.max(15, (pwData.score + 1) * 20))}%`,
                    backgroundColor:
                      pwData.score >= 3 ? '#10B981' : pwData.score === 2 ? '#F59E0B' : '#EF4444',
                  },
                ]}
              />
            </View>
          </View>

          {/* Share/Copy Button */}
          <TouchableOpacity style={styles.copyBtn} onPress={handleShareOrCopy} activeOpacity={0.85}>
            <Ionicons name="share-outline" size={18} color="#FFFFFF" />
            <Text style={styles.copyBtnText}>Copy / Share Password</Text>
          </TouchableOpacity>
        </View>

        {/* Options Card */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Quick Presets</Text>
          <View style={styles.presetRow}>
            <TouchableOpacity style={styles.presetBtn} onPress={() => setPreset('standard')}>
              <Text style={styles.presetBtnText}>Standard (16)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => setPreset('pin')}>
              <Text style={styles.presetBtnText}>PIN (6)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => setPreset('high')}>
              <Text style={styles.presetBtnText}>Max (24)</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Length: {length} Characters</Text>
          <View style={styles.lengthRow}>
            <TouchableOpacity
              style={styles.lenBtn}
              onPress={() => setLength(Math.max(4, length - 1))}
            >
              <Ionicons name="remove" size={18} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.lenValue}>{length}</Text>
            <TouchableOpacity
              style={styles.lenBtn}
              onPress={() => setLength(Math.min(48, length + 1))}
            >
              <Ionicons name="add" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Toggle Switches */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>Uppercase (A-Z)</Text>
            <Switch value={includeUpper} onValueChange={setIncludeUpper} trackColor={{ true: '#7C3AED' }} />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>Lowercase (a-z)</Text>
            <Switch value={includeLower} onValueChange={setIncludeLower} trackColor={{ true: '#7C3AED' }} />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>Numbers (0-9)</Text>
            <Switch value={includeNum} onValueChange={setIncludeNum} trackColor={{ true: '#7C3AED' }} />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>Special Symbols (!@#$)</Text>
            <Switch value={includeSym} onValueChange={setIncludeSym} trackColor={{ true: '#7C3AED' }} />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>Avoid Ambiguous (0/O, 1/l)</Text>
            <Switch value={avoidAmbiguous} onValueChange={setAvoidAmbiguous} trackColor={{ true: '#7C3AED' }} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  resultCard: {
    backgroundColor: '#2E1065',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DDD6FE',
    textTransform: 'uppercase',
  },
  pwBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 14,
  },
  pwText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  regenBtn: {
    padding: 6,
  },
  strengthSection: {
    marginBottom: 16,
  },
  strengthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  strengthText: {
    fontSize: 12,
    color: '#DDD6FE',
  },
  strengthHighlight: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  entropyText: {
    fontSize: 11,
    color: '#C4B5FD',
  },
  strengthBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 12,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  lengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  lenBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lenValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 32,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  toggleText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
});
