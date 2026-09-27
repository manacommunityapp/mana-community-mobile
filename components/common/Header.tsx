import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, FONTS } from '@/constants/config';

interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number;
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: HeaderAction[];
  leftIcon?: keyof typeof Ionicons.glyphMap;
  onLeftPress?: () => void;
  branded?: boolean;
}

export function Header({
  title,
  subtitle,
  actions = [],
  leftIcon,
  onLeftPress,
  branded = false,
}: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {leftIcon && onLeftPress && (
          <TouchableOpacity onPress={onLeftPress} hitSlop={8} style={styles.leftBtn}>
            <Ionicons name={leftIcon} size={22} color={COLORS.text} />
          </TouchableOpacity>
        )}
        <View style={styles.titleBlock}>
          {branded ? (
            <View style={styles.brandRow}>
              <View style={styles.brandDot} />
              <Text style={styles.brandTitle}>{title}</Text>
            </View>
          ) : (
            <Text style={styles.title}>{title}</Text>
          )}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      {actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((action, i) => (
            <TouchableOpacity
              key={i}
              onPress={action.onPress}
              hitSlop={8}
              style={styles.actionBtn}
            >
              <Ionicons name={action.icon} size={21} color={COLORS.text} />
              {action.badge != null && action.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {action.badge > 99 ? '99+' : action.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  leftBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  titleBlock: {
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
    fontFamily: FONTS.displayEB,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
    fontFamily: FONTS.displayBold,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
    fontFamily: FONTS.regular,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 1,
    backgroundColor: COLORS.error,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: FONTS.bold,
  },
});
