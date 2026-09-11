import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '@/constants/config';

interface AnimatedBarProps {
  label:       string;
  count:       number;
  total:       number;
  isSelected:  boolean;   // user voted for this option
  isWinning:   boolean;   // highest vote count
  delay?:      number;    // stagger offset in ms
  showCount?:  boolean;
}

export function AnimatedBar({
  label, count, total, isSelected, isWinning,
  delay = 0, showCount = true,
}: AnimatedBarProps) {
  const pct     = total > 0 ? Math.round((count / total) * 100) : 0;
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue:        pct,
      duration:       600,
      delay,
      useNativeDriver: false,   // width animation can't use native driver
    }).start();
  }, [pct, delay]);

  const barColor = isSelected
    ? COLORS.primary          // indigo — your vote
    : isWinning
    ? COLORS.success          // green — leading option
    : '#D1D5DB';              // gray — other options

  return (
    <View style={s.row}>
      {/* Checkmark for your vote */}
      <View style={s.checkWrap}>
        {isSelected
          ? <Text style={s.check}>✓</Text>
          : <View style={s.checkEmpty} />
        }
      </View>

      {/* Option text + bar */}
      <View style={s.barCol}>
        <View style={s.labelRow}>
          <Text style={[s.label, isSelected && s.labelSelected, isWinning && s.labelWinning]} numberOfLines={2}>
            {label}
          </Text>
          <Text style={[s.pct, isSelected && s.pctSelected]}>
            {pct}%
          </Text>
        </View>

        {/* Track */}
        <View style={s.track}>
          <Animated.View
            style={[
              s.fill,
              {
                backgroundColor: barColor,
                width: widthAnim.interpolate({
                  inputRange:  [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {showCount && (
          <Text style={s.count}>
            {count} vote{count !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row:          { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  checkWrap:    { width: 20, paddingTop: 1 },
  check:        { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  checkEmpty:   { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: COLORS.border, marginTop: 2 },
  barCol:       { flex: 1, gap: 4 },
  labelRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  label:        { fontSize: 14, color: COLORS.text, fontWeight: '500', flex: 1, lineHeight: 19 },
  labelSelected:{ color: COLORS.primary, fontWeight: '700' },
  labelWinning: { fontWeight: '700' },
  pct:          { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, minWidth: 34, textAlign: 'right' },
  pctSelected:  { color: COLORS.primary },
  track:        { height: 8, borderRadius: 4, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  fill:         { height: '100%', borderRadius: 4 },
  count:        { fontSize: 11, color: COLORS.textMuted },
});
