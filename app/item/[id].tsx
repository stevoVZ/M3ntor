import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeOut,
} from 'react-native-reanimated';
import { T, S, F, R, shadow } from '../../constants/theme';
import { ITEM_AREAS, KIND_CONFIG, PRIORITY, EFFORT, STEP_STATUS, PRG, WA } from '../../constants/config';
import { itemKind, projectProgress, createStep, formatRecurrence, formatDuration } from '../../utils/items';
import { formatDeadline, isOverdue, formatDate, fromNow } from '../../utils/dates';
import { generateProjectTasks, generateSubtasks, expandProjectPhase } from '../../lib/ai';
import { useStore } from '../../lib/store';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { Step, Subtask, JourneyProgress, Journey } from '../../types';
import * as Crypto from 'expo-crypto';

const STATUS_ORDER: Step['status'][] = ['todo', 'doing', 'blocked', 'done'];
const PRIORITY_ORDER = ['normal', 'high', 'urgent', 'low'] as const;
const EFFORT_ORDER = ['quick', 'medium', 'deep'] as const;
const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'interval', label: 'Every X days' },
  { value: 'monthly', label: 'Monthly' },
] as const;
const TIME_OPTIONS = ['morning', 'afternoon', 'evening', 'anytime'] as const;
const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90] as const;

function StepRow({
  step, itemId, projectTitle, allSteps,
  onToggle, onMarkToday, onDelete, onStatusCycle, onPriorityCycle, onEffortCycle,
  onAddSubtask, onToggleSubtask, onDeleteSubtask, onAiBreakdown, aiSubLoading,
}: {
  step:            Step;
  itemId:          string;
  projectTitle:    string;
  allSteps:        Step[];
  onToggle:        (done: boolean) => void;
  onMarkToday:     (today: boolean) => void;
  onDelete:        () => void;
  onStatusCycle:   () => void;
  onStatusSet:     (status: Step['status']) => void;
  onPriorityCycle: () => void;
  onEffortCycle:   () => void;
  onAddSubtask:    (title: string) => void;
  onToggleSubtask: (subtaskId: string) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  onAiBreakdown:   () => void;
  aiSubLoading:    boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const [addingSub, setAddingSub] = useState(false);
  const subInputRef = useRef<TextInput>(null);
  const statusConf = STEP_STATUS[step.status] ?? STEP_STATUS.todo;
  const prConf = PRIORITY[step.priority] ?? PRIORITY.normal;
  const efConf = EFFORT[step.effort] ?? EFFORT.medium;
  const subDone = (step.subtasks ?? []).filter(st => st.done).length;
  const subTotal = (step.subtasks ?? []).length;

  function handleAddSub() {
    if (!subtaskDraft.trim()) return;
    onAddSubtask(subtaskDraft.trim());
    setSubtaskDraft('');
  }

  return (
    <View style={[styles.stepCard, step.done && styles.stepCardDone]}>
      <Pressable style={styles.stepMain} onPress={() => setExpanded(e => !e)}>
        <Pressable style={styles.statusButton} onPress={() => {
          if (step.done) { onToggle(false); }
          else { onToggle(true); }
        }}>
          <View style={[
            styles.statusBox,
            step.done && styles.statusBoxDone,
            step.status === 'doing' && styles.statusBoxDoing,
            step.status === 'blocked' && styles.statusBoxBlocked,
          ]}>
            {step.done ? (
              <Feather name="check" size={13} color="white" />
            ) : step.status === 'blocked' ? (
              <Feather name="alert-triangle" size={10} color="#E53E3E" />
            ) : step.status === 'doing' ? (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: T.brand }} />
            ) : (
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusConf.dot }} />
            )}
          </View>
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={[styles.stepTitle, step.done && styles.stepTitleDone]} numberOfLines={expanded ? 0 : 2}>
            {step.title}
          </Text>
          <View style={styles.stepMeta}>
            {!step.done && step.status !== 'todo' && (
              <View style={[styles.metaBadge, { backgroundColor: statusConf.dot + '12' }]}>
                <Text style={[styles.metaBadgeText, { color: statusConf.color }]}>{statusConf.label}</Text>
              </View>
            )}
            {step.priority && step.priority !== 'normal' && (
              <View style={[styles.metaBadge, { backgroundColor: prConf.bg }]}>
                <Text style={[styles.metaBadgeText, { color: prConf.color }]}>{prConf.icon} {prConf.label}</Text>
              </View>
            )}
            {step.effort && step.effort !== 'medium' && (
              <View style={[styles.metaBadge, { backgroundColor: efConf.color + '10' }]}>
                <Text style={[styles.metaBadgeText, { color: efConf.color }]}>{efConf.emoji}</Text>
              </View>
            )}
            {subTotal > 0 && (
              <View style={[styles.metaBadge, { backgroundColor: T.fill }]}>
                <Text style={[styles.metaBadgeText, { color: subDone === subTotal ? T.green : T.t3 }]}>{subDone}/{subTotal}</Text>
              </View>
            )}
            {step.today && !step.done && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>Today</Text>
              </View>
            )}
          </View>
        </View>

        <Feather name={expanded ? 'chevron-down' : 'chevron-right'} size={14} color={T.t3} />
      </Pressable>

      {expanded && (
        <Animated.View entering={FadeIn.duration(150)} style={styles.expandPanel}>
          <View style={styles.statusPickerRow}>
            {STATUS_ORDER.map(s => {
              const sc = STEP_STATUS[s];
              const active = step.status === s;
              return (
                <Pressable
                  key={s}
                  style={[styles.statusPill, active && { backgroundColor: sc.dot + '18', borderColor: sc.dot + '40' }]}
                  onPress={() => onStatusSet(s)}
                >
                  <View style={[styles.statusPillDot, { backgroundColor: active ? sc.dot : T.sep }]} />
                  <Text style={[styles.statusPillText, active && { color: sc.color, fontWeight: '700' as const }]}>{sc.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.chipRow}>
            <Pressable style={[styles.chip, { backgroundColor: prConf.bg, borderColor: prConf.color + '20' }]} onPress={onPriorityCycle}>
              <Feather name="flag" size={10} color={prConf.color} />
              <Text style={[styles.chipText, { color: prConf.color }]}>{prConf.label}</Text>
            </Pressable>
            <Pressable style={[styles.chip, { backgroundColor: efConf.color + '08', borderColor: efConf.color + '20' }]} onPress={onEffortCycle}>
              <Text style={[styles.chipText, { color: efConf.color }]}>{efConf.emoji} {efConf.label}</Text>
            </Pressable>
            <Pressable style={[styles.chip, step.today ? { backgroundColor: T.brand + '10', borderColor: T.brand + '25' } : { backgroundColor: T.fill, borderColor: T.sep }]} onPress={() => onMarkToday(!step.today)}>
              <Feather name={step.today ? 'sun' : 'plus'} size={10} color={step.today ? T.brand : T.t3} />
              <Text style={[styles.chipText, { color: step.today ? T.brand : T.t3, fontWeight: step.today ? '700' as const : '500' as const }]}>
                {step.today ? 'In Today' : 'Today'}
              </Text>
            </Pressable>
          </View>

          {step.description ? (
            <Text style={styles.stepDesc}>{step.description}</Text>
          ) : null}

          {subTotal > 0 && (
            <View style={styles.subtaskList}>
              {(step.subtasks ?? []).map(sub => (
                <View key={sub.id} style={styles.subtaskRow}>
                  <Pressable onPress={() => onToggleSubtask(sub.id)}>
                    <View style={[styles.subCheck, sub.done && styles.subCheckDone]}>
                      {sub.done && <Feather name="check" size={8} color="white" />}
                    </View>
                  </Pressable>
                  <Text style={[styles.subtaskText, sub.done && styles.subtaskDone, { flex: 1 }]}>
                    {sub.title}
                  </Text>
                  <Pressable onPress={() => onDeleteSubtask(sub.id)} hitSlop={8}>
                    <Feather name="x" size={12} color={T.red} style={{ opacity: 0.5 }} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={styles.subActions}>
            {addingSub ? (
              <View style={styles.addSubRow}>
                <TextInput
                  ref={subInputRef}
                  autoFocus
                  value={subtaskDraft}
                  onChangeText={setSubtaskDraft}
                  onSubmitEditing={handleAddSub}
                  placeholder="Subtask name..."
                  placeholderTextColor={T.t3}
                  style={styles.addSubInput}
                  returnKeyType="done"
                />
                <Pressable
                  style={[styles.addSubBtn, subtaskDraft.trim() ? { backgroundColor: T.brand } : {}]}
                  onPress={handleAddSub}
                >
                  <Text style={[styles.addSubBtnText, subtaskDraft.trim() ? { color: 'white' } : {}]}>Add</Text>
                </Pressable>
                <Pressable onPress={() => { setAddingSub(false); setSubtaskDraft(''); }} hitSlop={8}>
                  <Feather name="x" size={14} color={T.t3} />
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable style={[styles.chip, { borderColor: T.brand + '25' }]} onPress={() => setAddingSub(true)}>
                  <Feather name="plus" size={10} color={T.brand} />
                  <Text style={[styles.chipText, { color: T.brand }]}>Add subtask</Text>
                </Pressable>
                <Pressable
                  style={[styles.chip, { backgroundColor: T.brand + '08', borderColor: T.brand + '20' }]}
                  onPress={onAiBreakdown}
                  disabled={aiSubLoading}
                >
                  {aiSubLoading ? (
                    <ActivityIndicator size="small" color={T.brand} />
                  ) : (
                    <Text style={[styles.chipText, { color: T.brand }]}>AI break down</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            <Pressable style={[styles.chip, { backgroundColor: T.red + '05', borderColor: T.red + '15' }]} onPress={onDelete}>
              <Feather name="trash-2" size={10} color={T.red} />
              <Text style={[styles.chipText, { color: T.red }]}>Remove</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function WeeklyPlanSection({ journeyInfo }: { journeyInfo: { jp: JourneyProgress; prog: Journey } }) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(journeyInfo.jp.current_week);
  const weeklyActions = WA[journeyInfo.jp.journey_id];

  return (
    <View style={{ marginTop: S.sm }}>
      <Text style={{ fontSize: 11, color: T.t3, fontWeight: '600' as const, marginBottom: 4 }}>Weekly Plan</Text>
      {journeyInfo.prog.wp.map((week, i) => {
        const weekNum = i + 1;
        const isCurrent = weekNum === journeyInfo.jp.current_week;
        const isPast = weekNum < journeyInfo.jp.current_week;
        const isExpanded = expandedWeek === weekNum;
        const actions = weeklyActions?.[i];

        return (
          <View key={i}>
            <Pressable
              style={[styles.weekRow, isPast && !isExpanded ? { opacity: 0.5 } : {}]}
              onPress={() => setExpandedWeek(isExpanded ? null : weekNum)}
            >
              <View style={[styles.weekDot, {
                backgroundColor: isCurrent ? T.brand : isPast ? T.green : T.sep,
              }]} />
              <Text style={{ fontSize: 12, color: isCurrent ? T.brand : T.text, fontWeight: isCurrent ? '700' as const : '400' as const, flex: 1 }}>
                Week {weekNum}: {week}
              </Text>
              {isPast && <Feather name="check" size={12} color={T.green} />}
              {isCurrent && (
                <View style={{ backgroundColor: T.brand + '12', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700' as const, color: T.brand }}>CURRENT</Text>
                </View>
              )}
              {actions && actions.length > 0 && (
                <Feather name={isExpanded ? 'chevron-down' : 'chevron-right'} size={12} color={T.t3} />
              )}
            </Pressable>
            {isExpanded && actions && actions.length > 0 && (
              <View style={styles.waWeekActions}>
                {actions.map((wa, idx) => (
                  <View key={idx} style={styles.waWeekActionRow}>
                    <View style={[styles.waWeekDot, { backgroundColor: isCurrent ? T.brand + '30' : T.sep }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.waWeekActionTitle}>{wa.t}</Text>
                      <Text style={styles.waWeekActionDesc} numberOfLines={2}>{wa.desc}</Text>
                      <Text style={styles.waWeekActionDur}>{wa.dur}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function ItemDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const getItem = useStore(s => s.getItem);
  const toggleStep = useStore(s => s.toggleStep);
  const markStepToday = useStore(s => s.markStepToday);
  const updateItem = useStore(s => s.updateItem);
  const removeItem = useStore(s => s.removeItem);
  const updateStepAction = useStore(s => s.updateStep);
  const addStepAction = useStore(s => s.addStep);
  const removeStepAction = useStore(s => s.removeStep);
  const toggleSubtaskAction = useStore(s => s.toggleSubtask);
  const addSubtaskAction = useStore(s => s.addSubtask);
  const removeSubtaskAction = useStore(s => s.removeSubtask);
  const allItems = useStore(s => s.items);
  const journeys = useStore(s => s.journeys);

  const item = getItem(id);

  const [newStepText, setNewStepText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBanner, setAiBanner] = useState<string | null>(null);
  const [aiSubLoadingId, setAiSubLoadingId] = useState<string | null>(null);
  const [showPhasePicker, setShowPhasePicker] = useState(false);
  const [expandingPhase, setExpandingPhase] = useState<string | null>(null);
  const stepInputRef = useRef<TextInput>(null);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');

  const [editingRecurrence, setEditingRecurrence] = useState(false);
  const [editingTimeOfDay, setEditingTimeOfDay] = useState(false);
  const [editingDuration, setEditingDuration] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);
  const [editingEffort, setEditingEffort] = useState(false);

  if (!item) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.notFound}>
          <Feather name="search" size={48} color={T.t3} />
          <Text style={styles.notFoundTitle}>Item not found</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={16} color="white" />
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const kind = itemKind(item);
  const kindConf = KIND_CONFIG[kind];
  const area = ITEM_AREAS[item.area];
  const progress = kind === 'project' ? projectProgress(item) : null;
  const steps = item.steps ?? [];
  const doneSteps = steps.filter(s => s.done).length;

  function startEditTitle() {
    setTitleDraft(item.title);
    setEditingTitle(true);
  }
  function saveTitle() {
    if (titleDraft.trim() && titleDraft.trim() !== item.title) {
      updateItem(item.id, { title: titleDraft.trim() });
    }
    setEditingTitle(false);
  }
  function startEditDesc() {
    setDescDraft(item.description || '');
    setEditingDesc(true);
  }
  function saveDesc() {
    updateItem(item.id, { description: descDraft.trim() || undefined });
    setEditingDesc(false);
  }

  function cycleStepStatus(stepId: string) {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;
    const idx = STATUS_ORDER.indexOf(step.status || 'todo');
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    updateStepAction(item.id, stepId, { status: next, done: next === 'done' });
  }
  function setStepStatus(stepId: string, status: Step['status']) {
    updateStepAction(item.id, stepId, { status, done: status === 'done' });
  }
  function cycleStepPriority(stepId: string) {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;
    const idx = PRIORITY_ORDER.indexOf(step.priority || 'normal');
    const next = PRIORITY_ORDER[(idx + 1) % PRIORITY_ORDER.length];
    updateStepAction(item.id, stepId, { priority: next });
  }
  function cycleStepEffort(stepId: string) {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;
    const idx = EFFORT_ORDER.indexOf(step.effort || 'medium');
    const next = EFFORT_ORDER[(idx + 1) % EFFORT_ORDER.length];
    updateStepAction(item.id, stepId, { effort: next });
  }

  function handleAddSubtask(stepId: string, title: string) {
    const subtask: Subtask = {
      id: Crypto.randomUUID(),
      step_id: stepId,
      title,
      done: false,
      assignees: [],
      sort_order: (steps.find(s => s.id === stepId)?.subtasks?.length ?? 0),
    };
    addSubtaskAction(item.id, stepId, subtask);
  }

  async function handleAiSubtasks(stepId: string) {
    if (aiSubLoadingId) return;
    setAiSubLoadingId(stepId);
    try {
      const step = steps.find(s => s.id === stepId);
      const subs = await generateSubtasks(step?.title || '', item.title);
      if (subs.length) {
        subs.forEach((title, i) => {
          const subtask: Subtask = {
            id: Crypto.randomUUID(),
            step_id: stepId,
            title,
            done: false,
            assignees: [],
            sort_order: (step?.subtasks?.length ?? 0) + i,
          };
          addSubtaskAction(item.id, stepId, subtask);
        });
      }
    } catch {}
    setAiSubLoadingId(null);
  }

  async function handleAddStep() {
    if (!newStepText.trim()) return;
    const step = createStep(item.id, {
      title: newStepText.trim(),
      sort_order: steps.length,
    });
    addStepAction(item.id, step);
    setNewStepText('');
  }

  function handleMoreTasksPress() {
    if (steps.length > 0) {
      setShowPhasePicker(prev => !prev);
      return;
    }
    handleAiTasks();
  }

  async function handleAiTasks() {
    if (aiLoading) return;
    setShowPhasePicker(false);
    setAiLoading(true);
    setAiBanner(null);
    try {
      const result = await generateProjectTasks(item.title, steps.map(s => s.title));
      if (!result.tasks.length) {
        setAiBanner('M3NTOR couldn\'t suggest tasks. Try being more specific in the title.');
        return;
      }
      const newSteps = result.tasks.map((t, i) => createStep(item.id, {
        title: t.title,
        sort_order: steps.length + i,
        effort: t.effort || undefined,
      }));
      newSteps.forEach(s => addStepAction(item.id, s));
      setAiBanner(`Added ${result.tasks.length} tasks`);
      setTimeout(() => setAiBanner(null), 3000);
    } catch {
      setAiBanner('Something went wrong. Try again.');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleExpandPhase(stepId: string) {
    const step = steps.find(s => s.id === stepId);
    if (!step || expandingPhase) return;
    setShowPhasePicker(false);
    setExpandingPhase(stepId);
    setAiBanner(null);
    try {
      const siblingPhases = steps.filter(s => s.id !== stepId).map(s => s.title);
      const existingSubs = (step.subtasks || []).map(s => s.title);
      const result = await expandProjectPhase(item.title, step.title, existingSubs, siblingPhases);
      if (result.tasks?.length) {
        const newStepIds: string[] = [];
        result.tasks.forEach((t, i) => {
          const newStep = createStep(item.id, {
            title: t.title,
            sort_order: steps.length + i,
            effort: t.effort || undefined,
          });
          addStepAction(item.id, newStep);
          newStepIds.push(newStep.id);
        });
        const freshSteps = useStore.getState().items.find(it => it.id === item.id)?.steps || [];
        const oldSteps = freshSteps.filter(s => !newStepIds.includes(s.id));
        oldSteps.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const targetIdx = oldSteps.findIndex(s => s.id === stepId);
        const before = oldSteps.slice(0, targetIdx + 1);
        const newOnes = freshSteps.filter(s => newStepIds.includes(s.id));
        const after = oldSteps.slice(targetIdx + 1);
        const ordered = [...before, ...newOnes, ...after];
        ordered.forEach((s, i) => updateStepAction(item.id, s.id, { sort_order: i }));
        setAiBanner(`Added ${result.tasks.length} tasks under "${step.title}"`);
        setTimeout(() => setAiBanner(null), 3000);
      } else {
        setAiBanner('No additional tasks found for this step.');
        setTimeout(() => setAiBanner(null), 3000);
      }
    } catch {
      setAiBanner('Something went wrong. Try again.');
    }
    setExpandingPhase(null);
  }

  function handleDeleteStep(stepId: string) {
    removeStepAction(item.id, stepId);
  }

  function handleDeleteItem() {
    Alert.alert(
      'Delete item',
      `Delete "${item.title}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { removeItem(item.id); router.back(); } },
      ]
    );
  }

  const linkedItems = kind === 'goal'
    ? (item.linked_items ?? []).map(lid => allItems.find(i => i.id === lid)).filter(Boolean) as typeof allItems
    : [];
  const linkedJourneyIds = kind === 'goal' ? (item.linked_journeys ?? []) : [];
  const unlinkedActive = kind === 'goal'
    ? allItems.filter(i => i.status === 'active' && !linkedItems.some(li => li.id === i.id) && i.id !== item.id)
    : [];

  function linkItem(targetId: string) {
    const current = item.linked_items ?? [];
    if (!current.includes(targetId)) {
      updateItem(item.id, { linked_items: [...current, targetId] });
    }
  }
  function unlinkItem(targetId: string) {
    updateItem(item.id, { linked_items: (item.linked_items ?? []).filter(x => x !== targetId) });
  }

  const journeyProg = kind === 'goal'
    ? linkedJourneyIds.map(jid => {
        const jp = journeys.find(j => j.journey_id === jid);
        const prog = PRG.find(p => p.id === jid);
        return jp && prog ? { jp, prog } : null;
      }).filter(Boolean) as { jp: typeof journeys[0]; prog: typeof PRG[0] }[]
    : [];

  const isJourney = item.source === 'journey';
  const journeyInfo = isJourney
    ? (() => {
        const jp = journeys.find(j => j.journey_id === item.id || item.linked_journeys?.includes(j.journey_id));
        const prog = jp ? PRG.find(p => p.id === jp.journey_id) : null;
        return jp && prog ? { jp, prog } : null;
      })()
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: kind === 'project' ? 100 : 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[area?.c + '18' ?? T.fill, T.bg]}
            style={styles.header}>
            <View style={styles.headerTop}>
              <Pressable style={styles.closeBtn} onPress={() => router.back()}>
                <Feather name="arrow-left" size={16} color={T.t3} />
              </Pressable>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <View style={[styles.kindBadge, { backgroundColor: kindConf.color + '14' }]}>
                  <Text style={[styles.kindBadgeText, { color: kindConf.color }]}>{kindConf.label}</Text>
                </View>
                {item.status === 'done' && (
                  <View style={[styles.kindBadge, { backgroundColor: T.green + '14' }]}>
                    <Text style={[styles.kindBadgeText, { color: T.green }]}>Done</Text>
                  </View>
                )}
                {item.status === 'paused' && (
                  <View style={[styles.kindBadge, { backgroundColor: T.orange + '14' }]}>
                    <Text style={[styles.kindBadgeText, { color: T.orange }]}>Paused</Text>
                  </View>
                )}
              </View>
              <Pressable style={styles.deleteBtn} onPress={handleDeleteItem}>
                <Feather name="trash-2" size={14} color={T.red} />
              </Pressable>
            </View>

            <View style={styles.headerBody}>
              <Text style={styles.headerEmoji}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                {editingTitle ? (
                  <TextInput
                    autoFocus
                    value={titleDraft}
                    onChangeText={setTitleDraft}
                    onBlur={saveTitle}
                    onSubmitEditing={saveTitle}
                    style={styles.titleInput}
                    returnKeyType="done"
                  />
                ) : (
                  <Pressable onPress={startEditTitle} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.headerTitle}>{item.title}</Text>
                    <Feather name="edit-2" size={12} color={T.t3} style={{ opacity: 0.5 }} />
                  </Pressable>
                )}
                {area && (
                  <View style={styles.areaRow}>
                    <Text style={{ fontSize: 14 }}>{area.e}</Text>
                    <Text style={[styles.areaName, { color: area.c }]}>{area.n}</Text>
                  </View>
                )}
              </View>
            </View>

            {progress !== null && (
              <View style={styles.progressSection}>
                <View style={styles.progressRow}>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, {
                      width: `${Math.round(progress * 100)}%` as any,
                      backgroundColor: kindConf.color,
                    }]} />
                  </View>
                  <Text style={[styles.progressPct, { color: kindConf.color }]}>
                    {Math.round(progress * 100)}%
                  </Text>
                </View>
                <Text style={styles.progressSub}>
                  {doneSteps} of {steps.length} task{steps.length !== 1 ? 's' : ''} done
                </Text>
              </View>
            )}

            {kind === 'habit' && (
              <View style={styles.habitRow}>
                <Feather name="repeat" size={12} color={T.t2} />
                <Text style={styles.habitText}>
                  {formatRecurrence(item)}
                  {item.habit_duration ? `  ·  ${formatDuration(item.habit_duration)}` : ''}
                  {item.habit_time_of_day ? `  ·  ${item.habit_time_of_day}` : ''}
                </Text>
              </View>
            )}

            {item.deadline && (
              <View style={styles.deadlineRow}>
                <Feather name="calendar" size={12} color={isOverdue(item.deadline) ? T.red : T.orange} />
                <Text style={[styles.deadlineText, isOverdue(item.deadline) && { color: T.red }]}>
                  {formatDeadline(item.deadline)}
                </Text>
              </View>
            )}

            <View style={{ marginTop: 8 }}>
              {editingDesc ? (
                <View>
                  <TextInput
                    autoFocus
                    value={descDraft}
                    onChangeText={setDescDraft}
                    onBlur={saveDesc}
                    placeholder="Add description..."
                    placeholderTextColor={T.t3}
                    multiline
                    style={styles.descInput}
                  />
                </View>
              ) : item.description ? (
                <Pressable onPress={startEditDesc}>
                  <Text style={styles.description}>
                    {item.description}
                    {'  '}
                  </Text>
                  <Feather name="edit-2" size={10} color={T.t3} style={{ opacity: 0.3 }} />
                </Pressable>
              ) : (
                <Pressable onPress={startEditDesc} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="file-text" size={13} color={T.t3} />
                  <Text style={{ fontSize: 12, color: T.t3 }}>Add description...</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.metaSection}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Priority</Text>
                {editingPriority ? (
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {(['urgent', 'high', 'normal', 'low'] as const).map(p => {
                      const pc = PRIORITY[p];
                      const sel = item.priority === p;
                      return (
                        <Pressable
                          key={p}
                          style={[styles.pickerOption, sel && { backgroundColor: pc.color + '15', borderColor: pc.color + '40' }]}
                          onPress={() => { updateItem(item.id, { priority: p }); setEditingPriority(false); }}
                        >
                          <Text style={[styles.pickerOptionText, { color: sel ? pc.color : T.t2 }]}>{pc.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Pressable onPress={() => setEditingPriority(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[styles.metaValue, { color: PRIORITY[item.priority]?.color || T.text }]}>
                      {PRIORITY[item.priority]?.label || 'Normal'}
                    </Text>
                    <Feather name="chevron-down" size={12} color={T.t3} />
                  </Pressable>
                )}
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Effort</Text>
                {editingEffort ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {EFFORT_ORDER.map(e => {
                      const ec = EFFORT[e];
                      const sel = item.effort === e;
                      return (
                        <Pressable
                          key={e}
                          style={[styles.pickerOption, sel && { backgroundColor: ec.color + '15', borderColor: ec.color + '40' }]}
                          onPress={() => { updateItem(item.id, { effort: e }); setEditingEffort(false); }}
                        >
                          <Text style={[styles.pickerOptionText, { color: sel ? ec.color : T.t2 }]}>{ec.emoji} {ec.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Pressable onPress={() => setEditingEffort(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[styles.metaValue, { color: EFFORT[item.effort]?.color || T.text }]}>
                      {EFFORT[item.effort]?.emoji} {EFFORT[item.effort]?.label || 'Medium'}
                    </Text>
                    <Feather name="chevron-down" size={12} color={T.t3} />
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Feather name="clock" size={12} color={T.t3} />
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>{formatDate(item.created_at)}</Text>
              </View>
              {item.started_at && (
                <View style={styles.detailRow}>
                  <Feather name="play" size={12} color={T.t3} />
                  <Text style={styles.detailLabel}>Started</Text>
                  <Text style={styles.detailValue}>{formatDate(item.started_at)}</Text>
                </View>
              )}
              {item.completed_at && (
                <View style={styles.detailRow}>
                  <Feather name="check-circle" size={12} color={T.green} />
                  <Text style={styles.detailLabel}>Completed</Text>
                  <Text style={styles.detailValue}>{formatDate(item.completed_at)}</Text>
                </View>
              )}
              {item.paused_at && item.status === 'paused' && (
                <View style={styles.detailRow}>
                  <Feather name="pause-circle" size={12} color={T.orange} />
                  <Text style={styles.detailLabel}>Paused</Text>
                  <Text style={styles.detailValue}>{formatDate(item.paused_at)}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Feather name="refresh-cw" size={12} color={T.t3} />
                <Text style={styles.detailLabel}>Updated</Text>
                <Text style={styles.detailValue}>{fromNow(item.updated_at)}</Text>
              </View>
              {item.estimated_minutes != null && (
                <View style={styles.detailRow}>
                  <Feather name="target" size={12} color={T.t3} />
                  <Text style={styles.detailLabel}>Estimate</Text>
                  <Text style={styles.detailValue}>{item.estimated_minutes} min</Text>
                </View>
              )}
              {item.actual_minutes != null && (
                <View style={styles.detailRow}>
                  <Feather name="activity" size={12} color={T.t3} />
                  <Text style={styles.detailLabel}>Actual</Text>
                  <Text style={styles.detailValue}>{item.actual_minutes} min</Text>
                </View>
              )}
              {item.review_date && (
                <View style={styles.detailRow}>
                  <Feather name="eye" size={12} color={T.t3} />
                  <Text style={styles.detailLabel}>Review</Text>
                  <Text style={styles.detailValue}>{formatDate(item.review_date)}</Text>
                </View>
              )}
              {item.tags && item.tags.length > 0 && (
                <View style={styles.detailRow}>
                  <Feather name="tag" size={12} color={T.t3} />
                  <Text style={styles.detailLabel}>Tags</Text>
                  <Text style={styles.detailValue}>{item.tags.join(', ')}</Text>
                </View>
              )}
            </View>

            <View style={styles.statusRow}>
              {item.status !== 'done' && (
                <Pressable style={[styles.statusBtn, styles.statusBtnDone]}
                  onPress={() => { updateItem(item.id, { status: 'done', completed_at: new Date().toISOString() }); router.back(); }}>
                  <Feather name="check-circle" size={14} color={T.green} />
                  <Text style={[styles.statusBtnText, { color: T.green }]}>Mark done</Text>
                </Pressable>
              )}
              {item.status === 'active' && (
                <Pressable style={[styles.statusBtn, styles.statusBtnPause]}
                  onPress={() => updateItem(item.id, { status: 'paused', paused_at: new Date().toISOString() })}>
                  <Feather name="pause-circle" size={14} color={T.orange} />
                  <Text style={[styles.statusBtnText, { color: T.orange }]}>Pause</Text>
                </Pressable>
              )}
              {item.status === 'paused' && (
                <Pressable style={[styles.statusBtn, styles.statusBtnActive]}
                  onPress={() => updateItem(item.id, { status: 'active', paused_at: undefined })}>
                  <Feather name="play-circle" size={14} color={T.brand} />
                  <Text style={[styles.statusBtnText, { color: T.brand }]}>Resume</Text>
                </Pressable>
              )}
            </View>
          </LinearGradient>

          {kind === 'project' && (
            <View style={{ paddingHorizontal: S.md }}>
              {aiBanner && (
                <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.aiBanner}>
                  <Text style={styles.aiBannerText}>{aiBanner}</Text>
                </Animated.View>
              )}

              <View style={styles.tasksHeader}>
                <Text style={styles.tasksTitle}>
                  Tasks
                  {steps.length > 0 && <Text style={styles.tasksCount}> · {doneSteps}/{steps.length}</Text>}
                </Text>
                <Pressable style={styles.aiBtn} onPress={handleMoreTasksPress} disabled={aiLoading || !!expandingPhase}>
                  {(aiLoading || !!expandingPhase)
                    ? <ActivityIndicator size="small" color={T.brand} />
                    : <Text style={styles.aiBtnText}>{(aiLoading || !!expandingPhase) ? 'Generating...' : steps.length > 0 ? 'More tasks' : 'Generate tasks'}</Text>
                  }
                </Pressable>
              </View>

              {showPhasePicker && steps.length > 0 && (
                <View style={styles.phasePickerSection}>
                  <View style={styles.phasePickerHeader}>
                    <Feather name="zap" size={13} color={T.brand} />
                    <Text style={styles.phasePickerTitle}>How would you like to add tasks?</Text>
                    <Pressable onPress={() => setShowPhasePicker(false)} hitSlop={8}>
                      <Feather name="x" size={16} color={T.t3} />
                    </Pressable>
                  </View>
                  <Pressable
                    style={styles.phaseOption}
                    onPress={() => { setShowPhasePicker(false); handleAiTasks(); }}
                  >
                    <View style={[styles.phaseOptionIcon, { backgroundColor: T.brand + '12' }]}>
                      <Feather name="layers" size={16} color={T.brand} />
                    </View>
                    <View style={styles.phaseOptionContent}>
                      <Text style={styles.phaseOptionTitle}>Add new phases</Text>
                      <Text style={styles.phaseOptionDesc}>Generate major steps not yet covered</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={T.t3} />
                  </Pressable>
                  <View style={styles.phasePickerDivider} />
                  <Text style={styles.phaseExpandLabel}>Or expand an existing step</Text>
                  {[...steps].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map(step => {
                    const subCount = (step.subtasks || []).length;
                    return (
                      <Pressable
                        key={step.id}
                        style={styles.phaseStepRow}
                        onPress={() => handleExpandPhase(step.id)}
                      >
                        <View style={[styles.phaseOptionIcon, { backgroundColor: (area?.c || T.brand) + '12' }]}>
                          <Feather name="git-branch" size={14} color={area?.c || T.brand} />
                        </View>
                        <View style={styles.phaseOptionContent}>
                          <Text style={styles.phaseStepTitle} numberOfLines={1}>{step.title}</Text>
                          {subCount > 0 && (
                            <Text style={styles.phaseStepSub}>{subCount} subtask{subCount !== 1 ? 's' : ''}</Text>
                          )}
                        </View>
                        <Feather name="chevron-right" size={14} color={T.t3} />
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {steps.length === 0 ? (
                <View style={styles.emptySteps}>
                  <Feather name="clipboard" size={36} color={T.t3} />
                  <Text style={styles.emptyStepsText}>No tasks yet — generate or add one below</Text>
                </View>
              ) : (
                <>
                  {steps.map((step, stepIdx) => (
                    <StepRow
                      key={step.id}
                      step={step}
                      itemId={item.id}
                      projectTitle={item.title}
                      allSteps={steps}
                      onToggle={(done) => toggleStep(item.id, step.id, done)}
                      onMarkToday={(today) => markStepToday(item.id, step.id, today)}
                      onDelete={() => handleDeleteStep(step.id)}
                      onStatusCycle={() => cycleStepStatus(step.id)}
                      onStatusSet={(status) => setStepStatus(step.id, status)}
                      onPriorityCycle={() => cycleStepPriority(step.id)}
                      onEffortCycle={() => cycleStepEffort(step.id)}
                      onAddSubtask={(title) => handleAddSubtask(step.id, title)}
                      onToggleSubtask={(subtaskId) => toggleSubtaskAction(item.id, step.id, subtaskId)}
                      onDeleteSubtask={(subtaskId) => removeSubtaskAction(item.id, step.id, subtaskId)}
                      onAiBreakdown={() => handleAiSubtasks(step.id)}
                      aiSubLoading={aiSubLoadingId === step.id}
                    />
                  ))}

                  {steps.length > 0 && doneSteps === steps.length && item.status !== 'done' && (
                    <Pressable
                      style={styles.allDoneBanner}
                      onPress={() => { updateItem(item.id, { status: 'done', completed_at: new Date().toISOString() }); router.back(); }}
                    >
                      <View style={styles.allDoneIcon}>
                        <Feather name="award" size={18} color={T.green} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.allDoneTitle}>All tasks complete</Text>
                        <Text style={styles.allDoneSub}>Tap to mark this project as done</Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={T.green} />
                    </Pressable>
                  )}
                </>
              )}

              <View style={styles.addTaskBar}>
                <TextInput
                  ref={stepInputRef}
                  value={newStepText}
                  onChangeText={setNewStepText}
                  onSubmitEditing={handleAddStep}
                  placeholder="Add a task..."
                  placeholderTextColor={T.t3}
                  style={styles.addTaskInput}
                  returnKeyType="done"
                />
                <Pressable
                  style={[styles.addTaskBtn, newStepText.trim() && styles.addTaskBtnActive]}
                  onPress={handleAddStep}>
                  <Feather name="plus" size={20} color={newStepText.trim() ? 'white' : T.t3} />
                </Pressable>
              </View>
            </View>
          )}

          {kind === 'habit' && (
            <View style={{ padding: S.md }}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Habit Settings</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Frequency</Text>
                  {editingRecurrence ? (
                    <View style={{ gap: 4 }}>
                      {RECURRENCE_OPTIONS.map(opt => {
                        const sel = item.recurrence?.type === opt.value;
                        return (
                          <Pressable
                            key={opt.value}
                            style={[styles.pickerOption, sel && { backgroundColor: T.brand + '15', borderColor: T.brand + '40' }]}
                            onPress={() => {
                              updateItem(item.id, { recurrence: { ...item.recurrence, type: opt.value as any } });
                              setEditingRecurrence(false);
                            }}
                          >
                            <Text style={[styles.pickerOptionText, sel && { color: T.brand }]}>{opt.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Pressable onPress={() => setEditingRecurrence(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={styles.detailValue}>{formatRecurrence(item) || 'Not set'}</Text>
                      <Feather name="chevron-down" size={12} color={T.t3} />
                    </Pressable>
                  )}
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  {editingDuration ? (
                    <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                      {DURATION_OPTIONS.map(d => {
                        const sel = item.habit_duration === d;
                        return (
                          <Pressable
                            key={d}
                            style={[styles.pickerOption, sel && { backgroundColor: T.brand + '15', borderColor: T.brand + '40' }]}
                            onPress={() => { updateItem(item.id, { habit_duration: d }); setEditingDuration(false); }}
                          >
                            <Text style={[styles.pickerOptionText, sel && { color: T.brand }]}>{formatDuration(d)}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Pressable onPress={() => setEditingDuration(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={styles.detailValue}>{item.habit_duration ? formatDuration(item.habit_duration) : 'Not set'}</Text>
                      <Feather name="chevron-down" size={12} color={T.t3} />
                    </Pressable>
                  )}
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Best time</Text>
                  {editingTimeOfDay ? (
                    <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                      {TIME_OPTIONS.map(t => {
                        const sel = item.habit_time_of_day === t;
                        return (
                          <Pressable
                            key={t}
                            style={[styles.pickerOption, sel && { backgroundColor: T.brand + '15', borderColor: T.brand + '40' }]}
                            onPress={() => { updateItem(item.id, { habit_time_of_day: t }); setEditingTimeOfDay(false); }}
                          >
                            <Text style={[styles.pickerOptionText, sel && { color: T.brand }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Pressable onPress={() => setEditingTimeOfDay(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={styles.detailValue}>
                        {item.habit_time_of_day
                          ? item.habit_time_of_day.charAt(0).toUpperCase() + item.habit_time_of_day.slice(1)
                          : 'Not set'}
                      </Text>
                      <Feather name="chevron-down" size={12} color={T.t3} />
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          )}

          {kind === 'goal' && (
            <View style={{ padding: S.md }}>
              <View style={styles.section}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.sm }}>
                  <Text style={styles.sectionTitle}>Linked Projects & Journeys</Text>
                  <Text style={{ fontSize: 11, color: T.t3, fontWeight: '600' as const }}>
                    {linkedItems.length + journeyProg.length} linked
                  </Text>
                </View>

                {linkedItems.length === 0 && journeyProg.length === 0 && (
                  <View style={styles.emptyLinked}>
                    <Feather name="link" size={20} color={T.t3} />
                    <Text style={styles.sectionEmpty}>No items linked yet. Link projects below to track progress.</Text>
                  </View>
                )}

                {linkedItems.map(li => {
                  const liKind = itemKind(li);
                  const liConf = KIND_CONFIG[liKind];
                  const liArea = ITEM_AREAS[li.area];
                  const liProgress = liKind === 'project' ? projectProgress(li) : 0;
                  const liSteps = li.steps ?? [];
                  const liDone = liSteps.filter(s => s.done).length;
                  return (
                    <Pressable
                      key={li.id}
                      style={styles.linkedCard}
                      onPress={() => router.push(`/item/${li.id}`)}
                    >
                      <View style={[styles.linkedIcon, { backgroundColor: (liArea?.c || liConf.color) + '12' }]}>
                        <Feather name={liConf.icon as any} size={16} color={liArea?.c || liConf.color} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.linkedTitle} numberOfLines={1}>{li.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <Text style={[styles.linkedBadge, { color: liConf.color, backgroundColor: liConf.color + '0D' }]}>{liConf.label}</Text>
                          {liSteps.length > 0 && <Text style={{ fontSize: 10, color: T.t3 }}>{liDone}/{liSteps.length} tasks</Text>}
                        </View>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800' as const, color: liArea?.c || T.brand }}>{Math.round(liProgress * 100)}%</Text>
                      </View>
                      <Pressable onPress={() => unlinkItem(li.id)} hitSlop={8}>
                        <Feather name="x" size={14} color={T.red} style={{ opacity: 0.4 }} />
                      </Pressable>
                    </Pressable>
                  );
                })}

                {journeyProg.map(({ jp, prog }) => {
                  const weekPct = Math.round((jp.current_week / prog.w) * 100);
                  return (
                    <View key={jp.id} style={styles.linkedCard}>
                      <View style={[styles.linkedIcon, { backgroundColor: T.brand + '12' }]}>
                        <Feather name="compass" size={16} color={T.brand} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.linkedTitle} numberOfLines={1}>{prog.t}</Text>
                        <Text style={{ fontSize: 10, color: T.t3 }}>Week {jp.current_week}/{prog.w}</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '800' as const, color: T.brand }}>{weekPct}%</Text>
                    </View>
                  );
                })}
              </View>

              {unlinkedActive.length > 0 && (
                <View style={[styles.section, { marginTop: S.sm }]}>
                  <Text style={[styles.sectionTitle, { marginBottom: S.sm }]}>Link an item</Text>
                  {unlinkedActive.slice(0, 8).map(ui => {
                    const uiKind = itemKind(ui);
                    const uiConf = KIND_CONFIG[uiKind];
                    return (
                      <Pressable key={ui.id} style={styles.linkableRow} onPress={() => linkItem(ui.id)}>
                        <View style={[styles.linkableDot, { backgroundColor: uiConf.color }]} />
                        <Text style={styles.linkableTitle} numberOfLines={1}>{ui.title}</Text>
                        <View style={[styles.linkableBadge, { backgroundColor: uiConf.color + '0D' }]}>
                          <Text style={{ fontSize: 9, fontWeight: '600' as const, color: uiConf.color }}>{uiConf.label}</Text>
                        </View>
                        <Feather name="link" size={12} color={T.brand} />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {kind === 'action' && (
            <View style={{ padding: S.md }}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Action details</Text>
                <Text style={styles.sectionEmpty}>
                  This is a standalone action. Complete it when ready.
                </Text>
              </View>
            </View>
          )}

          {journeyInfo && (
            <View style={{ padding: S.md }}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Journey Progress</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Program</Text>
                  <Text style={styles.detailValue}>{journeyInfo.prog.t}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Expert</Text>
                  <Text style={styles.detailValue}>{journeyInfo.prog.e}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Week</Text>
                  <Text style={styles.detailValue}>{journeyInfo.jp.current_week} / {journeyInfo.prog.w}</Text>
                </View>
                {journeyInfo.jp.current_day !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Day</Text>
                    <Text style={styles.detailValue}>{journeyInfo.jp.current_day}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Streak</Text>
                  <Text style={styles.detailValue}>{journeyInfo.jp.streak} days</Text>
                </View>
                <WeeklyPlanSection journeyInfo={journeyInfo} />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xl, gap: S.md },
  notFoundTitle: { fontSize: F.lg, fontWeight: '700', color: T.text },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.brand, borderRadius: R.lg, paddingHorizontal: S.lg, paddingVertical: S.sm },
  backBtnText: { color: 'white', fontWeight: '700', fontSize: F.md },

  header: { paddingHorizontal: S.md, paddingBottom: S.md, borderBottomWidth: 0.5, borderBottomColor: T.sep },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingTop: S.sm, marginBottom: S.md, gap: 8 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.07)', alignItems: 'center', justifyContent: 'center' },
  kindBadge: { flex: 1, alignItems: 'center', borderRadius: R.sm, paddingVertical: 3 },
  kindBadgeText: { fontSize: 12, fontWeight: '700' },
  deleteBtn: { padding: 6 },

  headerBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: S.md },
  headerEmoji: { fontSize: 32, lineHeight: 36 },
  headerTitle: { fontSize: F.xl, fontWeight: '800', color: T.text, letterSpacing: -0.5, flex: 1 },
  titleInput: { fontSize: F.xl, fontWeight: '800', color: T.text, letterSpacing: -0.5, borderBottomWidth: 2, borderBottomColor: T.brand + '40', paddingBottom: 2 },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  areaName: { fontSize: F.xs, fontWeight: '700' },

  progressSection: { marginBottom: S.sm },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBg: { flex: 1, height: 6, backgroundColor: T.sep, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressPct: { fontSize: 13, fontWeight: '800', minWidth: 36 },
  progressSub: { fontSize: 11, color: T.t3, marginTop: 3 },

  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  habitText: { fontSize: 12, color: T.t2 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  deadlineText: { fontSize: 12, color: T.orange },
  description: { fontSize: 13, color: T.t2, lineHeight: 20, fontStyle: 'italic', marginBottom: 8 },
  descInput: { fontSize: 13, color: T.text, lineHeight: 20, backgroundColor: T.fill, borderWidth: 1.5, borderColor: T.brand + '20', borderRadius: R.sm, padding: S.sm, minHeight: 60, textAlignVertical: 'top' },

  metaSection: { marginTop: S.sm, paddingTop: S.sm, borderTopWidth: 0.5, borderTopColor: T.sep },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6 },
  metaLabel: { fontSize: 13, color: T.t3, fontWeight: '500' as const },
  metaValue: { fontSize: 13, fontWeight: '600' as const, color: T.text },

  detailsSection: {
    marginTop: S.sm, paddingTop: S.sm, borderTopWidth: 0.5, borderTopColor: T.sep,
  },
  detailRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, paddingVertical: 4,
  },
  detailLabel: { fontSize: 12, color: T.t3, fontWeight: '500' as const, width: 70 },
  detailValue: { fontSize: 12, color: T.t2, flex: 1 },

  pickerOption: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: T.sep, backgroundColor: T.fill },
  pickerOptionText: { fontSize: 12, fontWeight: '600' as const, color: T.t2 },

  statusRow: { flexDirection: 'row', gap: 8, marginTop: S.sm },
  statusBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: R.md, borderWidth: 1 },
  statusBtnDone: { backgroundColor: T.green + '0E', borderColor: T.green + '30' },
  statusBtnPause: { backgroundColor: T.orange + '0E', borderColor: T.orange + '30' },
  statusBtnActive: { backgroundColor: T.brand + '0E', borderColor: T.brand + '30' },
  statusBtnText: { fontSize: 12, fontWeight: '700' },

  aiBanner: { marginTop: S.sm, backgroundColor: T.brand + '0E', borderRadius: R.md, padding: 10, borderWidth: 1, borderColor: T.brand + '20' },
  aiBannerText: { fontSize: 13, fontWeight: '600', color: T.brand },

  phasePickerSection: { backgroundColor: T.brand + '06', borderRadius: 14, padding: 14, marginTop: 8, marginBottom: 4, borderWidth: 1, borderColor: T.brand + '15' },
  phasePickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  phasePickerTitle: { flex: 1, fontSize: 13, fontWeight: '700' as const, color: T.brand },
  phaseOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.7)' },
  phaseOptionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  phaseOptionContent: { flex: 1 },
  phaseOptionTitle: { fontSize: 13, fontWeight: '700' as const, color: T.text },
  phaseOptionDesc: { fontSize: 11, color: T.t3, marginTop: 1 },
  phasePickerDivider: { height: StyleSheet.hairlineWidth, backgroundColor: T.sep, marginVertical: 10 },
  phaseExpandLabel: { fontSize: 11, fontWeight: '600' as const, color: T.t3, marginBottom: 8 },
  phaseStepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10 },
  phaseStepTitle: { fontSize: 13, fontWeight: '600' as const, color: T.text },
  phaseStepSub: { fontSize: 11, color: T.t3, marginTop: 1 },

  tasksHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.sm },
  tasksTitle: { flex: 1, fontSize: F.md, fontWeight: '800', color: T.text },
  tasksCount: { fontWeight: '400', color: T.t3 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: T.brand + '0C', borderWidth: 1, borderColor: T.brand + '22' },
  aiBtnText: { fontSize: 12, fontWeight: '700', color: T.brand },

  emptySteps: { alignItems: 'center', paddingVertical: S.xl, gap: S.sm },
  emptyStepsText: { fontSize: 13, color: T.t3, textAlign: 'center', lineHeight: 20 },

  stepCard: { backgroundColor: 'white', borderRadius: R.md, marginBottom: 6, ...shadow.xs, overflow: 'hidden' },
  stepCardDone: { opacity: 0.6 },
  stepMain: { flexDirection: 'row', alignItems: 'flex-start', padding: S.md, gap: 10 },

  statusButton: { paddingTop: 2 },
  statusBox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: T.sep + '60', backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  statusBoxDone: { backgroundColor: T.green, borderColor: T.green },
  statusBoxDoing: { backgroundColor: T.brand + '12', borderColor: T.brand + '40' },
  statusBoxBlocked: { backgroundColor: '#FFF5F5', borderColor: '#E53E3E40' },

  stepTitle: { fontSize: 14, fontWeight: '600', color: T.text, lineHeight: 20 },
  stepTitleDone: { textDecorationLine: 'line-through', color: T.t3 },
  stepMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, flexWrap: 'wrap' },
  metaBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  metaBadgeText: { fontSize: 10, fontWeight: '600' },
  todayBadge: { backgroundColor: T.brand + '12', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  todayBadgeText: { fontSize: 9, fontWeight: '700', color: T.brand },

  expandPanel: { paddingHorizontal: S.md, paddingBottom: S.md, borderTopWidth: 0.5, borderTopColor: T.sep },
  statusPickerRow: { flexDirection: 'row', gap: 4, marginTop: S.sm, marginBottom: 4 },
  statusPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: T.sep, backgroundColor: T.fill },
  statusPillDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '500' as const, color: T.t3 },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: S.sm, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: T.sep, backgroundColor: T.fill },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 11, fontWeight: '600' as const, color: T.t2 },
  allDoneBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: R.md, marginTop: 8, marginBottom: 4,
    backgroundColor: T.green + '0A', borderWidth: 1.5, borderColor: T.green + '25',
  },
  allDoneIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.green + '15', alignItems: 'center', justifyContent: 'center' },
  allDoneTitle: { fontSize: 14, fontWeight: '700' as const, color: T.green },
  allDoneSub: { fontSize: 11, color: T.t3, marginTop: 1 },

  stepDesc: { fontSize: 12, color: T.t2, lineHeight: 18, paddingTop: S.sm, fontStyle: 'italic' },

  subtaskList: { paddingTop: S.sm, gap: 6, borderLeftWidth: 2, borderLeftColor: T.brand + '15', paddingLeft: 12, marginTop: S.sm },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subCheck: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: T.t3, alignItems: 'center', justifyContent: 'center' },
  subCheckDone: { backgroundColor: T.green, borderColor: T.green },
  subtaskText: { fontSize: 12, color: T.t2 },
  subtaskDone: { textDecorationLine: 'line-through', color: T.t3 },

  subActions: { marginTop: S.sm },
  addSubRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  addSubInput: { flex: 1, fontSize: 13, padding: 8, borderRadius: 8, borderWidth: 1.5, borderColor: T.brand + '30', backgroundColor: 'white', color: T.text },
  addSubBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: T.fill },
  addSubBtnText: { fontSize: 12, fontWeight: '700', color: T.t3 },

  addTaskBar: { flexDirection: 'row', gap: 8, paddingVertical: S.md },
  addTaskInput: { flex: 1, backgroundColor: 'white', borderRadius: R.md, borderWidth: 1, borderColor: T.sep, paddingHorizontal: S.md, paddingVertical: 11, fontSize: 14, color: T.text },
  addTaskBtn: { width: 44, height: 44, borderRadius: R.md, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  addTaskBtnActive: { backgroundColor: T.brand },

  bodyScroll: { flex: 1 },
  section: { backgroundColor: 'white', borderRadius: R.lg, padding: S.md, marginBottom: S.md, ...shadow.xs },
  sectionTitle: { fontSize: F.sm, fontWeight: '700', color: T.text, marginBottom: 4 },
  sectionEmpty: { fontSize: 13, color: T.t3, lineHeight: 20, textAlign: 'center', marginTop: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: T.sep },
  detailLabel: { fontSize: 13, color: T.t3 },
  detailValue: { fontSize: 13, fontWeight: '600', color: T.text },

  emptyLinked: { alignItems: 'center', paddingVertical: S.lg, gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: T.sep, borderRadius: R.md },
  linkedCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: R.md, backgroundColor: T.fill, marginBottom: 6 },
  linkedIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linkedTitle: { fontSize: 14, fontWeight: '650' as any, color: T.text },
  linkedBadge: { fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },

  linkableRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: T.sep },
  linkableDot: { width: 8, height: 8, borderRadius: 4 },
  linkableTitle: { flex: 1, fontSize: 13, fontWeight: '500', color: T.text },
  linkableBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },

  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  weekDot: { width: 8, height: 8, borderRadius: 4 },
  waWeekActions: { marginLeft: 16, marginBottom: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: T.brand + '15', gap: 8 },
  waWeekActionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  waWeekDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  waWeekActionTitle: { fontSize: 13, fontWeight: '600' as const, color: T.text, lineHeight: 18 },
  waWeekActionDesc: { fontSize: 11, color: T.t2, lineHeight: 16, marginTop: 1 },
  waWeekActionDur: { fontSize: 10, color: T.t3, fontWeight: '500' as const, marginTop: 2 },
});
