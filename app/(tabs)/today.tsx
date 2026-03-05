import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useStore } from '../../lib/store';
import { T, S, F, R, shadow } from '../../constants/theme';
import { ITEM_AREAS, KIND_CONFIG, PRG, JOURNEY_ICONS } from '../../constants/config';
import { itemKind, projectProgress, formatRecurrence, formatDuration } from '../../utils/items';
import { greetingForTime, formatDeadline, isOverdue } from '../../utils/dates';
import { getTodayActions, groupByTimeOfDay, sortedTimeSlots, timeSlotLabel, timeSlotIcon } from '../../utils/today';
import SessionView from '../../components/today/SessionView';
import M3ntorIcon from '../../components/M3ntorIcon';
import type { Item, TodayAction, TimeOfDay, JourneyProgress, MoodValue } from '../../types';

function TimeSlotIcon({ slot, size }: { slot: TimeOfDay; size: number }) {
  const iconName = timeSlotIcon(slot);
  const colorMap: Record<string, string> = {
    sunrise: '#FFB100',
    sun: '#FF9500',
    moon: T.brand,
    clock: T.t3,
  };
  return <Feather name={iconName as any} size={size} color={colorMap[iconName] || T.t3} />;
}

function ActionCheckbox({ done, color, onToggle }: { done: boolean; color: string; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={[styles.checkbox, done ? { backgroundColor: T.green, borderColor: T.green } : { borderColor: color + '40' }]}>
      {done && <Feather name="check" size={11} color="white" />}
    </Pressable>
  );
}

function ActionRow({ action, done, onToggle }: { action: TodayAction; done: boolean; onToggle: () => void }) {
  const area = ITEM_AREAS[action.area];
  const typeConfig = KIND_CONFIG[action.type] || KIND_CONFIG.action;

  return (
    <View style={[styles.actionRow, done && { opacity: 0.45 }]}>
      <ActionCheckbox done={done} color={typeConfig.color} onToggle={onToggle} />
      <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => {
        if (action.sourceItemId) router.push(`/item/${action.sourceItemId}`);
      }}>
        <View style={styles.actionRowContent}>
          <Text style={[styles.actionTitle, done && styles.actionTitleDone]} numberOfLines={2}>
            {action.title}
          </Text>
          {action.duration && action.duration > 0 && !done && (
            <Text style={styles.actionDuration}>{formatDuration(action.duration)}</Text>
          )}
        </View>
        {action.description && !done ? (
          <Text style={styles.actionDesc} numberOfLines={1}>{action.description}</Text>
        ) : null}
      </Pressable>
    </View>
  );
}

function JourneyCard({
  jp,
  actions,
  statuses,
  onToggle,
  onStartSession,
}: {
  jp: JourneyProgress;
  actions: TodayAction[];
  statuses: Record<string, string>;
  onToggle: (id: string) => void;
  onStartSession: (journeyId: string) => void;
}) {
  const prog = PRG.find(p => p.id === jp.journey_id);
  if (!prog) return null;

  const area = ITEM_AREAS[prog.a];
  const ac = area?.c || T.brand;
  const journeyActions = actions.filter(a => a.journeyId === jp.journey_id);
  const doneCount = journeyActions.filter(a => statuses[a.id] === 'done').length;
  const allDone = journeyActions.length > 0 && doneCount === journeyActions.length;
  const totalMins = journeyActions.reduce((sum, a) => sum + (a.duration || 0), 0);
  const weekNum = jp.current_week;
  const dayTitle = journeyActions[0]?.dayTitle || '';

  return (
    <View style={[styles.journeyCard, { borderLeftColor: ac }]}>
      <View style={styles.journeyHeader}>
        <View style={[styles.journeyIcon, { backgroundColor: ac + '14' }]}>
          {JOURNEY_ICONS[jp.journey_id] ? (
            <Text style={{ fontSize: 22 }}>{JOURNEY_ICONS[jp.journey_id]}</Text>
          ) : (
            <Feather name="compass" size={22} color={ac} />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.journeyTitle} numberOfLines={1}>{prog.t}</Text>
          <View style={styles.journeyMeta}>
            <View style={[styles.weekBadge, { backgroundColor: ac + '12' }]}>
              <Text style={[styles.weekBadgeText, { color: ac }]}>Wk {weekNum}/{prog.w}</Text>
            </View>
            {dayTitle ? <Text style={styles.journeyDayTitle} numberOfLines={1}>{dayTitle}</Text> : null}
          </View>
        </View>
        {allDone ? (
          <View style={[styles.journeyDoneBadge, { backgroundColor: T.green + '12', borderColor: T.green + '20' }]}>
            <Feather name="check" size={11} color={T.green} />
            <Text style={{ fontSize: 12, fontWeight: '700' as const, color: T.green }}>Done</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.startSessionBtn, { backgroundColor: ac }]}
            onPress={() => onStartSession(jp.journey_id)}
          >
            <Text style={styles.startSessionText}>{doneCount > 0 ? 'Resume' : 'Begin'}</Text>
            <Feather name="play" size={11} color="white" />
          </Pressable>
        )}
      </View>

      {journeyActions.slice(0, 3).map(a => {
        const d = statuses[a.id] === 'done';
        return (
          <View key={a.id} style={[styles.journeyActionRow, d && { opacity: 0.38 }]}>
            <ActionCheckbox done={d} color={ac} onToggle={() => onToggle(a.id)} />
            <Text style={[styles.journeyActionText, d && { textDecorationLine: 'line-through', color: T.t3 }]} numberOfLines={1}>
              {a.title}
            </Text>
          </View>
        );
      })}
      {journeyActions.length > 3 && (
        <Text style={styles.journeyMoreText}>+{journeyActions.length - 3} more</Text>
      )}

      <View style={styles.journeyFooter}>
        {totalMins > 0 && <Text style={styles.journeyDurationText}>~{formatDuration(totalMins)}</Text>}
        <View style={styles.journeyProgressBg}>
          <View style={[styles.journeyProgressFill, {
            width: `${journeyActions.length > 0 ? Math.round((doneCount / journeyActions.length) * 100) : 0}%` as any,
            backgroundColor: ac,
          }]} />
        </View>
        <Text style={[styles.journeyProgressText, { color: ac }]}>
          {doneCount}/{journeyActions.length}
        </Text>
      </View>
    </View>
  );
}

function ChecklistGroup({
  title,
  icon,
  color,
  actions,
  statuses,
  onToggle,
}: {
  title: string;
  icon: string;
  color: string;
  actions: TodayAction[];
  statuses: Record<string, string>;
  onToggle: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pending = actions.filter(a => statuses[a.id] !== 'done' && statuses[a.id] !== 'skipped');
  const done = actions.filter(a => statuses[a.id] === 'done' || statuses[a.id] === 'skipped');
  const [showDone, setShowDone] = useState(false);

  if (pending.length === 0 && done.length === 0) return null;

  return (
    <View style={[styles.checklistGroup, shadow.sm]}>
      <Pressable onPress={() => setCollapsed(v => !v)} style={styles.checklistGroupHeader}>
        <View style={[styles.checklistGroupIcon, { backgroundColor: color + '14' }]}>
          <Feather name={icon as any} size={14} color={color} />
        </View>
        <Text style={styles.checklistGroupTitle}>{title}</Text>
        {done.length > 0 && pending.length === 0 && (
          <View style={[styles.allDoneBadge]}>
            <Feather name="check" size={10} color={T.green} />
            <Text style={styles.allDoneText}>All done</Text>
          </View>
        )}
        {(pending.length > 0 || (done.length > 0 && pending.length > 0)) && (
          <Text style={styles.checklistCount}>{done.length}/{actions.length}</Text>
        )}
        <Feather
          name="chevron-down"
          size={12}
          color={T.t3}
          style={{ transform: [{ rotate: collapsed ? '-90deg' : '0deg' }] }}
        />
      </Pressable>

      {!collapsed && (
        <>
          {pending.map(a => (
            <ActionRow key={a.id} action={a} done={false} onToggle={() => onToggle(a.id)} />
          ))}
          {done.length > 0 && (
            <>
              <Pressable onPress={() => setShowDone(v => !v)} style={styles.doneToggle}>
                <Feather name="check" size={10} color={T.green} />
                <Text style={styles.doneToggleText}>{done.length} done</Text>
                <Feather
                  name="chevron-down"
                  size={10}
                  color={T.t3}
                  style={{ marginLeft: 'auto' as const, transform: [{ rotate: showDone ? '0deg' : '-90deg' }] }}
                />
              </Pressable>
              {showDone && done.map(a => (
                <ActionRow key={a.id} action={a} done={true} onToggle={() => onToggle(a.id)} />
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}

function TimeOfDaySection({
  slot,
  actions,
  statuses,
  onToggle,
}: {
  slot: TimeOfDay;
  actions: TodayAction[];
  statuses: Record<string, string>;
  onToggle: (id: string) => void;
}) {
  if (actions.length === 0) return null;

  const habits = actions.filter(a => a.type === 'habit');
  const projects = actions.filter(a => a.type === 'project');
  const standalone = actions.filter(a => a.type === 'action');

  return (
    <View style={styles.timeSection}>
      <View style={styles.timeSectionHeader}>
        <TimeSlotIcon slot={slot} size={14} />
        <Text style={styles.timeSectionTitle}>{timeSlotLabel(slot)}</Text>
        <View style={styles.timeSectionBadge}>
          <Text style={styles.timeSectionBadgeText}>{actions.length}</Text>
        </View>
      </View>

      {habits.length > 0 && (
        <ChecklistGroup
          title="Habits"
          icon="repeat"
          color={T.orange}
          actions={habits}
          statuses={statuses}
          onToggle={onToggle}
        />
      )}
      {projects.length > 0 && (
        <ChecklistGroup
          title="Project Tasks"
          icon="folder"
          color={T.green}
          actions={projects}
          statuses={statuses}
          onToggle={onToggle}
        />
      )}
      {standalone.length > 0 && (
        <ChecklistGroup
          title="Actions"
          icon="check-circle"
          color={T.brand}
          actions={standalone}
          statuses={statuses}
          onToggle={onToggle}
        />
      )}
    </View>
  );
}

export default function TodayScreen() {
  const items = useStore(s => s.items);
  const journeys = useStore(s => s.journeys);
  const streak = useStore(s => s.streak);
  const recordCompletion = useStore(s => s.recordCompletion);
  const recordMood = useStore(s => s.recordMood);
  const toggleStep = useStore(s => s.toggleStep);

  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [todayView, setTodayView] = useState<'dashboard' | 'session'>('dashboard');
  const [sessionJourneyId, setSessionJourneyId] = useState<string | null>(null);

  const todayActions = useMemo(
    () => getTodayActions(items, journeys, PRG),
    [items, journeys]
  );

  const journeyActions = useMemo(() => todayActions.filter(a => a.type === 'journey'), [todayActions]);
  const nonJourneyActions = useMemo(() => todayActions.filter(a => a.type !== 'journey'), [todayActions]);

  const grouped = useMemo(() => groupByTimeOfDay(nonJourneyActions), [nonJourneyActions]);
  const activeJourneys = useMemo(() => journeys.filter(j => j.status === 'active'), [journeys]);

  const totalToday = todayActions.length;
  const doneCount = Object.values(statuses).filter(s => s === 'done').length;
  const pct = totalToday > 0 ? doneCount / totalToday : 0;

  const greeting = greetingForTime();
  const hour = new Date().getHours();
  const dayColor = hour < 12 ? '#FFB100' : hour < 17 ? '#FF9500' : T.brand;
  const dateStr = new Date().toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric' });
  const streakValue = streak();
  const displayStreak = streakValue + (doneCount > 0 ? 1 : 0);

  const isEmpty = totalToday === 0;

  const sessionJourney = useMemo(
    () => sessionJourneyId ? journeys.find(j => j.journey_id === sessionJourneyId) : null,
    [journeys, sessionJourneyId]
  );

  function handleToggle(actionId: string) {
    const action = todayActions.find(a => a.id === actionId);
    if (!action) return;

    const currentStatus = statuses[actionId];
    if (currentStatus === 'done') {
      setStatuses(prev => {
        const n = { ...prev };
        delete n[actionId];
        return n;
      });
      if (action.type === 'project' && action.sourceItemId && action.stepId) {
        toggleStep(action.sourceItemId, action.stepId, false);
      }
    } else {
      setStatuses(prev => ({ ...prev, [actionId]: 'done' }));
      recordCompletion(actionId, 'done');
      if (action.type === 'project' && action.sourceItemId && action.stepId) {
        toggleStep(action.sourceItemId, action.stepId, true);
      }
    }
  }

  function handleStartSession(journeyId: string) {
    setSessionJourneyId(journeyId);
    setTodayView('session');
  }

  function handleExitSession() {
    setTodayView('dashboard');
  }

  function handleSessionUpdateStatuses(newStatuses: Record<string, string>) {
    setStatuses(newStatuses);
  }

  function handleSessionRecordCompletion(actionId: string, status: 'done' | 'skipped') {
    recordCompletion(actionId, status);
  }

  function handleSessionRecordMood(mood: MoodValue) {
    recordMood(mood);
  }

  if (todayView === 'session' && sessionJourneyId && sessionJourney) {
    return (
      <SafeAreaView style={[styles.safe, Platform.OS === 'web' && { paddingTop: 67 }]} edges={['top']}>
        <SessionView
          journeyId={sessionJourneyId}
          journeyProgress={sessionJourney}
          actions={todayActions}
          statuses={statuses}
          streak={streakValue}
          onUpdateStatuses={handleSessionUpdateStatuses}
          onRecordCompletion={handleSessionRecordCompletion}
          onRecordMood={handleSessionRecordMood}
          onExit={handleExitSession}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, Platform.OS === 'web' && { paddingTop: 67 }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroDate}>{dateStr.toUpperCase()}</Text>
          <View style={styles.heroRow}>
            <M3ntorIcon size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.heroGreeting}>{greeting},</Text>
              <Text style={styles.heroName}>Ready to go.</Text>
            </View>
            <View style={[styles.streakBadge, { borderColor: T.orange + '28' }]}>
              <Text style={styles.streakNumber}>{displayStreak}</Text>
              <View style={styles.streakLabel}>
                <Ionicons name="flame" size={9} color={T.orange} />
                <Text style={styles.streakText}>STREAK</Text>
              </View>
            </View>
          </View>

          {totalToday > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressSummary, pct >= 1 && { color: T.green }]}>
                  {pct >= 1 ? 'All done today' : doneCount === 0 ? `${totalToday} things today` : `${doneCount} of ${totalToday} done`}
                </Text>
                <Text style={[styles.progressPct, pct >= 1 && { color: T.green }]}>
                  {Math.round(pct * 100)}
                  <Text style={styles.progressPctUnit}>%</Text>
                </Text>
              </View>
              <View style={styles.progressSegments}>
                {Array.from({ length: Math.max(totalToday, 1) }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.progressSegment,
                      {
                        backgroundColor: i < doneCount
                          ? (pct >= 1 ? T.green : T.brand)
                          : T.brand + '1E',
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        {activeJourneys.length > 0 && journeyActions.length > 0 && (
          <View style={styles.journeySection}>
            {activeJourneys.map(jp => (
              <JourneyCard
                key={jp.id}
                jp={jp}
                actions={journeyActions}
                statuses={statuses}
                onToggle={handleToggle}
                onStartSession={handleStartSession}
              />
            ))}
          </View>
        )}

        {nonJourneyActions.length > 0 && (
          <View style={styles.tasksSection}>
            {activeJourneys.length > 0 && journeyActions.length > 0 && (
              <Text style={styles.tasksSectionTitle}>Tasks & habits</Text>
            )}
            {sortedTimeSlots().map(slot => (
              <TimeOfDaySection
                key={slot}
                slot={slot}
                actions={grouped[slot]}
                statuses={statuses}
                onToggle={handleToggle}
              />
            ))}
          </View>
        )}

        {isEmpty && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="sun" size={36} color={dayColor} />
            </View>
            <Text style={styles.emptyTitle}>Nothing scheduled today</Text>
            <Text style={styles.emptySub}>
              Mark tasks as "Today" in a project, start a Journey from Discover, or add a new habit.
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  scrollContent: {},

  hero: { paddingHorizontal: 22, paddingTop: S.lg, paddingBottom: S.md },
  heroDate: { fontSize: 11, fontWeight: '600' as const, color: T.t3, letterSpacing: 1, marginBottom: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  heroGreeting: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -1, lineHeight: 34, color: T.text },
  heroName: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -1, lineHeight: 34, color: T.brand },

  streakBadge: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: T.orange + '1E',
    borderWidth: 1,
  },
  streakNumber: { fontSize: 28, fontWeight: '900' as const, color: T.orange, lineHeight: 30, letterSpacing: -1.5 },
  streakLabel: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  streakText: { fontSize: 9, fontWeight: '700' as const, color: T.orange + '90', letterSpacing: 0.5 },

  progressSection: { marginTop: 22 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  progressSummary: { fontSize: 13, fontWeight: '600' as const, color: T.t2 },
  progressPct: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -1, color: T.brand, lineHeight: 28 },
  progressPctUnit: { fontSize: 12, fontWeight: '500' as const, color: T.t3 },
  progressSegments: { flexDirection: 'row', gap: 2.5 },
  progressSegment: { flex: 1, height: 5, borderRadius: 3 },

  journeySection: { paddingHorizontal: S.md, marginBottom: S.md },
  journeyCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
    borderLeftWidth: 4,
    ...shadow.md,
  },
  journeyHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingBottom: 12 },
  journeyIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  journeyTitle: { fontSize: 16, fontWeight: '750' as const, color: T.text, letterSpacing: -0.3, lineHeight: 20 },
  journeyMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  weekBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  weekBadgeText: { fontSize: 10, fontWeight: '700' as const },
  journeyDayTitle: { fontSize: 11, color: T.t3 },

  journeyDoneBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },

  startSessionBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  startSessionText: { fontSize: 13, fontWeight: '700' as const, color: 'white' },

  journeyActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 6 },
  journeyActionText: { fontSize: 13, color: T.t2, fontWeight: '500' as const, lineHeight: 18, flex: 1 },
  journeyMoreText: { fontSize: 11, color: T.t3, paddingLeft: 54, marginBottom: 6 },

  journeyFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.sep },
  journeyDurationText: { fontSize: 11, color: T.t3 },
  journeyProgressBg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: T.sep, overflow: 'hidden' },
  journeyProgressFill: { height: '100%', borderRadius: 2 },
  journeyProgressText: { fontSize: 11, fontWeight: '600' as const },

  tasksSection: { paddingHorizontal: S.md },
  tasksSectionTitle: { fontSize: 13, fontWeight: '700' as const, color: T.t2, marginBottom: 10, paddingLeft: 2, letterSpacing: -0.2 },

  timeSection: { marginBottom: S.md },
  timeSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: S.sm, paddingLeft: 2 },
  timeSectionTitle: { fontSize: F.sm, fontWeight: '700' as const, color: T.t2, letterSpacing: 0.2 },
  timeSectionBadge: { backgroundColor: T.brand + '14', borderRadius: R.pill, paddingHorizontal: 7, paddingVertical: 2 },
  timeSectionBadgeText: { fontSize: 11, fontWeight: '700' as const, color: T.brand },

  checklistGroup: { backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', marginBottom: 10 },
  checklistGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13 },
  checklistGroupIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  checklistGroupTitle: { fontSize: 14, fontWeight: '700' as const, color: T.text, flex: 1, letterSpacing: -0.2 },
  checklistCount: { fontSize: 11, color: T.t3, fontWeight: '500' as const },
  allDoneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.green + '10', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  allDoneText: { fontSize: 11, fontWeight: '600' as const, color: T.green },

  doneToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.sep + '40' },
  doneToggleText: { fontSize: 11, color: T.t3 },

  actionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.sep + '30' },
  actionRowContent: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  actionTitle: { fontSize: 14, fontWeight: '600' as const, color: T.text, letterSpacing: -0.15, lineHeight: 20 },
  actionTitleDone: { color: T.t3, fontWeight: '400' as const, textDecorationLine: 'line-through' as const },
  actionDuration: { fontSize: 11, color: T.t3, flexShrink: 0 },
  actionDesc: { fontSize: 11, color: T.t3, marginTop: 1 },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  emptyState: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 24 },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '750' as const, color: T.text, letterSpacing: -0.3, marginBottom: 8 },
  emptySub: { fontSize: 14, color: T.t3, lineHeight: 22, textAlign: 'center', maxWidth: 260 },
});
