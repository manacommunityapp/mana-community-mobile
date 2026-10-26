import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SHADOWS } from '@/constants/config';

// ── Types ────────────────────────────────────────────────────────
export interface ResidentPassCardProps {
  /** Full name of the resident (e.g. "Rohan Pillai") */
  residentName: string;
  /** Flat / unit identifier (e.g. "Flat 4B") */
  flatNumber?: string;
  /** Tower / block (e.g. "Tower B") */
  tower?: string;
  /** Community name (e.g. "Mana Heights") */
  communityName?: string;
  /** Whether the resident's dues are fully paid this month */
  duesPaid?: boolean;
  /** Outstanding dues amount in ₹ (shown if duesPaid is false) */
  dueAmount?: number;
  /** Mana loyalty points to display */
  manaPoints?: number;
  /** Short resident ID used inside the QR modal */
  residentId?: string;
}

// ── Dot-grid pattern via tiny circles ───────────────────────────
function DotGrid() {
  const dots = Array.from({ length: 40 });
  return (
    <View style={dotStyles.wrap} pointerEvents="none">
      {dots.map((_, i) => (
        <View key={i} style={dotStyles.dot} />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 12,
    opacity: 0.07,
    overflow: 'hidden',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ffffff',
  },
});

// ── Placeholder QR — no external library needed ──────────────────
function PlaceholderQR({ residentId }: { residentId: string }) {
  return (
    <View style={qrStyles.wrap}>
      <View style={qrStyles.outerFrame}>
        {/* Simple grid of cells to mimic a QR pattern */}
        <View style={qrStyles.cellGrid}>
          {Array.from({ length: 64 }).map((_, i) => {
            // deterministic "random" based on index + first char of ID
            const seed = (i * 7 + residentId.charCodeAt(0)) % 17;
            const filled = seed < 9;
            return (
              <View
                key={i}
                style={[qrStyles.cell, filled && qrStyles.cellFilled]}
              />
            );
          })}
        </View>
        {/* Corner markers */}
        <View style={[qrStyles.corner, qrStyles.cornerTL]} />
        <View style={[qrStyles.corner, qrStyles.cornerTR]} />
        <View style={[qrStyles.corner, qrStyles.cornerBL]} />
      </View>
      <Text style={qrStyles.label}>{residentId}</Text>
    </View>
  );
}

const qrStyles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10 },
  outerFrame: {
    width: 160,
    height: 160,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    position: 'relative',
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  cellGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  cell: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  cellFilled: {
    backgroundColor: '#1E1B4B',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 4,
    borderColor: '#1E1B4B',
    backgroundColor: 'transparent',
  },
  cornerTL: { top: 10, left: 10 },
  cornerTR: { top: 10, right: 10 },
  cornerBL: { bottom: 10, left: 10 },
  label: {
    fontFamily: FONTS.displayBold,
    fontSize: 14,
    letterSpacing: 3,
    color: '#1E1B4B',
    textTransform: 'uppercase',
  },
});

// ── QR Modal ─────────────────────────────────────────────────────
function QRModal({
  visible,
  onClose,
  residentName,
  flatNumber,
  tower,
  residentId,
}: {
  visible: boolean;
  onClose: () => void;
  residentName: string;
  flatNumber?: string;
  tower?: string;
  residentId: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={modalStyles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={modalStyles.sheet}>
            {/* Handle */}
            <View style={modalStyles.handle} />

            <Text style={modalStyles.title}>Resident QR Pass</Text>
            <Text style={modalStyles.subtitle}>
              Show this at the gate for verified entry
            </Text>

            {/* QR */}
            <View style={modalStyles.qrWrap}>
              <PlaceholderQR residentId={residentId} />
            </View>

            {/* Info */}
            <View style={modalStyles.infoRow}>
              <View style={modalStyles.infoItem}>
                <Text style={modalStyles.infoLabel}>NAME</Text>
                <Text style={modalStyles.infoValue}>{residentName}</Text>
              </View>
              {flatNumber && (
                <View style={modalStyles.infoItem}>
                  <Text style={modalStyles.infoLabel}>FLAT</Text>
                  <Text style={modalStyles.infoValue}>{flatNumber}</Text>
                </View>
              )}
              {tower && (
                <View style={modalStyles.infoItem}>
                  <Text style={modalStyles.infoLabel}>TOWER</Text>
                  <Text style={modalStyles.infoValue}>{tower}</Text>
                </View>
              )}
            </View>

            <View style={modalStyles.verifiedRow}>
              <View style={modalStyles.verifiedDot} />
              <Text style={modalStyles.verifiedText}>Verified Resident</Text>
            </View>

            <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={modalStyles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 20,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 20,
    color: '#1E1B4B',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  qrWrap: {
    marginBottom: 24,
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
    justifyContent: 'center',
  },
  infoItem: { alignItems: 'center', gap: 2 },
  infoLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: '#94A3B8',
  },
  infoValue: {
    fontFamily: FONTS.displayBold,
    fontSize: 14,
    color: '#1E1B4B',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginBottom: 24,
  },
  verifiedDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  verifiedText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#065F46',
  },
  closeBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: RADIUS.xl,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  closeBtnText: {
    fontFamily: FONTS.displayBold,
    fontSize: 15,
    color: '#fff',
  },
});

// ── Main Card ─────────────────────────────────────────────────────
export function ResidentPassCard({
  residentName,
  flatNumber,
  tower,
  communityName,
  duesPaid = true,
  dueAmount,
  manaPoints = 0,
  residentId,
}: ResidentPassCardProps) {
  const [qrVisible, setQrVisible] = useState(false);

  const displayId = residentId ?? 'MNA-0001';
  const towerFlat = [tower, flatNumber].filter(Boolean).join(' · ');
  const location = [towerFlat, communityName].filter(Boolean).join(', ');

  return (
    <>
      <LinearGradient
        colors={['#4338CA', '#6D28D9', '#9333EA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Decorative glow orb */}
        <View style={styles.glowOrb} pointerEvents="none" />

        {/* Dot pattern */}
        <DotGrid />

        {/* Card Content */}
        <View style={styles.content}>
          {/* Top row */}
          <View style={styles.topRow}>
            <Text style={styles.eyebrow}>RESIDENT PASS</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#A5F3C4" />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          </View>

          {/* Flat & community */}
          <Text style={styles.flatLine}>{towerFlat || 'Mana Community'}</Text>
          {location !== towerFlat && (
            <Text style={styles.locationLine}>{communityName}</Text>
          )}

          {/* Bottom row — dues + points + QR */}
          <View style={styles.bottomRow}>
            <View style={styles.statsGroup}>
              {/* Dues */}
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Dues</Text>
                {duesPaid ? (
                  <Text style={styles.statValueGreen}>Paid ✓</Text>
                ) : (
                  <Text style={styles.statValueAmber}>
                    ₹{dueAmount?.toLocaleString('en-IN') ?? '–'}
                  </Text>
                )}
              </View>

              {/* Points */}
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Mana Points</Text>
                <Text style={styles.statValueGold}>
                  {manaPoints.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Show QR button */}
            <TouchableOpacity
              style={styles.qrBtn}
              onPress={() => setQrVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="qr-code-outline" size={14} color="#1E1B4B" />
              <Text style={styles.qrBtnText}>Show QR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* QR Modal */}
      <QRModal
        visible={qrVisible}
        onClose={() => setQrVisible(false)}
        residentName={residentName}
        flatNumber={flatNumber}
        tower={tower}
        residentId={displayId}
      />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    ...SHADOWS.lg,
    shadowColor: '#4338CA',
    shadowOpacity: 0.35,
  },
  glowOrb: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FBBF24',
    opacity: 0.18,
    top: -70,
    right: -50,
  },
  content: {
    padding: 20,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eyebrow: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    letterSpacing: 2,
    color: '#FBBF24',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  verifiedBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: '#fff',
  },
  flatLine: {
    fontFamily: FONTS.displayEB,
    fontSize: 20,
    color: '#ffffff',
    letterSpacing: -0.4,
    marginTop: 8,
  },
  locationLine: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(199,210,254,0.85)',
    marginTop: 2,
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statsGroup: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: { gap: 2 },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 9,
    color: 'rgba(199,210,254,0.7)',
    letterSpacing: 0.5,
  },
  statValueGreen: {
    fontFamily: FONTS.displayBold,
    fontSize: 14,
    color: '#6EE7B7',
  },
  statValueAmber: {
    fontFamily: FONTS.displayBold,
    fontSize: 14,
    color: '#FCD34D',
  },
  statValueGold: {
    fontFamily: FONTS.displayEB,
    fontSize: 14,
    color: '#FDE68A',
  },
  qrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FDE68A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.lg,
  },
  qrBtnText: {
    fontFamily: FONTS.displayBold,
    fontSize: 12,
    color: '#1E1B4B',
  },
});
