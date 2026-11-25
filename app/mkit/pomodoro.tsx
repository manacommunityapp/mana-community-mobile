import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Vibration
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

export default function PomodoroScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<TimerMode>('work');
  const [workMinutes, setWorkMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);

  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [taskName, setTaskName] = useState('');

  const intervalRef = useRef<any>(null);

  const getDuration = (m: TimerMode): number => {
    switch (m) {
      case 'work': return workMinutes * 60;
      case 'shortBreak': return shortBreakMinutes * 60;
      case 'longBreak': return longBreakMinutes * 60;
    }
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            Vibration.vibrate([0, 500, 200, 500]);

            if (mode === 'work') {
              const nextCount = completedSessions + 1;
              setCompletedSessions(nextCount);
              if (nextCount % 4 === 0) {
                setMode('longBreak');
                return longBreakMinutes * 60;
              } else {
                setMode('shortBreak');
                return shortBreakMinutes * 60;
              }
            } else {
              setMode('work');
              return workMinutes * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, completedSessions, workMinutes, shortBreakMinutes, longBreakMinutes]);

  const switchMode = (m: TimerMode) => {
    setIsRunning(false);
    setMode(m);
    setTimeLeft(getDuration(m));
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(getDuration(mode));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const total = getDuration(mode);
  const progressPercent = Math.min(100, Math.max(0, ((total - timeLeft) / total) * 100));

  const modeTheme = {
    work: { bg: '#881337', btn: '#E11D48', label: 'Focus Work Session' },
    shortBreak: { bg: '#134E4A', btn: '#0D9488', label: 'Short Break (Rest)' },
    longBreak: { bg: '#1E1B4B', btn: '#4F46E5', label: 'Long Break (Refresh)' },
  }[mode];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pomodoro Focus Timer</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Clock Card */}
        <View style={[styles.timerCard, { backgroundColor: modeTheme.bg }]}>
          {/* Mode Tabs */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'work' && styles.modeTabActive]}
              onPress={() => switchMode('work')}
            >
              <Text style={styles.modeTabText}>Focus</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'shortBreak' && styles.modeTabActive]}
              onPress={() => switchMode('shortBreak')}
            >
              <Text style={styles.modeTabText}>Short Break</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'longBreak' && styles.modeTabActive]}
              onPress={() => switchMode('longBreak')}
            >
              <Text style={styles.modeTabText}>Long Break</Text>
            </TouchableOpacity>
          </View>

          {/* Big Time */}
          <View style={styles.timeWrap}>
            <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
            <Text style={styles.timeModeLabel}>{modeTheme.label}</Text>

            {/* Progress bar */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={handleReset} style={styles.iconBtn}>
              <Ionicons name="reload" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsRunning(!isRunning)}
              style={[styles.playBtn, { backgroundColor: modeTheme.btn }]}
            >
              <Ionicons name={isRunning ? 'pause' : 'play'} size={24} color="#FFFFFF" />
              <Text style={styles.playBtnText}>{isRunning ? 'Pause' : 'Start Focus'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => switchMode(mode === 'work' ? 'shortBreak' : 'work')}
              style={styles.iconBtn}
            >
              <Ionicons name="play-skip-forward" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats & Goals */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Current Focus Objective</Text>
          <TextInput
            style={styles.textInput}
            value={taskName}
            onChangeText={setTaskName}
            placeholder="e.g. Read chapters, review pull requests..."
          />

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Completed Cycles</Text>
              <Text style={styles.statValue}>{completedSessions}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Minutes Focused</Text>
              <Text style={[styles.statValue, { color: '#E11D48' }]}>
                {completedSessions * workMinutes}m
              </Text>
            </View>
          </View>
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
  timerCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 24,
  },
  modeTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  timeWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  timeText: {
    fontSize: 64,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#FFFFFF',
  },
  timeModeLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginTop: 4,
  },
  progressBarBg: {
    width: 200,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  playBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
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
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
});
