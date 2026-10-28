/**
 * GatePassQR — renders a live QR code + styled gate pass card.
 * Uses `qrcode` (pure JS matrix) so no native modules are needed.
 * The QR encodes a compact JSON payload the guard scanner can verify.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCodeLib from 'qrcode';
import { COLORS, RADIUS, SPACING, SHADOWS } from '@/constants/config';

export interface GatePassData {
  passCode: string;
  visitorName: string;
  flat: string;
  purpose: string;
  vehicleNumber?: string;
  status?: string;
  expectedAt?: string;
}

interface QRMatrixProps {
  value: string;
  size?: number;
}

function QRMatrix({ value, size = 200 }: QRMatrixProps) {
  const { modules, cellSize } = useMemo(() => {
    try {
      const qr = QRCodeLib.create(value, { errorCorrectionLevel: 'M' });
      const n = qr.modules.size;
      const data = qr.modules.data;
      const rows: boolean[][] = [];
      for (let r = 0; r < n; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < n; c++) {
          row.push(!!data[r * n + c]);
        }
        rows.push(row);
      }
      return { modules: rows, cellSize: Math.floor(size / n) };
    } catch {
      return { modules: [] as boolean[][], cellSize: 4 };
    }
  }, [value, size]);

  if (!modules.length) return null;

  return (
    <View style={{ width: size, height: size, backgroundColor: '#fff', padding: 4 }}>
      {modules.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((on, c) => (
            <View
              key={c}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: on ? '#111827' : '#ffffff',
              }}
            />
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

  const handleShare = async () => {
    await Share.share({
      message:
        `🏠 Mana Community Gate Pass\n` +
        `Visitor: ${pass.visitorName}\n` +
        `Passcode: ${pass.passCode}\n` +
        `Flat: ${pass.flat}\n` +
        `Purpose: ${pass.purpose}` +
        (pass.vehicleNumber ? `\nVehicle: ${pass.vehicleNumber}` : '') +
        `\n\nShow this pass to the guard at the gate.`,
    });
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
      <Text style={s.visitorName}>{pass.visitorName}</Text>
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
        <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={16} color="#fff" />
          <Text style={s.shareBtnText}>Share Pass</Text>
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

  actions: { marginTop: 4 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 13,
  },
  shareBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
