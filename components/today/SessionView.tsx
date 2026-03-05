import { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { T, S, R, shadow } from '../../constants/theme';
import { ITEM_AREAS, PRG, MOODS } from '../../constants/config';
import { formatDuration } from '../../utils/items';
import { pickSessionActions } from '../../utils/today';
import type { TodayAction, MoodValue, JourneyProgress } from '../../types';
import CompletionScreen from './CompletionScreen';

interface MoodOption {
  value: MoodValue;
  label: string;
  icon: string;
  color: string;
}

type SessionStep = 'briefing' | 'mood' | 'actions' | 'complete' | 'summary';

interface UndoEntry {
  actionId: string;
  prevStatus: string | undefined;
}

interface SessionViewProps {
  journeyId: string;
  journeyProgress: JourneyProgress;
  actions: TodayAction[];
  statuses: Record<string, string>;
  streak: number;
  onUpdateStatuses: (statuses: Record<string, string>) => void;
  onRecordCompletion: (actionId: string, status: 'done' | 'skipped') => void;
  onRecordMood: (mood: MoodValue) => void;
  onExit: () => void;
}

function BriefingCard({
  briefingText,
  loading,
  journeyTitle,
  weekNum,
  dayNum,
  onContinue,
  onSkip,
}: {
  briefingText: string;
  loading: boolean;
  journeyTitle: string;
  weekNum: number;
  dayNum: number;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={briefStyles.container}>
      <View style={briefStyles.card}>
        <View style={briefStyles.decorCircle1} />
        <View style={briefStyles.decorCircle2} />

        <View style={briefStyles.inner}>
          <View style={briefStyles.headerRow}>
            <View style={briefStyles.headerIcon}>
              <Feather name="zap" size={14} color="white" />
            </View>
            <Text style={briefStyles.headerLabel}>Morning Briefing</Text>
            <Text style={briefStyles.headerDay}>Day {dayNum} of 7</Text>
          </View>

          <Text style={briefStyles.greeting}>Ready for today</Text>

          {loading ? (
            <View style={briefStyles.loadingRow}>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
              <Text style={briefStyles.loadingText}>Preparing your daily insight...</Text>
            </View>
          ) : (
            <Text style={briefStyles.briefingText}>{briefingText}</Text>
          )}

          {!loading && (
            <Pressable style={briefStyles.continueBtn} onPress={onContinue}>
              <Text style={briefStyles.continueBtnText}>Start Today's Actions</Text>
            </Pressable>
          )}

          <Pressable style={briefStyles.skipBtn} onPress={onSkip}>
            <Text style={briefStyles.skipBtnText}>
              {loading ? 'Skip to actions' : 'Skip briefing'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

function MoodCheck({ onSelect }: { onSelect: (mood: MoodOption) => void }) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={moodStyles.container}>
      <View style={moodStyles.card}>
        <Text style={moodStyles.label}>QUICK CHECK-IN</Text>
        <Text style={moodStyles.title}>How are you feeling?</Text>
        <View style={moodStyles.row}>
          {MOODS.map(m => (
            <Pressable key={m.value} style={moodStyles.option} onPress={() => onSelect(m)}>
              <View style={[moodStyles.iconWrap, { backgroundColor: m.color + '14' }]}>
                <Feather name={m.icon as any} size={26} color={m.color} />
              </View>
              <Text style={moodStyles.optionLabel}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

function ActionCard({
  action,
  isTop,
  onDone,
  onSkip,
  onDefer,
}: {
  action: TodayAction;
  isTop: boolean;
  onDone: () => void;
  onSkip: () => void;
  onDefer: () => void;
}) {
  const area = ITEM_AREAS[action.area];
  const ac = area?.c || T.brand;

  return (
    <Animated.View
      entering={SlideInRight.duration(250)}
      exiting={SlideOutLeft.duration(200)}
      style={[
        actionCardStyles.card,
        { borderTopColor: ac, opacity: isTop ? 1 : 0.6, transform: [{ scale: isTop ? 1 : 0.95 }] },
      ]}
    >
      <View style={actionCardStyles.inner}>
        <View style={[actionCardStyles.iconWrap, { backgroundColor: ac + '14' }]}>
          <Feather name="activity" size={24} color={ac} />
        </View>

        <Text style={actionCardStyles.title}>{action.title}</Text>

        {action.description ? (
          <Text style={actionCardStyles.desc}>{action.description}</Text>
        ) : null}

        {action.duration && action.duration > 0 ? (
          <View style={actionCardStyles.durationBadge}>
            <Feather name="clock" size={12} color={T.t3} />
            <Text style={actionCardStyles.durationText}>{formatDuration(action.duration)}</Text>
          </View>
        ) : null}

        <View style={actionCardStyles.area}>
          <View style={[actionCardStyles.areaDot, { backgroundColor: ac }]} />
          <Text style={actionCardStyles.areaText}>{area?.n || action.area}</Text>
        </View>
      </View>

      <View style={actionCardStyles.btnRow}>
        <Pressable style={[actionCardStyles.actionBtn, actionCardStyles.skipBtn]} onPress={onSkip}>
          <Feather name="fast-forward" size={18} color={T.t3} />
          <Text style={[actionCardStyles.actionBtnText, { color: T.t3 }]}>Skip</Text>
        </Pressable>
        <Pressable style={[actionCardStyles.actionBtn, actionCardStyles.deferBtn]} onPress={onDefer}>
          <Feather name="clock" size={18} color={T.orange} />
          <Text style={[actionCardStyles.actionBtnText, { color: T.orange }]}>Later</Text>
        </Pressable>
        <Pressable style={[actionCardStyles.actionBtn, actionCardStyles.doneBtn]} onPress={onDone}>
          <Feather name="check" size={18} color="white" />
          <Text style={[actionCardStyles.actionBtnText, { color: 'white' }]}>Done</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function ProgressDots({
  actions,
  statuses,
  currentId,
}: {
  actions: TodayAction[];
  statuses: Record<string, string>;
  currentId: string | undefined;
}) {
  return (
    <View style={dotStyles.row}>
      {actions.map(a => {
        const s = statuses[a.id];
        const isCurrent = currentId === a.id;
        const ac = ITEM_AREAS[a.area]?.c || T.brand;
        const bg = s === 'done' ? T.green : s === 'skipped' ? T.t3 : s === 'deferred' ? T.orange : isCurrent ? ac : ac + '28';
        return (
          <View
            key={a.id}
            style={[dotStyles.dot, { backgroundColor: bg, width: isCurrent ? 18 : 7 }]}
          />
        );
      })}
    </View>
  );
}

function UndoToast({ label, onUndo }: { label: string; onUndo: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={undoStyles.wrap}>
      <Pressable style={undoStyles.btn} onPress={onUndo}>
        <Feather name="rotate-ccw" size={14} color={T.brand} />
        <Text style={undoStyles.text}>Undo {label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function SessionView({
  journeyId,
  journeyProgress,
  actions,
  statuses,
  streak,
  onUpdateStatuses,
  onRecordCompletion,
  onRecordMood,
  onExit,
}: SessionViewProps) {
  const [step, setStep] = useState<SessionStep>('briefing');
  const [briefingText, setBriefingText] = useState('');
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [mood, setMood] = useState<MoodOption | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prog = PRG.find(p => p.id === journeyId);
  const weekNum = journeyProgress.current_week;
  const dayNum = journeyProgress.current_day || 1;

  const sessionActions = useMemo(
    () => actions.filter(a => a.type === 'journey' && a.journeyId === journeyId),
    [actions, journeyId]
  );

  const mergedStatuses = useMemo(
    () => ({ ...statuses, ...localStatuses }),
    [statuses, localStatuses]
  );

  const actionDeck = useMemo(
    () => pickSessionActions(sessionActions, mergedStatuses, new Set()),
    [sessionActions, mergedStatuses]
  );

  const completed = sessionActions.filter(a => mergedStatuses[a.id] === 'done').length;
  const skipped = sessionActions.filter(a => mergedStatuses[a.id] === 'skipped').length;
  const deferred = sessionActions.filter(a => mergedStatuses[a.id] === 'deferred').length;
  const sessionHandled = Object.keys(mergedStatuses).filter(k => sessionActions.some(a => a.id === k)).length;

  useEffect(() => {
    loadBriefing();
  }, []);

  async function loadBriefing() {
    setBriefingLoading(true);
    const fallbackText = `${sessionActions.length} actions for your ${prog?.t || 'journey'} session today. Each one builds on the last. Let's make Day ${dayNum} count.`;
    try {
      const res = await fetch('/api/ai/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyTitle: prog?.t || '',
          weekNum,
          dayNum,
          dayTitle: sessionActions[0]?.dayTitle || '',
          actionCount: sessionActions.length,
          streak,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setBriefingText(data.briefing || fallbackText);
    } catch {
      setBriefingText(fallbackText);
    } finally {
      setBriefingLoading(false);
    }
  }

  function flashUndo() {
    setShowUndo(true);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setShowUndo(false), 4000);
  }

  function processAction(status: 'done' | 'skipped' | 'deferred') {
    const action = actionDeck[0];
    if (!action) return;

    setUndoStack(prev => [...prev, { actionId: action.id, prevStatus: mergedStatuses[action.id] }]);
    const newLocal = { ...localStatuses, [action.id]: status };
    setLocalStatuses(newLocal);

    if (status === 'done' || status === 'skipped') {
      onRecordCompletion(action.id, status as 'done' | 'skipped');
    }

    const newMerged = { ...statuses, ...newLocal };
    onUpdateStatuses(newMerged);
    flashUndo();

    if (pickSessionActions(sessionActions, newMerged, new Set()).length === 0) {
      setTimeout(() => setStep('complete'), 300);
    }
  }

  function handleUndo() {
    if (!undoStack.length) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(p => p.slice(0, -1));
    setLocalStatuses(prev => {
      const n = { ...prev };
      if (last.prevStatus === undefined) delete n[last.actionId];
      else n[last.actionId] = last.prevStatus;
      return n;
    });
    const newLocal = { ...localStatuses };
    if (last.prevStatus === undefined) delete newLocal[last.actionId];
    else newLocal[last.actionId] = last.prevStatus;
    onUpdateStatuses({ ...statuses, ...newLocal });

    if (step === 'complete') setStep('actions');
    setShowUndo(false);
  }

  function handleMoodSelect(m: MoodOption) {
    setMood(m);
    onRecordMood(m.value);
    setStep('actions');
  }

  function handleDoneForToday() {
    onExit();
  }

  const sessionTitle = step === 'briefing' ? "Today's Briefing"
    : step === 'mood' ? 'Check-in'
    : step === 'actions' ? `Action ${sessionHandled + 1} of ${sessionActions.length}`
    : step === 'complete' ? 'Session Complete'
    : step === 'summary' ? "Today's Summary" : 'Session';

  const canBack = ['mood', 'actions', 'complete', 'summary'].includes(step);

  function handleBack() {
    if (step === 'mood') setStep('briefing');
    else if (step === 'actions') onExit();
    else if (step === 'complete') { if (undoStack.length) handleUndo(); }
    else if (step === 'summary') setStep('complete');
  }

  return (
    <View style={sessionStyles.container}>
      <View style={[sessionStyles.header, Platform.OS === 'web' && { paddingTop: 12 }]}>
        {canBack && (
          <Pressable style={sessionStyles.backBtn} onPress={handleBack}>
            <Feather name="chevron-left" size={18} color={T.brand} />
            <Text style={sessionStyles.backText}>
              {step === 'mood' ? 'Briefing' : step === 'actions' ? 'Dashboard' : step === 'summary' ? 'Complete' : ''}
            </Text>
          </Pressable>
        )}
        <View style={sessionStyles.headerCenter}>
          <Text style={sessionStyles.headerTitle}>{sessionTitle}</Text>
          {prog && <Text style={sessionStyles.headerSub}>{prog.t}</Text>}
        </View>
        <Pressable style={sessionStyles.exitBtn} onPress={onExit}>
          <Feather name="list" size={14} color={T.t2} />
          <Text style={sessionStyles.exitText}>Dashboard</Text>
        </Pressable>
      </View>

      <View style={sessionStyles.content}>
        {step === 'briefing' && (
          <BriefingCard
            briefingText={briefingText}
            loading={briefingLoading}
            journeyTitle={prog?.t || ''}
            weekNum={weekNum}
            dayNum={dayNum}
            onContinue={() => setStep('mood')}
            onSkip={() => setStep('mood')}
          />
        )}

        {step === 'mood' && (
          <MoodCheck onSelect={handleMoodSelect} />
        )}

        {step === 'actions' && (
          <View style={sessionStyles.actionsWrap}>
            <View style={sessionStyles.cardArea}>
              {actionDeck.slice(0, 2).reverse().map((action, i, arr) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  isTop={i === arr.length - 1}
                  onDone={() => processAction('done')}
                  onSkip={() => processAction('skipped')}
                  onDefer={() => processAction('deferred')}
                />
              ))}
              {actionDeck.length === 0 && (
                <View style={sessionStyles.emptyDeck}>
                  <Feather name="check-circle" size={36} color={T.green} />
                  <Text style={sessionStyles.emptyDeckText}>All actions handled</Text>
                </View>
              )}
            </View>

            <ProgressDots
              actions={sessionActions}
              statuses={mergedStatuses}
              currentId={actionDeck[0]?.id}
            />

            {showUndo && undoStack.length > 0 && (
              <UndoToast
                label={mergedStatuses[undoStack[undoStack.length - 1]?.actionId] || ''}
                onUndo={handleUndo}
              />
            )}
          </View>
        )}

        {step === 'complete' && (
          <CompletionScreen
            completed={completed}
            skipped={skipped}
            deferred={deferred}
            total={sessionActions.length}
            mood={mood}
            streak={streak}
            canUndo={undoStack.length > 0}
            onUndo={handleUndo}
            onSummary={() => setStep('summary')}
          />
        )}

        {step === 'summary' && (
          <DailySummaryView
            actions={sessionActions}
            statuses={mergedStatuses}
            mood={mood}
            streak={streak}
            onDone={handleDoneForToday}
          />
        )}
      </View>
    </View>
  );
}

function DailySummaryView({
  actions,
  statuses,
  mood,
  streak,
  onDone,
}: {
  actions: TodayAction[];
  statuses: Record<string, string>;
  mood: MoodOption | null;
  streak: number;
  onDone: () => void;
}) {
  const completed = actions.filter(a => statuses[a.id] === 'done').length;
  const skippedCount = actions.filter(a => statuses[a.id] === 'skipped').length;
  const deferredCount = actions.filter(a => statuses[a.id] === 'deferred').length;
  const displayStreak = streak + (completed > 0 ? 1 : 0);

  const summaryText = completed === actions.length
    ? `You completed every action today. That kind of consistency is what actually rewires your habits.`
    : deferredCount > 0
    ? `${completed} actions done so far, with ${deferredCount} waiting for later. Come back when you are ready.`
    : `${completed} of ${actions.length} actions completed today. Even partial days build the pathways that make these habits stick.`;

  const stats = [
    { label: 'Done', value: completed, color: T.green, icon: 'check' as const },
    { label: 'Skipped', value: skippedCount, color: T.t3, icon: 'fast-forward' as const },
    { label: 'Later', value: deferredCount, color: T.orange, icon: 'clock' as const },
    { label: 'Streak', value: `${displayStreak}d`, color: T.orange, icon: 'trending-up' as const },
  ];

  return (
    <Animated.View entering={FadeIn.duration(300)} style={summaryStyles.container}>
      <View style={summaryStyles.statsRow}>
        {stats.map(s => (
          <View key={s.label} style={[summaryStyles.statCard, { borderColor: s.color + '20' }]}>
            <Feather name={s.icon} size={14} color={s.color} />
            <Text style={summaryStyles.statValue}>{s.value}</Text>
            <Text style={summaryStyles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {mood && (
        <View style={[summaryStyles.moodRow, { backgroundColor: mood.color + '10' }]}>
          <Feather name={mood.icon as any} size={20} color={mood.color} />
          <View>
            <Text style={summaryStyles.moodLabel}>Feeling {mood.label.toLowerCase()}</Text>
            <Text style={summaryStyles.moodSub}>Logged this morning</Text>
          </View>
        </View>
      )}

      <View style={summaryStyles.actionsList}>
        <Text style={summaryStyles.actionsHeader}>ACTIONS</Text>
        {actions.map(a => {
          const s = statuses[a.id] || 'pending';
          const isDone = s === 'done';
          const isSkipped = s === 'skipped';
          const isDeferred = s === 'deferred';
          return (
            <View key={a.id} style={[summaryStyles.actionRow, isSkipped && { opacity: 0.5 }]}>
              <View style={[
                summaryStyles.statusDot,
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
                <Text style={[summaryStyles.actionTitle, isSkipped && { textDecorationLine: 'line-through' as const }]}>
                  {a.title}
                </Text>
                {a.duration ? <Text style={summaryStyles.actionDur}>{formatDuration(a.duration)}</Text> : null}
              </View>
              <View style={[
                summaryStyles.statusBadge,
                {
                  backgroundColor: isDone ? T.green + '10' : isDeferred ? T.orange + '10' : isSkipped ? T.sep : T.brand + '08',
                },
              ]}>
                <Text style={[
                  summaryStyles.statusText,
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

      <View style={summaryStyles.coachCard}>
        <View style={summaryStyles.coachHeader}>
          <View style={summaryStyles.coachIcon}>
            <Text style={summaryStyles.coachIconText}>M3</Text>
          </View>
          <Text style={summaryStyles.coachLabel}>Coach's Take</Text>
        </View>
        <Text style={summaryStyles.coachText}>{summaryText}</Text>
      </View>

      <Pressable style={summaryStyles.doneBtn} onPress={onDone}>
        <Text style={summaryStyles.doneBtnText}>Done for Today</Text>
      </Pressable>

      <View style={{ height: 60 }} />
    </Animated.View>
  );
}

const sessionStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { fontSize: 13, fontWeight: '600' as const, color: T.brand },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '650' as const, color: T.text, letterSpacing: -0.2 },
  headerSub: { fontSize: 12, color: T.t3 },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: T.fill,
  },
  exitText: { fontSize: 12, fontWeight: '600' as const, color: T.t2 },
  content: { flex: 1, justifyContent: 'center' },
  actionsWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  cardArea: { minHeight: 340 },
  emptyDeck: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyDeckText: { fontSize: 16, fontWeight: '600' as const, color: T.t2, marginTop: 12 },
});

const briefStyles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  card: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: T.brand,
    overflow: 'hidden',
    ...shadow.lg,
  },
  decorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  inner: {},
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: { fontSize: 13, fontWeight: '600' as const, color: 'rgba(255,255,255,0.8)' },
  headerDay: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginLeft: 'auto' as any },
  greeting: { fontSize: 24, fontWeight: '700' as const, color: 'white', letterSpacing: -0.3, lineHeight: 31, marginBottom: 12 },
  briefingText: { fontSize: 16, lineHeight: 26, color: 'rgba(255,255,255,0.9)', marginBottom: 20 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  loadingText: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  continueBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 14,
    padding: 13,
    alignItems: 'center',
  },
  continueBtnText: { fontSize: 16, fontWeight: '650' as const, color: 'white' },
  skipBtn: { padding: 8, alignItems: 'center', marginTop: 6 },
  skipBtnText: { fontSize: 14, fontWeight: '500' as const, color: 'rgba(255,255,255,0.6)' },
});

const moodStyles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: T.sep,
    padding: 28,
    alignItems: 'center',
    ...shadow.sm,
  },
  label: { fontSize: 13, fontWeight: '600' as const, color: T.t3, letterSpacing: 0.5, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700' as const, color: T.text, marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  option: { alignItems: 'center', gap: 6 },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 13, fontWeight: '500' as const, color: T.t3 },
});

const actionCardStyles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    borderTopWidth: 4,
    overflow: 'hidden',
    ...shadow.md,
  },
  inner: { padding: 24, alignItems: 'center' },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700' as const, color: T.text, textAlign: 'center', letterSpacing: -0.3, lineHeight: 26, marginBottom: 6 },
  desc: { fontSize: 14, color: T.t3, textAlign: 'center', marginBottom: 8 },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  durationText: { fontSize: 13, color: T.t3 },
  area: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  areaDot: { width: 8, height: 8, borderRadius: 4 },
  areaText: { fontSize: 12, color: T.t3 },
  btnRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.sep },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16 },
  actionBtnText: { fontSize: 14, fontWeight: '650' as const },
  skipBtn: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: T.sep },
  deferBtn: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: T.sep },
  doneBtn: { backgroundColor: T.green + '10' },
});

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 20 },
  dot: { height: 7, borderRadius: 4 },
});

const undoStyles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: 16 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 0.5,
    borderColor: T.sep,
    ...shadow.sm,
  },
  text: { fontSize: 13, fontWeight: '600' as const, color: T.brand },
});

const summaryStyles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 12,
    alignItems: 'center',
    ...shadow.xs,
  },
  statValue: { fontSize: 20, fontWeight: '800' as const, color: T.text, marginTop: 2 },
  statLabel: { fontSize: 10, fontWeight: '500' as const, color: T.t3 },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, marginBottom: 14 },
  moodLabel: { fontSize: 14, fontWeight: '600' as const, color: T.text },
  moodSub: { fontSize: 12, color: T.t3 },
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
  coachCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: T.sep,
    padding: 18,
    marginBottom: 14,
  },
  coachHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  coachIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: T.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachIconText: { fontSize: 10, fontWeight: '800' as const, color: 'white' },
  coachLabel: { fontSize: 13, fontWeight: '650' as const, color: T.text },
  coachText: { fontSize: 14, lineHeight: 22, color: T.t2 },
  doneBtn: {
    backgroundColor: T.brand,
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
    ...shadow.lg,
  },
  doneBtnText: { fontSize: 16, fontWeight: '650' as const, color: 'white' },
});
