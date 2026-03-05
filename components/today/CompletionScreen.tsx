import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { T, shadow } from '../../constants/theme';
import type { MoodValue } from '../../types';
import Svg, { Circle } from 'react-native-svg';

interface MoodOption {
  value: MoodValue;
  label: string;
  icon: string;
  color: string;
}

interface CompletionScreenProps {
  completed: number;
  skipped: number;
  deferred: number;
  total: number;
  mood: MoodOption | null;
  streak: number;
  canUndo: boolean;
  onUndo: () => void;
  onSummary: () => void;
}

function ProgressRing({ progress, size, strokeWidth, color }: { progress: number; size: number; strokeWidth: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const center = size / 2;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={T.sep}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${center}, ${center}`}
      />
    </Svg>
  );
}

export default function CompletionScreen({
  completed,
  skipped,
  deferred,
  total,
  mood,
  streak,
  canUndo,
  onUndo,
  onSummary,
}: CompletionScreenProps) {
  const pct = total > 0 ? completed / total : 0;
  const headline = deferred > 0
    ? (completed > 0 ? 'Good progress' : 'Actions deferred')
    : (pct === 1 ? 'Perfect day' : pct >= 0.5 ? 'Good progress' : 'Every step counts');
  const subline = deferred > 0
    ? `${completed} done, ${deferred} for later. You can complete them anytime from the Today tab.`
    : (pct === 1
      ? `All ${total} actions completed. Your consistency is building real momentum.`
      : `${completed} of ${total} actions done today.`);
  const displayStreak = streak + (completed > 0 ? 1 : 0);

  const stats = [
    { label: 'Done', value: completed, color: T.green, icon: 'check' as const },
    { label: 'Skipped', value: skipped, color: T.t3, icon: 'fast-forward' as const },
    { label: 'Later', value: deferred, color: T.orange, icon: 'clock' as const },
    { label: 'Streak', value: `${displayStreak}d`, color: T.orange, icon: 'trending-up' as const },
  ];

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <View style={styles.card}>
        <View style={styles.ringWrap}>
          <ProgressRing progress={pct} size={100} strokeWidth={6} color={pct === 1 ? T.green : T.brand} />
          <View style={styles.ringCenter}>
            <Text style={styles.ringValue}>{completed}</Text>
            <Text style={styles.ringLabel}>of {total}</Text>
          </View>
        </View>

        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.subline}>{subline}</Text>

        <View style={styles.statsRow}>
          {stats.map(s => (
            <View key={s.label} style={[styles.statBox, { backgroundColor: s.color + '08' }]}>
              <Feather name={s.icon} size={14} color={s.color} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {mood && (
          <View style={[styles.moodRow, { backgroundColor: mood.color + '10' }]}>
            <Feather name={mood.icon as any} size={20} color={mood.color} />
            <Text style={styles.moodText}>Feeling {mood.label.toLowerCase()} today</Text>
          </View>
        )}

        {canUndo && (
          <Pressable style={styles.undoBtn} onPress={onUndo}>
            <Feather name="rotate-ccw" size={15} color={T.brand} />
            <Text style={styles.undoBtnText}>Undo last action</Text>
          </Pressable>
        )}

        <Pressable style={styles.summaryBtn} onPress={onSummary}>
          <Text style={styles.summaryBtnText}>View Today's Summary</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, alignItems: 'center' },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: T.sep,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    ...shadow.md,
  },
  ringWrap: { width: 100, height: 100, marginBottom: 20, position: 'relative' },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontSize: 28, fontWeight: '800' as const, color: T.text },
  ringLabel: { fontSize: 12, color: T.t3 },
  headline: { fontSize: 24, fontWeight: '700' as const, color: T.text, marginBottom: 6, textAlign: 'center' },
  subline: { fontSize: 15, color: T.t3, marginBottom: 20, textAlign: 'center', lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: 6, marginBottom: 20, width: '100%' },
  statBox: { flex: 1, padding: 10, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800' as const, color: T.text, marginTop: 2 },
  statLabel: { fontSize: 10, color: T.t3 },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  moodText: { fontSize: 14, color: T.t2 },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: T.sep,
    backgroundColor: 'white',
    width: '100%',
    marginBottom: 10,
  },
  undoBtnText: { fontSize: 14, fontWeight: '600' as const, color: T.brand },
  summaryBtn: {
    backgroundColor: T.brand,
    borderRadius: 14,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    ...shadow.lg,
  },
  summaryBtnText: { fontSize: 16, fontWeight: '650' as const, color: 'white' },
});
