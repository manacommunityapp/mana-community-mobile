import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Linking } from 'react-native';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { toQR } from 'toqr';
import { COLORS, RADIUS, SPACING, SHADOWS } from '@/constants/config';
import { getBrandIconForText } from './BrandIcon';

export interface GatePassData {
  passCode: string;
  visitorName: string;
  flat: string;
  purpose: string;
  vehicleNumber?: string;
  status?: string;
  expectedAt?: string;
}

function QRMatrix({ value, size = 200 }: { value: string; size?: number }) {
  const { rows, cellSize } = useMemo(() => {
    try {
      const data = toQR(value);
      const n = Math.round(Math.sqrt(data.length));
      const r: boolean[][] = [];
      for (let i = 0; i < n; i++) {
        const row: boolean[] = [];
        for (let j = 0; j < n; j++) row.push(data[i * n + j] !== 0);
        r.push(row);
      }
      return { rows: r, cellSize: Math.floor(size / n) };
    } catch {
      return { rows: [] as boolean[][], cellSize: 4 };
    }
  }, [value, size]);

  if (!rows.length) return null;
  return (
    <View style={{ width: size, height: size, backgroundColor: '#fff', padding: 4 }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((on, c) => (
            <View key={c} style={{ width: cellSize, height: cellSize, backgroundColor: on ? '#111827' : '#ffffff' }} />
          ))}
        </View>
      ))}
    </View>
  );
}

interface GatePassQRProps {
  pass: GatePassData;
  onClose?: () => void;
  showCloseButton?: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  EXPECTED:    '#D97706',
  CHECKED_IN:  '#059669',
  CHECKED_OUT: '#6B7280',
  DENIED:      '#DC2626',
};

const STATUS_LABEL: Record<string, string> = {
  EXPECTED:    'Expected',
  CHECKED_IN:  'Inside Gate',
  CHECKED_OUT: 'Departed',
  DENIED:      'Denied',
};

export default function GatePassQR({ pass, onClose, showCloseButton = true }: GatePassQRProps) {
  // QR payload: pass code only — guard scanner looks up details from backend
  const qrPayload = pass.passCode;

  const formatShareMessage = () =>
    `🏠 Mana Community Gate Pass\n` +
    `Visitor: ${pass.visitorName}\n` +
    `Passcode: ${pass.passCode}\n` +
    `Flat: ${pass.flat}\n` +
    `Purpose: ${pass.purpose}` +
    (pass.vehicleNumber ? `\nVehicle: ${pass.vehicleNumber}` : '') +
    `\n\nShow this pass to the guard at the gate.`;

  const handleShare = async () => {
    try {
      await Share.share({ message: formatShareMessage() });
    } catch {}
  };

  const handleWhatsAppShare = async () => {
    const text = formatShareMessage();
    const waUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const canOpen = await Linking.canOpenURL(waUrl);
      if (canOpen) {
        await Linking.openURL(waUrl);
      } else {
        await Share.share({ message: text });
      }
    } catch {
      await Share.share({ message: text });
    }
  };

  const statusColor = STATUS_COLOR[pass.status ?? ''] ?? COLORS.textMuted;
  const statusLabel = STATUS_LABEL[pass.status ?? ''] ?? pass.status ?? '';

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.badge}>
          <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} />
          <Text style={s.badgeText}>Mana Gate Pass</Text>
        </View>
        {showCloseButton && onClose && (
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Visitor info */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
        {getBrandIconForText(pass.visitorName || pass.purpose, 20)}
        <Text style={s.visitorName}>{pass.visitorName}</Text>
      </View>
      <Text style={s.flat}>{pass.flat}</Text>

      {/* QR code */}
      <View style={s.qrWrap}>
        <QRMatrix value={qrPayload} size={200} />
        <Text style={s.qrHint}>Scan at security checkpoint</Text>
      </View>

      {/* Pass code text (fallback for manual entry) */}
      <View style={s.codeBox}>
        <Text style={s.codeLabel}>Entry Code</Text>
        <Text style={s.codeValue}>{pass.passCode}</Text>
      </View>

      {/* Meta */}
      <View style={s.metaList}>
        <MetaRow icon="clipboard-outline" label="Purpose" value={pass.purpose} />
        {pass.vehicleNumber && (
          <MetaRow icon="car-outline" label="Vehicle" value={pass.vehicleNumber} />
        )}
        {pass.expectedAt && (
          <MetaRow icon="time-outline" label="Expected" value={pass.expectedAt} />
        )}
        {pass.status && (
          <View style={s.metaRow}>
            <Ionicons name="ellipse" size={11} color={statusColor} />
            <Text style={s.metaKey}>Status</Text>
            <Text style={[s.metaVal, { color: statusColor, fontWeight: '700' }]}>{statusLabel}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity style={s.whatsappBtn} onPress={handleWhatsAppShare} activeOpacity={0.8}>
          <FontAwesome6 name="whatsapp" size={16} color="#fff" />
          <Text style={s.whatsappBtnText}>Share on WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.8} hitSlop={4}>
          <Ionicons name="share-social-outline" size={18} color="#475569" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MetaRow({
  icon, label, value,
}: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string;
}) {
  return (
    <View style={s.metaRow}>
      <Ionicons name={icon} size={13} color={COLORS.textMuted} />
      <Text style={s.metaKey}>{label}</Text>
      <Text style={s.metaVal}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: 12,
    ...SHADOWS.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  visitorName: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  flat: { fontSize: 13, color: COLORS.textMuted, marginTop: -4 },

  qrWrap: { alignItems: 'center', gap: 8, paddingVertical: 4 },
  qrHint: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.3 },

  codeBox: {
    alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  codeLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  codeValue: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: 3, marginTop: 2, fontFamily: 'monospace' },

  metaList: { gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaKey: { fontSize: 12, color: COLORS.textMuted, width: 62 },
  metaVal: { flex: 1, fontSize: 12, color: COLORS.text, fontWeight: '600' },

  actions: { marginTop: 4, flexDirection: 'row', gap: SPACING.sm },
  whatsappBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#25D366', borderRadius: RADIUS.lg, paddingVertical: 13,
  },
  whatsappBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  shareBtn: {
    width: 48, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.lg, paddingVertical: 13,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  shareBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
