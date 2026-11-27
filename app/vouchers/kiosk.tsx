import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import NetInfo from '@react-native-community/netinfo';
import { COLORS } from '@/constants/config';
import { mobileVoucherService } from '@/services/voucherService';
import { isVoucherExpired, parseQrString, verifyTotp } from '@/utils/totp';
import type { KioskScanResult, LocalRedemptionRecord } from '@/types/voucher';

const KIOSK_ID = 'kiosk-clubhouse-01';

async function verifyOffline(qrString: string): Promise<KioskScanResult> {
  const parsed = parseQrString(qrString);
  if (!parsed || !parsed.payload.vid || !parsed.payload.uid) {
    return { status: 'REJECTED_SIGNATURE', message: 'Invalid QR format' };
  }
  if (isVoucherExpired(parsed.payload)) {
    return { status: 'REJECTED_EXPIRED', vid: parsed.payload.vid, message: 'Voucher has expired' };
  }

  const campaignTotpSecret = await mobileVoucherService.getCachedCampaignTotpSecret(parsed.payload.cid);
  if (campaignTotpSecret && !verifyTotp(campaignTotpSecret, parsed.totpCode)) {
    return {
      status: 'REJECTED_OTP_MISMATCH',
      vid: parsed.payload.vid,
      message: 'OTP mismatch — possible screenshot or expired frame',
    };
  }

  const existing = await mobileVoucherService.isRedeemedLocally(parsed.payload.vid);
  if (existing) {
    return {
      status: 'REJECTED_ALREADY_REDEEMED',
      vid: parsed.payload.vid,
      message: `Already redeemed at ${new Date(existing.redeemedAt).toLocaleTimeString()}`,
    };
  }

  await mobileVoucherService.saveLocalRedemption({
    vid: parsed.payload.vid,
    uid: parsed.payload.uid,
    redeemedAt: Date.now(),
    kioskId: KIOSK_ID,
    synced: false,
    conflicted: false,
  });

  return {
    status: 'ACCEPTED',
    vid: parsed.payload.vid,
    uid: parsed.payload.uid,
    kioskId: KIOSK_ID,
    message: 'Sample dispensed ✓',
  };
}

export default function KioskScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isOnline, setIsOnline] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<KioskScanResult | null>(null);
  const [records, setRecords] = useState<LocalRedemptionRecord[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const refreshLocal = useCallback(async () => {
    const all = await mobileVoucherService.loadLocalRedemptions();
    setRecords(all.slice(-10).reverse());
  }, []);

  const syncPending = useCallback(async () => {
    const all = await mobileVoucherService.loadLocalRedemptions();
    const pending = all.filter((r) => !r.synced);
    if (pending.length === 0) return;

    try {
      const result = await mobileVoucherService.syncRedemptions({
        kioskId: KIOSK_ID,
        records: pending,
        syncedAt: new Date().toISOString(),
      });
      await mobileVoucherService.applySyncResult(result);
      await refreshLocal();
    } catch {
      // remain queued in MMKV / AsyncStorage until connectivity stabilizes
    }
  }, [refreshLocal]);

  useEffect(() => {
    void refreshLocal();
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = Boolean(state.isConnected);
      setIsOnline(connected);
      if (connected) {
        void syncPending();
      }
    });
    return () => unsubscribe();
  }, [refreshLocal, syncPending]);

  const handleVerify = useCallback(
    async (qrValue: string) => {
      const trimmed = qrValue.trim();
      if (!trimmed || isBusy) return;
      setIsBusy(true);

      try {
        let result: KioskScanResult;
        if (isOnline) {
          try {
            result = await mobileVoucherService.verifyQrOnline(trimmed, KIOSK_ID);
            if (result.status === 'ACCEPTED' && result.vid && result.uid) {
              await mobileVoucherService.saveLocalRedemption({
                vid: result.vid,
                uid: result.uid,
                redeemedAt: Date.now(),
                kioskId: KIOSK_ID,
                synced: true,
                conflicted: false,
              });
            }
          } catch {
            result = await verifyOffline(trimmed);
          }
        } else {
          result = await verifyOffline(trimmed);
        }
        setScanResult(result);
        await refreshLocal();
      } finally {
        setIsBusy(false);
      }
    },
    [isBusy, isOnline, refreshLocal],
  );

  const pendingCount = records.filter((r) => !r.synced).length;
  const accepted = scanResult?.status === 'ACCEPTED';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.statusBar, isOnline ? styles.onlineBar : styles.offlineBar]}>
        <Text style={styles.statusText}>
          {isOnline ? 'Online — Synced' : `Offline — ${pendingCount} pending sync`}
        </Text>
      </View>

      <View style={styles.cameraBox}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              if (!isBusy && data && data !== scanInput) {
                setScanInput(data);
                void handleVerify(data);
              }
            }}
          />
        ) : (
          <TouchableOpacity style={styles.permBtn} onPress={() => void requestPermission()}>
            <Text style={styles.permText}>Enable Camera to Scan Resident QR</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={styles.input}
        value={scanInput}
        onChangeText={setScanInput}
        placeholder="MANA:v1:... (or scan via camera above)"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={styles.verifyBtn}
        onPress={() => void handleVerify(scanInput)}
        disabled={isBusy || !scanInput.trim()}
      >
        <Text style={styles.verifyText}>{isBusy ? 'Verifying…' : 'Verify QR'}</Text>
      </TouchableOpacity>

      {scanResult ? (
        <View style={[styles.resultCard, accepted ? styles.resultOk : styles.resultErr]}>
          <Text style={styles.resultTitle}>{accepted ? 'ACCEPTED' : scanResult.status}</Text>
          <Text style={styles.resultMsg}>{scanResult.message}</Text>
        </View>
      ) : null}

      <View style={styles.logBox}>
        <Text style={styles.logHeader}>Recent Redemptions</Text>
        {records.map((r) => (
          <View key={`${r.vid}-${r.redeemedAt}`} style={styles.logRow}>
            <Text style={styles.logVid}>{r.vid.slice(0, 14)}</Text>
            <Text style={styles.logMeta}>
              {r.conflicted ? 'CONFLICT' : r.synced ? 'SYNCED' : 'PENDING'}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { padding: 16, gap: 12 },
  statusBar: { padding: 12, borderRadius: 10 },
  onlineBar: { backgroundColor: '#064E3B' },
  offlineBar: { backgroundColor: '#78350F' },
  statusText: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
  cameraBox: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permBtn: { padding: 14, backgroundColor: COLORS.primary, borderRadius: 10 },
  permText: { color: '#FFFFFF', fontWeight: '700' },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
    color: '#111827',
  },
  verifyBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  verifyText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  resultCard: { padding: 16, borderRadius: 12, alignItems: 'center' },
  resultOk: { backgroundColor: COLORS.successLight },
  resultErr: { backgroundColor: COLORS.errorLight },
  resultTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  resultMsg: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  logBox: { backgroundColor: '#111827', borderRadius: 12, padding: 14, gap: 8 },
  logHeader: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between' },
  logVid: { color: '#D1D5DB', fontSize: 12 },
  logMeta: { color: '#93C5FD', fontSize: 11, fontWeight: '700' },
});
