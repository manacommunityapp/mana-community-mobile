import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePreventScreenCapture } from 'expo-screen-capture';
import Svg, { Circle, Rect } from 'react-native-svg';
import { COLORS } from '@/constants/config';
import type { SampleVoucher, SignedVoucherToken } from '@/types/voucher';
import { encodeQrString, generateTotp, isVoucherExpired } from '@/utils/totp';

interface AnimatedQrModalProps {
  visible: boolean;
  voucher: SampleVoucher | null;
  token: SignedVoucherToken | null;
  onClose: () => void;
}

const TOTP_PERIOD = 30;

function QrGuardView({
  voucher,
  token,
  onClose,
}: {
  voucher: SampleVoucher;
  token: SignedVoucherToken;
  onClose: () => void;
}) {
  // Blocks Android screenshots/recordings (FLAG_SECURE) and alerts on iOS while live QR is open
  usePreventScreenCapture('mana_voucher_live_qr');

  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const now = Math.floor(Date.now() / 1000);
    return TOTP_PERIOD - (now % TOTP_PERIOD);
  });
  const [otp, setOtp] = useState<string>(() => generateTotp(token.totpSecret));
  const [qrString, setQrString] = useState<string>(() =>
    encodeQrString(token, generateTotp(token.totpSecret)),
  );

  useEffect(() => {
    const refresh = () => {
      const epoch = Math.floor(Date.now() / 1000);
      const rem = TOTP_PERIOD - (epoch % TOTP_PERIOD);
      const nextOtp = generateTotp(token.totpSecret, epoch);
      setSecondsLeft(rem);
      setOtp(nextOtp);
      setQrString(encodeQrString(token, nextOtp));
    };

    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [token]);

  const expired = isVoucherExpired(token.payload);
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - secondsLeft / TOTP_PERIOD);

  // Deterministic visual grid seeded from rotating qrString
  const cells = 21;
  const cellPx = 8;
  const blocks: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const code = qrString.charCodeAt((r * cells + c) % Math.max(1, qrString.length)) || 0;
      if ((code + r * 3 + c * 7) % 3 !== 0) {
        blocks.push({ r, c });
      }
    }
  }

  return (
    <View style={styles.sheet}>
      <Text style={styles.brand}>{voucher.brandName}</Text>
      <Text style={styles.title}>{voucher.productName}</Text>

      <View style={styles.ringWrap}>
        <Svg width={60} height={60}>
          <Circle cx={30} cy={30} r={radius} stroke="#E5E7EB" strokeWidth={4} fill="none" />
          <Circle
            cx={30}
            cy={30}
            r={radius}
            stroke={secondsLeft <= 5 ? COLORS.error : COLORS.success}
            strokeWidth={4}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            fill="none"
            rotation="-90"
            origin="30, 30"
          />
        </Svg>
        <Text style={[styles.ringText, secondsLeft <= 5 && styles.ringTextDanger]}>
          {secondsLeft}s
        </Text>
      </View>

      <View style={styles.qrFrame}>
        <Svg width={cells * cellPx} height={cells * cellPx}>
          <Rect x={0} y={0} width={cells * cellPx} height={cells * cellPx} fill="#FFFFFF" />
          {blocks.map((b) => (
            <Rect
              key={`${b.r}-${b.c}`}
              x={b.c * cellPx}
              y={b.r * cellPx}
              width={cellPx}
              height={cellPx}
              fill="#111827"
            />
          ))}
        </Svg>
      </View>

      <Text style={styles.otp}>{otp}</Text>
      <Text style={styles.qrRaw} numberOfLines={2}>
        {qrString}
      </Text>
      <Text style={styles.guardNote}>
        Screen capture blocked · Rotates every 30s
      </Text>

      {expired ? (
        <View style={styles.expiredBanner}>
          <Text style={styles.expiredText}>EXPIRED</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeBtnText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

export function AnimatedQrModal({ visible, voucher, token, onClose }: AnimatedQrModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {visible && voucher && token ? (
          <QrGuardView voucher={voucher} token={token} onClose={onClose} />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  brand: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  ringWrap: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  ringText: {
    position: 'absolute',
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.success,
  },
  ringTextDanger: {
    color: COLORS.error,
  },
  qrFrame: {
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  otp: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 6,
    color: COLORS.text,
    marginBottom: 6,
  },
  qrRaw: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  guardNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 14,
  },
  expiredBanner: {
    backgroundColor: COLORS.errorLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  expiredText: {
    color: COLORS.errorDark,
    fontWeight: '800',
    fontSize: 13,
  },
  closeBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
