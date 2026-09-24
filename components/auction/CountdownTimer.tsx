import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '@/constants/config';

interface CountdownTimerProps {
  endTime:   string;         // ISO datetime
  onExpired?: () => void;
  size?:     'sm' | 'md' | 'lg';
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function getSecondsLeft(endTime: string): number {
  return Math.max(0, Math.floor((new Date(endTime).getTime() - Date.now()) / 1000));
}

function getColor(secs: number): string {
  if (secs > 300)  return COLORS.success;  // > 5 min  → green
  if (secs > 60)   return COLORS.warning;  // 1–5 min  → amber
  return COLORS.error;                      // < 1 min  → red
}

function formatTime(secs: number): { h?: string; m: string; s: string; label: string } {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return { h: pad(h), m: pad(m), s: pad(s), label: 'h  m  s' };
  return { m: pad(m), s: pad(s), label: 'm  s' };
}

export function CountdownTimer({ endTime, onExpired, size = 'md' }: CountdownTimerProps) {
  const [secs, setSecs]   = useState(() => getSecondsLeft(endTime));
  const pulseAnim         = useRef(new Animated.Value(1)).current;
  const pulseRef          = useRef<Animated.CompositeAnimation | null>(null);
  const expiredFired      = useRef(false);

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => {
      setSecs(() => {
        const s = getSecondsLeft(endTime);
        if (s === 0 && !expiredFired.current) {
          expiredFired.current = true;
          onExpired?.();
        }
        return s;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [endTime, onExpired]);

  // Pulse when < 10 seconds
  useEffect(() => {
    if (secs <= 10 && secs > 0) {
      pulseRef.current?.stop();
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 400, useNativeDriver: true }),
        ]),
      );
      pulseRef.current.start();
    } else {
      pulseRef.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => pulseRef.current?.stop();
  }, [secs <= 10 && secs > 0]);

  const color    = getColor(secs);
  const { h, m, s, label } = formatTime(secs);

  const fontSize  = size === 'lg' ? 44 : size === 'md' ? 30 : 20;
  const labelSize = size === 'lg' ? 11  : size === 'md' ? 9   : 8;

  if (secs <= 0) {
    return (
      <View style={st.ended}>
        <Text style={[st.endedText, { color: COLORS.error }]}>Auction Ended</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[st.wrap, { transform: [{ scale: pulseAnim }] }]}>
      <View style={[st.box, { borderColor: color + '55', backgroundColor: color + '12' }]}>
        <View style={st.digits}>
          {h !== undefined && (
            <>
              <Text style={[st.num, { fontSize, color }]}>{h}</Text>
              <Text style={[st.colon, { color }]}>:</Text>
            </>
          )}
          <Text style={[st.num, { fontSize, color }]}>{m}</Text>
          <Text style={[st.colon, { color }]}>:</Text>
          <Text style={[st.num, { fontSize, color }]}>{s}</Text>
        </View>
        <Text style={[st.label, { fontSize: labelSize, color }]}>
          {h ? 'hours  mins  secs' : 'mins  secs'}
        </Text>
      </View>
    </Animated.View>
  );
}

// Compact version for list cards
export function CompactCountdown({ endTime, startTime }: { endTime?: string; startTime?: string }) {
  const targetTime = endTime ?? startTime;
  const [secs, setSecs] = useState(() => targetTime ? getSecondsLeft(targetTime) : 0);

  useEffect(() => {
    if (!targetTime) return;
    const id = setInterval(() => setSecs(getSecondsLeft(targetTime)), 1000);
    return () => clearInterval(id);
  }, [targetTime]);

  if (!targetTime || secs <= 0) return null;
  const color = getColor(secs);
  const { h, m, s } = formatTime(secs);

  return (
    <Text style={[cc.text, { color }]}>
      ⏱ {h ? `${h}:` : ''}{m}:{s} {endTime ? 'left' : 'to start'}
    </Text>
  );
}

const st = StyleSheet.create({
  wrap:     { alignItems: 'center' },
  box:      { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', gap: 4 },
  digits:   { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  num:      { fontWeight: '900', fontVariant: ['tabular-nums'] as any },
  colon:    { fontSize: 28, fontWeight: '800', lineHeight: 38, opacity: 0.8 },
  label:    { fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
  ended:    { alignItems: 'center', padding: 10 },
  endedText:{ fontSize: 18, fontWeight: '800', letterSpacing: 1 },
});

const cc = StyleSheet.create({
  text: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] as any },
});
