import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { T, shadow } from '../../constants/theme';
import { ITEM_AREAS } from '../../constants/config';
import { formatDuration } from '../../utils/items';
import type { TodayAction } from '../../types';
import Svg, { Circle } from 'react-native-svg';

interface CompletionScreenProps {
  completed: number;
  skipped: number;
  deferred: number;
  total: number;
  streak: number;
  actions: TodayAction[];
  statuses: Record<string, string>;
  canUndo: boolean;
  onUndo: () => void;
  onDone: () => void;
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
  streak,
  actions,
  statuses,
  canUndo,
  onUndo,
  onDone,
}: CompletionScreenProps) {
  const pct = total > 0 ? completed / total : 0;
  const displayStreak = streak + (completed > 0 ? 1 : 0);

  const headline = deferred > 0
    ? (completed > 0 ? 'Good progress' : 'Actions deferred')
    : (pct === 1 ? 'Perfect day' : pct >= 0.5 ? 'Good progress' : 'Every step counts');

  const subline = deferred > 0
    ? `${completed} done, ${deferred} for later. Come back when you're ready.`
    : (pct === 1
      ? `All ${total} actions completed. Your consistency is building real momentum.`
      : `${completed} of ${total} actions done today.`);

  const stats = [
    { label: 'Done', value: completed, color: T.green, icon: 'check' as const },
    { label: 'Skipped', value: skipped, color: T.t3, icon: 'fast-forward' as const },
    { label: 'Later', value: deferred, color: T.orange, icon: 'clock' as const },
    { label: 'Streak', value: `${displayStreak}d`, color: T.orange, icon: 'trending-up' as const },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
        </View>

        <View style={styles.actionsList}>
          <Text style={styles.actionsHeader}>ACTIONS</Text>
          {actions.map(a => {
            const s = statuses[a.id] || 'pending';
            const isDone = s === 'done';
            const isSkipped = s === 'skipped';
            const isDeferred = s === 'deferred';
            return (
              <View key={a.id} style={[styles.actionRow, isSkipped && { opacity: 0.5 }]}>
                <View style={[
                  styles.statusDot,
                  {
                    backgroundColor: isDone ? T.green : isDeferred ? T.orange + '20' : 'transparent',
                    borderColor: isDone ? T.green : isDeferred ? T.orange : isSkipped ? T.t3 : T.sep,
                  },
                ]}>
                  {isDone && <Feather name="check" size={10} color="white" />}
                  {isSkipped && <Feather name="fast-forward" size={8} color={T.t3} />}
                  {isDeferred && <Feather name="clock" size={8} color={T.orange} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, isSkipped && { textDecorationLine: 'line-through' as const }]}>
                    {a.title}
                  </Text>
                  {a.duration ? <Text style={styles.actionDur}>{formatDuration(a.duration)}</Text> : null}
                </View>
                <View style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isDone ? T.green + '10' : isDeferred ? T.orange + '10' : isSkipped ? T.sep : T.brand + '08',
                  },
                ]}>
                  <Text style={[
                    styles.statusText,
                    {
                      color: isDone ? T.green : isDeferred ? T.orange : isSkipped ? T.t3 : T.brand,
                    },
                  ]}>
                    {isDone ? 'Done' : isDeferred ? 'Later' : isSkipped ? 'Skipped' : 'Pending'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {canUndo && (
          <Pressable style={styles.undoBtn} onPress={onUndo}>
            <Feather name="rotate-ccw" size={15} color={T.brand} />
            <Text style={styles.undoBtnText}>Undo last action</Text>
          </Pressable>
        )}

        <Pressable style={styles.doneBtn} onPress={onDone}>
          <Text style={styles.doneBtnText}>Done for Today</Text>
        </Pressable>

        <View style={{ height: 60 }} />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  container: { paddingHorizontal: 20, alignItems: 'stretch' },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: T.sep,
    padding: 32,
    alignItems: 'center',
    marginBottom: 14,
    ...shadow.md,
  },
  ringWrap: { width: 100, height: 100, marginBottom: 20, position: 'relative' },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontSize: 28, fontWeight: '800' as const, color: T.text },
  ringLabel: { fontSize: 12, color: T.t3 },
  headline: { fontSize: 24, fontWeight: '700' as const, color: T.text, marginBottom: 6, textAlign: 'center' },
  subline: { fontSize: 15, color: T.t3, marginBottom: 20, textAlign: 'center', lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: 6, width: '100%' },
  statBox: { flex: 1, padding: 10, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800' as const, color: T.text, marginTop: 2 },
  statLabel: { fontSize: 10, color: T.t3 },
  actionsList: {
    backgroundColor: 'white',
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: T.sep,
    overflow: 'hidden',
    marginBottom: 14,
  },
  actionsHeader: { padding: 12, paddingBottom: 8, fontSize: 12, fontWeight: '600' as const, color: T.t3, letterSpacing: 0.5 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: T.sep,
  },
  statusDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { fontSize: 14, fontWeight: '600' as const, color: T.text },
  actionDur: { fontSize: 12, color: T.t3 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' as const },
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
    marginBottom: 10,
  },
  undoBtnText: { fontSize: 14, fontWeight: '600' as const, color: T.brand },
  doneBtn: {
    backgroundColor: T.brand,
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
    ...shadow.lg,
  },
  doneBtnText: { fontSize: 16, fontWeight: '650' as const, color: 'white' },
});
