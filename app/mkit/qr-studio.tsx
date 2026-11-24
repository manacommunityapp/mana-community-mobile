import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Share, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

type QrType = 'upi' | 'url' | 'wifi' | 'text';

export default function QrStudioScreen() {
  const router = useRouter();
  const [type, setType] = useState<QrType>('upi');

  const [upiVpa, setUpiVpa] = useState('sandeep@upi');
  const [upiName, setUpiName] = useState('Sandeep');
  const [upiAmount, setUpiAmount] = useState('500');
  const [url, setUrl] = useState('https://manacommunity.com');
  const [wifiSsid, setWifiSsid] = useState('MyHome_5G');
  const [wifiPass, setWifiPass] = useState('password123');
  const [plainText, setPlainText] = useState('Hello from MKit!');

  const getPayload = (): string => {
    switch (type) {
      case 'upi': {
        const am = upiAmount ? `&am=${encodeURIComponent(upiAmount)}` : '';
        return `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(upiName || 'Payee')}${am}&cu=INR`;
      }
      case 'url':
        return url.startsWith('http') ? url : `https://${url}`;
      case 'wifi':
        return `WIFI:S:${wifiSsid};T:WPA;P:${wifiPass};;`;
      case 'text':
        return plainText;
    }
  };

  const payload = getPayload();
  const qrUri = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(
    payload || 'mana'
  )}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: payload,
        title: 'ManaKit QR Payload',
      });
    } catch {
      Alert.alert('Error', 'Unable to share QR data');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Code Generator</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* QR Display Card */}
        <View style={styles.qrCard}>
          <Text style={styles.qrCardTitle}>Instant Scannable QR Code</Text>
          <View style={styles.qrImageFrame}>
            <Image source={{ uri: qrUri }} style={styles.qrImage} contentFit="contain" />
          </View>
          <Text style={styles.qrCardSub}>Scan with any camera or UPI scanner app</Text>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>Share Encoded Payload</Text>
          </TouchableOpacity>
        </View>

        {/* Type Selector */}
        <View style={styles.typeRow}>
          {[
            { id: 'upi', label: 'UPI Pay' },
            { id: 'url', label: 'URL' },
            { id: 'wifi', label: 'WiFi' },
            { id: 'text', label: 'Text' },
          ].map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.typeBtn, type === t.id && styles.typeBtnActive]}
              onPress={() => setType(t.id as any)}
            >
              <Text style={[styles.typeBtnText, type === t.id && styles.typeBtnTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form Inputs */}
        <View style={styles.inputCard}>
          {type === 'upi' && (
            <>
              <Text style={styles.inputLabel}>UPI VPA / ID</Text>
              <TextInput
                style={styles.textInput}
                value={upiVpa}
                onChangeText={setUpiVpa}
                placeholder="name@okhdfcbank"
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Payee Name</Text>
              <TextInput
                style={styles.textInput}
                value={upiName}
                onChangeText={setUpiName}
                placeholder="Recipient Name"
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Amount in ₹ (Optional)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={upiAmount}
                onChangeText={setUpiAmount}
                placeholder="500"
              />
            </>
          )}

          {type === 'url' && (
            <>
              <Text style={styles.inputLabel}>Website URL</Text>
              <TextInput
                style={styles.textInput}
                value={url}
                onChangeText={setUrl}
                placeholder="https://example.com"
                autoCapitalize="none"
              />
            </>
          )}

          {type === 'wifi' && (
            <>
              <Text style={styles.inputLabel}>WiFi Network (SSID)</Text>
              <TextInput
                style={styles.textInput}
                value={wifiSsid}
                onChangeText={setWifiSsid}
                placeholder="MyHome_WiFi"
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>WiFi Password</Text>
              <TextInput
                style={styles.textInput}
                value={wifiPass}
                onChangeText={setWifiPass}
                placeholder="WPA2 Password"
              />
            </>
          )}

          {type === 'text' && (
            <>
              <Text style={styles.inputLabel}>Message Text</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                multiline
                value={plainText}
                onChangeText={setPlainText}
                placeholder="Enter text..."
              />
            </>
          )}
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
  qrCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  qrCardTitle: {
    color: '#E0E7FF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 14,
  },
  qrImageFrame: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrCardSub: {
    color: '#C7D2FE',
    fontSize: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  typeBtnTextActive: {
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
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
});
