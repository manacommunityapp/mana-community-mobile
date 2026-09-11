import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '@/constants/config';

interface StatCardProps {
  emoji:    string;
  label:    string;
  value:    number | string;
  sub?:     string;
  accent?:  string;   // background accent colour
  onPress?: () => void;
}

export function StatCard({ emoji, label, value, sub, accent, onPress }: StatCardProps) {
  const Wrap = onPress ? TouchableOpacity : View;

  return (
    <Wrap
      style={[styles.card, accent ? { borderLeftColor: accent, borderLeftWidth: 4 } : null]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.value, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </Wrap>
  );
}

const styles = StyleSheet.create({
  card:  {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  emoji: { fontSize: 24, marginBottom: 2 },
  value: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  label: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  sub:   { fontSize: 11, color: COLORS.textMuted },
});
