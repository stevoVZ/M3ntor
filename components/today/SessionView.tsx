import { useState, useRef, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { T, S, R, shadow } from '../../constants/theme';
import { ITEM_AREAS, KIND_CONFIG } from '../../constants/config';
import { formatDuration } from '../../utils/items';
import { pickSessionActions } from '../../utils/today';
import type { TodayAction } from '../../types';
import CompletionScreen from './CompletionScreen';

type SessionStep = 'actions' | 'complete';

interface UndoEntry {
  actionId: string;
  prevStatus: string | undefined;
}

interface SessionViewProps {
  actions: TodayAction[];
  statuses: Record<string, string>;
  streak: number;
  onUpdateStatuses: (statuses: Record<string, string>) => void;
  onRecordCompletion: (actionId: string, status: 'done' | 'skipped') => void;
  onExit: () => void;
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
  const typeConfig = KIND_CONFIG[action.type] || KIND_CONFIG.action;
  const typeIcon = action.type === 'habit' ? 'repeat' : action.type === 'project' ? 'folder' : action.type === 'journey' ? 'compass' : 'check-circle';

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
          <Feather name={typeIcon as any} size={24} color={ac} />
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

        <View style={actionCardStyles.meta}>
          <View style={[actionCardStyles.areaDot, { backgroundColor: ac }]} />
          <Text style={actionCardStyles.areaText}>{area?.n || action.area}</Text>
          <View style={[actionCardStyles.typeBadge, { backgroundColor: (typeConfig.color || T.brand) + '10' }]}>
            <Text style={[actionCardStyles.typeText, { color: typeConfig.color || T.brand }]}>
              {action.type === 'habit' ? 'Habit' : action.type === 'project' ? 'Project' : action.type === 'journey' ? 'Journey' : 'Action'}
            </Text>
          </View>
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
  actions,
  statuses,
  streak,
  onUpdateStatuses,
  onRecordCompletion,
  onExit,
}: SessionViewProps) {
  const [step, setStep] = useState<SessionStep>('actions');
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionActions = actions;

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
  const handled = sessionActions.filter(a => mergedStatuses[a.id]).length;

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

    const remaining = sessionActions.filter(a => !newMerged[a.id]);
    if (remaining.length === 0) {
      setTimeout(() => setStep('complete'), 300);
    }
  }

  function handleUndo() {
    if (!undoStack.length) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(p => p.slice(0, -1));

    let computedLocal: Record<string, string> = {};
    setLocalStatuses(prev => {
      const n = { ...prev };
      if (last.prevStatus === undefined) delete n[last.actionId];
      else n[last.actionId] = last.prevStatus;
      computedLocal = n;
      return n;
    });
    onUpdateStatuses({ ...statuses, ...computedLocal });

    if (step === 'complete') setStep('actions');
    setShowUndo(false);
  }

  const sessionTitle = step === 'actions'
    ? `${handled + 1} of ${sessionActions.length}`
    : 'Session Complete';

  return (
    <View style={sessionStyles.container}>
      <View style={[sessionStyles.header, Platform.OS === 'web' && { paddingTop: 12 }]}>
        <Pressable style={sessionStyles.backBtn} onPress={onExit}>
          <Feather name="chevron-left" size={18} color={T.brand} />
          <Text style={sessionStyles.backText}>Dashboard</Text>
        </Pressable>
        <View style={sessionStyles.headerCenter}>
          <Text style={sessionStyles.headerTitle}>{sessionTitle}</Text>
          <Text style={sessionStyles.headerSub}>Daily M3NTOR</Text>
        </View>
        <Pressable style={sessionStyles.exitBtn} onPress={onExit}>
          <Feather name="list" size={14} color={T.t2} />
          <Text style={sessionStyles.exitText}>Dashboard</Text>
        </Pressable>
      </View>

      <View style={sessionStyles.content}>
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
            streak={streak}
            actions={sessionActions}
            statuses={mergedStatuses}
            canUndo={undoStack.length > 0}
            onUndo={handleUndo}
            onDone={onExit}
          />
        )}
      </View>
    </View>
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
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  areaDot: { width: 8, height: 8, borderRadius: 4 },
  areaText: { fontSize: 12, color: T.t3 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  typeText: { fontSize: 11, fontWeight: '600' as const },
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
