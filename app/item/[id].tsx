import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, FadeIn, FadeOut,
} from 'react-native-reanimated';
import { T, S, F, R, shadow } from '../../constants/theme';
import { ITEM_AREAS, KIND_CONFIG, PRIORITY, EFFORT, STEP_STATUS } from '../../constants/config';
import { itemKind, projectProgress, createStep, formatRecurrence, formatDuration } from '../../utils/items';
import { formatDeadline, isOverdue } from '../../utils/dates';
import { generateProjectTasks, generateSubtasks } from '../../lib/ai';
import { useStore } from '../../lib/store';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { Step } from '../../types';

// ── Step row ──────────────────────────────────────────────
function StepRow({
  step, itemId, projectTitle,
  onToggle, onMarkToday, onDelete,
}: {
  step:         Step;
  itemId:       string;
  projectTitle: string;
  onToggle:     (done: boolean) => void;
  onMarkToday:  (today: boolean) => void;
  onDelete:     () => void;
}) {
  const [expanded,      setExpanded]      = useState(false);
  const [loadingAi,     setLoadingAi]     = useState(false);
  const [subtaskDraft,  setSubtaskDraft]  = useState('');
  const statusConf = STEP_STATUS[step.status] ?? STEP_STATUS.todo;

  async function handleAiBreakdown() {
    setLoadingAi(true);
    const subs = await generateSubtasks(step.title, projectTitle);
    if (subs.length) {
      // Add subtasks via Supabase
      const rows = subs.map((title, i) => ({
        step_id:    step.id,
        title,
        done:       false,
        sort_order: i,
      }));
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('subtasks').insert(rows);
        if (error) Alert.alert('Error', error.message);
      }
    }
    setLoadingAi(false);
  }

  return (
    <View style={[styles.stepCard, step.done && styles.stepCardDone]}>
      {/* Main row */}
      <Pressable style={styles.stepMain} onPress={() => setExpanded(e => !e)}>
        {/* Checkbox */}
        <Pressable style={styles.checkboxWrap} onPress={() => onToggle(!step.done)}>
          <View style={[styles.checkbox, step.done && styles.checkboxDone]}>
            {step.done && <Text style={styles.checkMark}>✓</Text>}
          </View>
        </Pressable>

        {/* Title + meta */}
        <View style={{ flex: 1 }}>
          <Text style={[styles.stepTitle, step.done && styles.stepTitleDone]}
            numberOfLines={expanded ? 0 : 2}>
            {step.title}
          </Text>
          <View style={styles.stepMeta}>
            {/* Status dot */}
            <View style={[styles.statusDot, { backgroundColor: statusConf.dot }]} />
            <Text style={[styles.statusLabel, { color: statusConf.color }]}>{statusConf.label}</Text>
            {/* Effort */}
            {step.effort && (
              <Text style={styles.effortLabel}>{EFFORT[step.effort]?.emoji}</Text>
            )}
            {/* Today badge */}
            {step.today && !step.done && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>Today</Text>
              </View>
            )}
          </View>
        </View>

        {/* Expand chevron */}
        <Text style={[styles.chevron, expanded && { transform: [{ rotate: '90deg' }] }]}>›</Text>
      </Pressable>

      {/* Expanded panel */}
      {expanded && (
        <Animated.View entering={FadeIn.duration(150)} style={styles.expandPanel}>
          {/* Description */}
          {step.description ? (
            <Text style={styles.stepDesc}>{step.description}</Text>
          ) : null}

          {/* Subtasks */}
          {(step.subtasks?.length ?? 0) > 0 && (
            <View style={styles.subtaskList}>
              {(step.subtasks ?? []).map(sub => (
                <Pressable key={sub.id} style={styles.subtaskRow}
                  onPress={async () => {
                    if (isSupabaseConfigured && supabase) await supabase.from('subtasks').update({ done: !sub.done }).eq('id', sub.id);
                  }}>
                  <View style={[styles.subCheck, sub.done && styles.subCheckDone]}>
                    {sub.done && <Text style={{ color: 'white', fontSize: 8 }}>✓</Text>}
                  </View>
                  <Text style={[styles.subtaskText, sub.done && styles.subtaskDone]}>
                    {sub.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.panelActions}>
            {/* Mark Today */}
            <Pressable style={[styles.panelBtn, step.today && styles.panelBtnActive]}
              onPress={() => onMarkToday(!step.today)}>
              <Text style={[styles.panelBtnText, step.today && { color: T.brand }]}>
                {step.today ? '★ In Today' : '☆ Add to Today'}
              </Text>
            </Pressable>

            {/* AI break down */}
            <Pressable style={styles.panelBtn} onPress={handleAiBreakdown} disabled={loadingAi}>
              {loadingAi
                ? <ActivityIndicator size="small" color={T.brand} />
                : <Text style={[styles.panelBtnText, { color: T.brand }]}>✨ AI break down</Text>
              }
            </Pressable>

            {/* Delete */}
            <Pressable style={[styles.panelBtn, styles.panelBtnDanger]} onPress={onDelete}>
              <Text style={[styles.panelBtnText, { color: T.red }]}>Delete</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ── Main item detail page ─────────────────────────────────
export default function ItemDetailPage() {
  const { id }      = useLocalSearchParams<{ id: string }>();
  const getItem     = useStore(s => s.getItem);
  const toggleStep  = useStore(s => s.toggleStep);
  const markStepToday = useStore(s => s.markStepToday);
  const updateItem  = useStore(s => s.updateItem);
  const removeItem  = useStore(s => s.removeItem);

  const item = getItem(id);

  const [newStepText,  setNewStepText]  = useState('');
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiBanner,     setAiBanner]     = useState<string | null>(null);
  const stepInputRef = useRef<TextInput>(null);

  if (!item) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundEmoji}>🔍</Text>
          <Text style={styles.notFoundTitle}>Item not found</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const kind      = itemKind(item);
  const kindConf  = KIND_CONFIG[kind];
  const area      = ITEM_AREAS[item.area];
  const progress  = kind === 'project' ? projectProgress(item) : null;
  const steps     = item.steps ?? [];
  const doneSteps = steps.filter(s => s.done).length;

  // ── Add step manually ──────────────────────────────────
  async function handleAddStep() {
    if (!newStepText.trim()) return;
    const step = createStep(item.id, {
      title:      newStepText.trim(),
      sort_order: steps.length,
    });
    // Optimistic update via updateItem
    updateItem(item.id, { steps: [...steps, step] });
    setNewStepText('');
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('steps').insert({
        id:         step.id,
        item_id:    step.item_id,
        title:      step.title,
        done:       false,
        status:     'todo',
        priority:   'normal',
        effort:     'medium',
        today:      false,
        blocked_by: [],
        assignees:  [],
        sort_order: step.sort_order,
      });
      if (error) console.error(error);
    }
  }

  // ── AI generate tasks ──────────────────────────────────
  async function handleAiTasks() {
    if (aiLoading) return;
    setAiLoading(true);
    setAiBanner(null);
    try {
      const result = await generateProjectTasks(
        item.title,
        steps.map(s => s.title)
      );
      if (!result.tasks.length) {
        setAiBanner('AI couldn\'t suggest tasks for this project. Try being more specific in the title.');
        return;
      }
      // Persist new steps
      const newSteps = result.tasks.map((title, i) => createStep(item.id, {
        title,
        sort_order: steps.length + i,
      }));
      updateItem(item.id, { steps: [...steps, ...newSteps] });
      if (isSupabaseConfigured && supabase) {
        await supabase.from('steps').insert(newSteps.map(s => ({
          id: s.id, item_id: s.item_id, title: s.title,
          done: false, status: 'todo', priority: 'normal', effort: 'medium',
          today: false, blocked_by: [], assignees: [], sort_order: s.sort_order,
        })));
      }
      setAiBanner(`✨ Added ${result.tasks.length} tasks`);
      setTimeout(() => setAiBanner(null), 3000);
    } catch {
      setAiBanner('Something went wrong. Try again.');
    } finally {
      setAiLoading(false);
    }
  }

  // ── Delete step ────────────────────────────────────────
  async function handleDeleteStep(stepId: string) {
    updateItem(item.id, { steps: steps.filter(s => s.id !== stepId) });
    if (isSupabaseConfigured && supabase) await supabase.from('steps').delete().eq('id', stepId);
  }

  // ── Delete item ────────────────────────────────────────
  function handleDeleteItem() {
    Alert.alert(
      'Delete item',
      `Delete "${item.title}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          removeItem(item.id);
          router.back();
        }},
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>

        {/* ── Header ── */}
        <LinearGradient
          colors={[area?.c + '18' ?? T.fill, T.bg]}
          style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable style={styles.closeBtn} onPress={() => router.back()}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
            <View style={[styles.kindBadge, { backgroundColor: kindConf.color + '14' }]}>
              <Text style={[styles.kindBadgeText, { color: kindConf.color }]}>{kindConf.label}</Text>
            </View>
            <Pressable style={styles.deleteBtn} onPress={handleDeleteItem}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </Pressable>
          </View>

          <View style={styles.headerBody}>
            <Text style={styles.headerEmoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{item.title}</Text>
              {area && (
                <View style={styles.areaRow}>
                  <Text style={{ fontSize: 14 }}>{area.e}</Text>
                  <Text style={[styles.areaName, { color: area.c }]}>{area.n}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Progress bar */}
          {progress !== null && (
            <View style={styles.progressSection}>
              <View style={styles.progressRow}>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, {
                    width:           `${Math.round(progress * 100)}%` as any,
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

          {/* Habit info */}
          {kind === 'habit' && (
            <View style={styles.habitRow}>
              <Text style={styles.habitText}>
                🔄 {formatRecurrence(item)}
                {item.habit_duration ? `  ·  ${formatDuration(item.habit_duration)}` : ''}
                {item.habit_time_of_day ? `  ·  ${item.habit_time_of_day}` : ''}
              </Text>
            </View>
          )}

          {/* Deadline */}
          {item.deadline && (
            <View style={styles.deadlineRow}>
              <Text style={[styles.deadlineText, isOverdue(item.deadline) && { color: T.red }]}>
                📅 {formatDeadline(item.deadline)}
              </Text>
            </View>
          )}

          {/* Description */}
          {item.description ? (
            <Text style={styles.description}>{item.description}</Text>
          ) : null}

          {/* Status actions */}
          <View style={styles.statusRow}>
            {item.status !== 'done' && (
              <Pressable style={[styles.statusBtn, styles.statusBtnDone]}
                onPress={() => { updateItem(item.id, { status: 'done', completed_at: new Date().toISOString() }); router.back(); }}>
                <Text style={[styles.statusBtnText, { color: T.green }]}>✓ Mark done</Text>
              </Pressable>
            )}
            {item.status === 'active' && (
              <Pressable style={[styles.statusBtn, styles.statusBtnPause]}
                onPress={() => updateItem(item.id, { status: 'paused', paused_at: new Date().toISOString() })}>
                <Text style={[styles.statusBtnText, { color: T.orange }]}>⏸ Pause</Text>
              </Pressable>
            )}
            {item.status === 'paused' && (
              <Pressable style={[styles.statusBtn, styles.statusBtnActive]}
                onPress={() => updateItem(item.id, { status: 'active', paused_at: undefined })}>
                <Text style={[styles.statusBtnText, { color: T.brand }]}>▶ Resume</Text>
              </Pressable>
            )}
          </View>
        </LinearGradient>

        {/* ── Tasks (projects only) ── */}
        {kind === 'project' && (
          <>
            {/* AI banner */}
            {aiBanner && (
              <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.aiBanner}>
                <Text style={styles.aiBannerText}>{aiBanner}</Text>
              </Animated.View>
            )}

            {/* Tasks header */}
            <View style={styles.tasksHeader}>
              <Text style={styles.tasksTitle}>
                Tasks
                {steps.length > 0 && <Text style={styles.tasksCount}> · {steps.length}</Text>}
              </Text>
              <Pressable style={styles.aiBtn} onPress={handleAiTasks} disabled={aiLoading}>
                {aiLoading
                  ? <ActivityIndicator size="small" color={T.brand} />
                  : <Text style={styles.aiBtnText}>✨ Generate tasks</Text>
                }
              </Pressable>
            </View>

            {/* Steps list */}
            <ScrollView
              style={styles.stepsList}
              contentContainerStyle={styles.stepsContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>

              {steps.length === 0 ? (
                <View style={styles.emptySteps}>
                  <Text style={styles.emptyStepsEmoji}>📋</Text>
                  <Text style={styles.emptyStepsText}>No tasks yet — tap ✨ Generate tasks or add one below</Text>
                </View>
              ) : (
                steps.map(step => (
                  <StepRow
                    key={step.id}
                    step={step}
                    itemId={item.id}
                    projectTitle={item.title}
                    onToggle={(done) => toggleStep(item.id, step.id, done)}
                    onMarkToday={(today) => markStepToday(item.id, step.id, today)}
                    onDelete={() => handleDeleteStep(step.id)}
                  />
                ))
              )}

              <View style={{ height: 120 }} />
            </ScrollView>

            {/* ── Sticky add-task bar ── */}
            <View style={styles.addTaskBar}>
              <TextInput
                ref={stepInputRef}
                value={newStepText}
                onChangeText={setNewStepText}
                onSubmitEditing={handleAddStep}
                placeholder="Add a task…"
                placeholderTextColor={T.t3}
                style={styles.addTaskInput}
                returnKeyType="done"
              />
              <Pressable
                style={[styles.addTaskBtn, newStepText.trim() && styles.addTaskBtnActive]}
                onPress={handleAddStep}>
                <Text style={[styles.addTaskBtnText, newStepText.trim() && { color: 'white' }]}>+</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ── Non-project items: just scroll body ── */}
        {kind !== 'project' && (
          <ScrollView style={styles.bodyScroll} contentContainerStyle={{ padding: S.md }}>
            {/* Goal: show linked items */}
            {kind === 'goal' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Working towards this</Text>
                <Text style={styles.sectionEmpty}>
                  Items you link to this goal will appear here.{'\n'}Add projects and habits from the Plan screen.
                </Text>
              </View>
            )}
            {kind === 'habit' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Habit details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Frequency</Text>
                  <Text style={styles.detailValue}>{formatRecurrence(item) || '—'}</Text>
                </View>
                {item.habit_time_of_day && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Best time</Text>
                    <Text style={styles.detailValue}>{item.habit_time_of_day}</Text>
                  </View>
                )}
                {item.habit_duration && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{formatDuration(item.habit_duration)}</Text>
                  </View>
                )}
              </View>
            )}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: T.bg },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xl },
  notFoundEmoji:  { fontSize: 48, marginBottom: S.md },
  notFoundTitle:  { fontSize: F.lg, fontWeight: '700', color: T.text, marginBottom: S.lg },
  backBtn:        { backgroundColor: T.brand, borderRadius: R.lg, paddingHorizontal: S.lg, paddingVertical: S.sm },
  backBtnText:    { color: 'white', fontWeight: '700', fontSize: F.md },

  // ── Header ──
  header:         { paddingHorizontal: S.md, paddingBottom: S.md, borderBottomWidth: 0.5, borderBottomColor: T.sep },
  headerTop:      { flexDirection: 'row', alignItems: 'center', paddingTop: S.sm, marginBottom: S.md, gap: 8 },
  closeBtn:       { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.07)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText:   { fontSize: 13, color: T.t3 },
  kindBadge:      { flex: 1, alignItems: 'center', borderRadius: R.sm, paddingVertical: 3 },
  kindBadgeText:  { fontSize: 12, fontWeight: '700' },
  deleteBtn:      { padding: 6 },
  deleteBtnText:  { fontSize: 12, color: T.red, fontWeight: '600' },

  headerBody:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: S.md },
  headerEmoji:  { fontSize: 32, lineHeight: 36 },
  headerTitle:  { fontSize: F.xl, fontWeight: '800', color: T.text, letterSpacing: -0.5, flex: 1 },
  areaRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  areaName:     { fontSize: F.xs, fontWeight: '700' },

  progressSection: { marginBottom: S.sm },
  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBg:   { flex: 1, height: 6, backgroundColor: T.sep, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressPct:  { fontSize: 13, fontWeight: '800', minWidth: 36 },
  progressSub:  { fontSize: 11, color: T.t3, marginTop: 3 },

  habitRow:     { marginBottom: 6 },
  habitText:    { fontSize: 12, color: T.t2 },
  deadlineRow:  { marginBottom: 6 },
  deadlineText: { fontSize: 12, color: T.orange },
  description:  { fontSize: 13, color: T.t2, lineHeight: 20, fontStyle: 'italic', marginBottom: 8 },

  statusRow:        { flexDirection: 'row', gap: 8, marginTop: S.sm },
  statusBtn:        { flex: 1, paddingVertical: 8, borderRadius: R.md, alignItems: 'center', borderWidth: 1 },
  statusBtnDone:    { backgroundColor: T.green + '0E', borderColor: T.green + '30' },
  statusBtnPause:   { backgroundColor: T.orange + '0E', borderColor: T.orange + '30' },
  statusBtnActive:  { backgroundColor: T.brand + '0E', borderColor: T.brand + '30' },
  statusBtnText:    { fontSize: 12, fontWeight: '700' },

  // ── AI banner ──
  aiBanner:     { margin: S.md, marginBottom: 0, backgroundColor: T.brand + '0E', borderRadius: R.md, padding: 10, borderWidth: 1, borderColor: T.brand + '20' },
  aiBannerText: { fontSize: 13, fontWeight: '600', color: T.brand },

  // ── Tasks header ──
  tasksHeader:  { flexDirection: 'row', alignItems: 'center', padding: S.md, paddingBottom: S.sm },
  tasksTitle:   { flex: 1, fontSize: F.md, fontWeight: '800', color: T.text },
  tasksCount:   { fontWeight: '400', color: T.t3 },
  aiBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: T.brand + '0C', borderWidth: 1, borderColor: T.brand + '22' },
  aiBtnText:    { fontSize: 12, fontWeight: '700', color: T.brand },

  // ── Steps ──
  stepsList:    { flex: 1 },
  stepsContent: { paddingHorizontal: S.md, paddingTop: S.sm },

  emptySteps:     { alignItems: 'center', paddingVertical: S.xl },
  emptyStepsEmoji:{ fontSize: 36, marginBottom: S.sm },
  emptyStepsText: { fontSize: 13, color: T.t3, textAlign: 'center', lineHeight: 20 },

  stepCard:      { backgroundColor: 'white', borderRadius: R.md, marginBottom: 6, ...shadow.xs, overflow: 'hidden' },
  stepCardDone:  { opacity: 0.6 },
  stepMain:      { flexDirection: 'row', alignItems: 'flex-start', padding: S.md, gap: 10 },

  checkboxWrap:  { paddingTop: 2 },
  checkbox:      { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: T.sep, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  checkboxDone:  { backgroundColor: T.green, borderColor: T.green },
  checkMark:     { color: 'white', fontSize: 11, fontWeight: '800' },

  stepTitle:     { fontSize: 14, fontWeight: '600', color: T.text, lineHeight: 20 },
  stepTitleDone: { textDecorationLine: 'line-through', color: T.t3 },
  stepMeta:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  statusDot:     { width: 6, height: 6, borderRadius: 3 },
  statusLabel:   { fontSize: 11, fontWeight: '600' },
  effortLabel:   { fontSize: 12 },
  todayBadge:    { backgroundColor: T.brand + '12', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  todayBadgeText:{ fontSize: 9, fontWeight: '700', color: T.brand },

  chevron: { fontSize: 20, color: T.t3, marginTop: -2 },

  expandPanel:   { paddingHorizontal: S.md, paddingBottom: S.md, borderTopWidth: 0.5, borderTopColor: T.sep },
  stepDesc:      { fontSize: 12, color: T.t2, lineHeight: 18, paddingTop: S.sm, fontStyle: 'italic' },

  subtaskList:   { paddingTop: S.sm, gap: 6 },
  subtaskRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subCheck:      { width: 14, height: 14, borderRadius: 3, borderWidth: 1.5, borderColor: T.t3, alignItems: 'center', justifyContent: 'center' },
  subCheckDone:  { backgroundColor: T.green, borderColor: T.green },
  subtaskText:   { fontSize: 12, color: T.t2 },
  subtaskDone:   { textDecorationLine: 'line-through', color: T.t3 },

  panelActions:  { flexDirection: 'row', gap: 8, marginTop: S.sm },
  panelBtn:      { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: R.sm, borderWidth: 1, borderColor: T.sep, backgroundColor: T.fill },
  panelBtnActive:{ backgroundColor: T.brand + '0A', borderColor: T.brand + '25' },
  panelBtnDanger:{ backgroundColor: T.red + '07', borderColor: T.red + '18' },
  panelBtnText:  { fontSize: 11, fontWeight: '600', color: T.t2 },

  // ── Sticky add bar ──
  addTaskBar:    { flexDirection: 'row', gap: 8, padding: S.md, paddingBottom: S.lg, backgroundColor: T.glassHeavy, borderTopWidth: 0.5, borderTopColor: T.sep },
  addTaskInput:  { flex: 1, backgroundColor: 'white', borderRadius: R.md, borderWidth: 1, borderColor: T.sep, paddingHorizontal: S.md, paddingVertical: 11, fontSize: 14, color: T.text },
  addTaskBtn:    { width: 44, height: 44, borderRadius: R.md, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  addTaskBtnActive: { backgroundColor: T.brand },
  addTaskBtnText:{ fontSize: 22, color: T.t3, fontWeight: '300' },

  // ── Non-project body ──
  bodyScroll:   { flex: 1 },
  section:      { backgroundColor: 'white', borderRadius: R.lg, padding: S.md, marginBottom: S.md },
  sectionTitle: { fontSize: F.sm, fontWeight: '700', color: T.text, marginBottom: S.sm },
  sectionEmpty: { fontSize: 13, color: T.t3, lineHeight: 20 },
  detailRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: T.sep },
  detailLabel:  { fontSize: 13, color: T.t3 },
  detailValue:  { fontSize: 13, fontWeight: '600', color: T.text },
});
