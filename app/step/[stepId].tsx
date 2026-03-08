import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { T, S, F, R, shadow } from '../../constants/theme';
import { STEP_STATUS, PRIORITY, EFFORT } from '../../constants/config';
import { useStore } from '../../lib/store';
import type { Step, Subtask } from '../../types';
import * as Crypto from 'expo-crypto';

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());
}

const STATUS_ORDER: Step['status'][] = ['todo', 'doing', 'blocked', 'done'];
const PRIORITY_ORDER = ['normal', 'high', 'urgent', 'low'] as const;
const EFFORT_ORDER = ['quick', 'medium', 'deep'] as const;

export default function StepDetailScreen() {
  const { stepId, itemId } = useLocalSearchParams<{ stepId: string; itemId: string }>();
  const item = useStore(s => s.items.find(i => i.id === itemId));
  const toggleStep = useStore(s => s.toggleStep);
  const updateStep = useStore(s => s.updateStep);
  const updateStepStatus = useStore(s => s.updateStepStatus);
  const markStepToday = useStore(s => s.markStepToday);
  const toggleSubtask = useStore(s => s.toggleSubtask);
  const addSubtask = useStore(s => s.addSubtask);
  const removeSubtask = useStore(s => s.removeSubtask);
  const removeStep = useStore(s => s.removeStep);

  const step = item?.steps?.find(s => s.id === stepId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const [addingSub, setAddingSub] = useState(false);
  const [editingDue, setEditingDue] = useState(false);
  const [dueDraft, setDueDraft] = useState('');
  const [editingEstMin, setEditingEstMin] = useState(false);
  const subInputRef = useRef<TextInput>(null);

  if (!item || !step || !itemId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={T.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Task not found</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={32} color={T.t3} />
          <Text style={styles.emptyText}>This task no longer exists</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusConf = STEP_STATUS[step.status] ?? STEP_STATUS.todo;
  const prConf = PRIORITY[step.priority] ?? PRIORITY.normal;
  const efConf = EFFORT[step.effort] ?? EFFORT.medium;
  const subtasks = step.subtasks ?? [];
  const subDone = subtasks.filter(s => s.done).length;

  function handleStatusSet(status: Step['status']) {
    if (!itemId) return;
    updateStepStatus(itemId, step.id, status);
    if (status === 'done') toggleStep(itemId, step.id, true);
    else if (step.done) toggleStep(itemId, step.id, false);
  }

  function handlePriorityCycle() {
    if (!itemId) return;
    const idx = PRIORITY_ORDER.indexOf(step.priority as any);
    const next = PRIORITY_ORDER[(idx + 1) % PRIORITY_ORDER.length];
    updateStep(itemId, step.id, { priority: next });
  }

  function handleEffortCycle() {
    if (!itemId) return;
    const idx = EFFORT_ORDER.indexOf(step.effort as any);
    const next = EFFORT_ORDER[(idx + 1) % EFFORT_ORDER.length];
    updateStep(itemId, step.id, { effort: next });
  }

  function handleSaveTitle() {
    if (!itemId || !titleDraft.trim()) { setEditingTitle(false); return; }
    updateStep(itemId, step.id, { title: titleDraft.trim() });
    setEditingTitle(false);
  }

  function handleSaveDesc() {
    if (!itemId) return;
    updateStep(itemId, step.id, { description: descDraft.trim() || undefined });
    setEditingDesc(false);
  }

  function handleSaveNotes() {
    if (!itemId) return;
    updateStep(itemId, step.id, { notes: notesDraft.trim() || undefined });
    setEditingNotes(false);
  }

  function handleAddSubtask() {
    if (!itemId || !subtaskDraft.trim()) return;
    const newSub: Subtask = {
      id: Crypto.randomUUID(),
      step_id: step.id,
      title: subtaskDraft.trim(),
      done: false,
      assignees: [],
      sort_order: subtasks.length,
    };
    addSubtask(itemId, step.id, newSub);
    setSubtaskDraft('');
  }

  function handleDeleteStep() {
    if (!itemId) return;
    Alert.alert('Remove Task', `Remove "${step.title}" from this project?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { removeStep(itemId, step.id); router.back(); } },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={T.text} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{item.emoji} {item.title}</Text>
        </View>
        <Pressable onPress={handleDeleteStep} hitSlop={8} style={styles.deleteBtn}>
          <Feather name="trash-2" size={16} color={T.red} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={styles.statusToggle}
          onPress={() => toggleStep(itemId!, step.id, !step.done)}
        >
          <View style={[
            styles.statusBox,
            step.done && styles.statusBoxDone,
            step.status === 'doing' && styles.statusBoxDoing,
            step.status === 'blocked' && styles.statusBoxBlocked,
          ]}>
            {step.done ? (
              <Feather name="check" size={16} color="white" />
            ) : step.status === 'blocked' ? (
              <Feather name="alert-triangle" size={12} color="#E53E3E" />
            ) : step.status === 'doing' ? (
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: T.brand }} />
            ) : (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusConf.dot }} />
            )}
          </View>
          <Text style={[styles.statusLabel, { color: statusConf.color }]}>{statusConf.label}</Text>
        </Pressable>

        {editingTitle ? (
          <TextInput
            autoFocus
            value={titleDraft}
            onChangeText={setTitleDraft}
            onBlur={handleSaveTitle}
            onSubmitEditing={handleSaveTitle}
            style={styles.titleInput}
            multiline
          />
        ) : (
          <Pressable onPress={() => { setTitleDraft(step.title); setEditingTitle(true); }}>
            <Text style={[styles.title, step.done && styles.titleDone]}>{step.title}</Text>
          </Pressable>
        )}

        <View style={styles.statusPickerRow}>
          {STATUS_ORDER.map(s => {
            const sc = STEP_STATUS[s];
            const active = step.status === s;
            return (
              <Pressable
                key={s}
                style={[styles.statusPill, active && { backgroundColor: sc.dot + '18', borderColor: sc.dot + '40' }]}
                onPress={() => handleStatusSet(s)}
              >
                <View style={[styles.statusPillDot, { backgroundColor: active ? sc.dot : T.sep }]} />
                <Text style={[styles.statusPillText, active && { color: sc.color, fontWeight: '700' as const }]}>{sc.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.card, shadow.xs]}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Priority</Text>
            <Pressable style={[styles.metaValue, { backgroundColor: prConf.bg }]} onPress={handlePriorityCycle}>
              <Feather name="flag" size={11} color={prConf.color} />
              <Text style={[styles.metaValueText, { color: prConf.color }]}>{prConf.label}</Text>
            </Pressable>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Effort</Text>
            <Pressable style={[styles.metaValue, { backgroundColor: efConf.color + '08' }]} onPress={handleEffortCycle}>
              <Text style={[styles.metaValueText, { color: efConf.color }]}>{efConf.emoji} {efConf.label}</Text>
            </Pressable>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Today</Text>
            <Pressable
              style={[styles.metaValue, step.today ? { backgroundColor: T.brand + '10' } : { backgroundColor: T.fill }]}
              onPress={() => itemId && markStepToday(itemId, step.id, !step.today)}
            >
              <Feather name={step.today ? 'sun' : 'plus'} size={11} color={step.today ? T.brand : T.t3} />
              <Text style={[styles.metaValueText, { color: step.today ? T.brand : T.t3 }]}>
                {step.today ? 'In Today' : 'Add to Today'}
              </Text>
            </Pressable>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Due</Text>
            {editingDue ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TextInput
                  autoFocus
                  value={dueDraft}
                  onChangeText={setDueDraft}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={T.t3}
                  keyboardType="numbers-and-punctuation"
                  style={[styles.metaValueText, { flex: 1, padding: 0, borderBottomWidth: 1, borderBottomColor: T.brand + '40' }]}
                  onBlur={() => { const v = dueDraft.trim(); if (v && !isValidDate(v)) { setEditingDue(false); return; } updateStep(itemId!, step.id, { due_date: v || undefined }); setEditingDue(false); }}
                  onSubmitEditing={() => { const v = dueDraft.trim(); if (v && !isValidDate(v)) { setEditingDue(false); return; } updateStep(itemId!, step.id, { due_date: v || undefined }); setEditingDue(false); }}
                  returnKeyType="done"
                />
                {dueDraft.trim() ? (
                  <Pressable onPress={() => { updateStep(itemId!, step.id, { due_date: undefined }); setDueDraft(''); setEditingDue(false); }} hitSlop={8}>
                    <Feather name="x" size={14} color={T.red} style={{ opacity: 0.5 }} />
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <Pressable
                style={[styles.metaValue, { backgroundColor: step.due_date ? T.orange + '08' : T.fill }]}
                onPress={() => { setDueDraft(step.due_date || ''); setEditingDue(true); }}
              >
                <Feather name="calendar" size={11} color={step.due_date ? T.orange : T.t3} />
                <Text style={[styles.metaValueText, { color: step.due_date ? T.orange : T.t3 }]}>
                  {step.due_date || 'Set due date...'}
                </Text>
              </Pressable>
            )}
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Estimate</Text>
            {editingEstMin ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable style={styles.stepperBtn} onPress={() => {
                  const val = Math.max(5, (step.estimated_minutes ?? 15) - 5);
                  updateStep(itemId!, step.id, { estimated_minutes: val });
                }}>
                  <Feather name="minus" size={12} color={T.t2} />
                </Pressable>
                <Text style={[styles.metaValueText, { minWidth: 45, textAlign: 'center' as const, color: T.t2 }]}>
                  {step.estimated_minutes ?? 15} min
                </Text>
                <Pressable style={styles.stepperBtn} onPress={() => {
                  const val = Math.min(480, (step.estimated_minutes ?? 15) + 5);
                  updateStep(itemId!, step.id, { estimated_minutes: val });
                }}>
                  <Feather name="plus" size={12} color={T.t2} />
                </Pressable>
                <Pressable onPress={() => setEditingEstMin(false)} hitSlop={8}>
                  <Feather name="check" size={14} color={T.brand} />
                </Pressable>
                <Pressable onPress={() => { updateStep(itemId!, step.id, { estimated_minutes: undefined }); setEditingEstMin(false); }} hitSlop={8}>
                  <Feather name="x" size={14} color={T.red} style={{ opacity: 0.5 }} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[styles.metaValue, { backgroundColor: T.fill }]}
                onPress={() => setEditingEstMin(true)}
              >
                <Feather name="clock" size={11} color={T.t3} />
                <Text style={[styles.metaValueText, { color: step.estimated_minutes ? T.t2 : T.t3 }]}>
                  {step.estimated_minutes ? `${step.estimated_minutes} min` : 'Set estimate...'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={[styles.card, shadow.xs]}>
          <Text style={styles.sectionLabel}>Description</Text>
          {editingDesc ? (
            <View>
              <TextInput
                autoFocus
                value={descDraft}
                onChangeText={setDescDraft}
                onBlur={handleSaveDesc}
                style={styles.descInput}
                multiline
                placeholder="Add a description..."
                placeholderTextColor={T.t3}
              />
              <Pressable style={styles.saveBtn} onPress={handleSaveDesc}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => { setDescDraft(step.description || ''); setEditingDesc(true); }}>
              <Text style={step.description ? styles.descText : styles.descPlaceholder}>
                {step.description || 'Tap to add description...'}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.card, shadow.xs]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Subtasks</Text>
            {subtasks.length > 0 && (
              <Text style={[styles.sectionCount, subDone === subtasks.length && subtasks.length > 0 && { color: T.green }]}>
                {subDone}/{subtasks.length}
              </Text>
            )}
          </View>

          {subtasks.map(sub => (
            <View key={sub.id} style={styles.subtaskRow}>
              <Pressable onPress={() => toggleSubtask(itemId!, step.id, sub.id)} hitSlop={4}>
                <View style={[styles.subCheck, sub.done && styles.subCheckDone]}>
                  {sub.done && <Feather name="check" size={9} color="white" />}
                </View>
              </Pressable>
              <Text style={[styles.subtaskText, sub.done && styles.subtaskDone, { flex: 1 }]} numberOfLines={2}>
                {sub.title}
              </Text>
              <Pressable onPress={() => removeSubtask(itemId!, step.id, sub.id)} hitSlop={8}>
                <Feather name="x" size={13} color={T.red} style={{ opacity: 0.4 }} />
              </Pressable>
            </View>
          ))}

          {subtasks.length === 0 && !addingSub && (
            <Text style={styles.emptySubtasks}>No subtasks yet</Text>
          )}

          {addingSub ? (
            <View style={styles.addSubRow}>
              <TextInput
                ref={subInputRef}
                autoFocus
                value={subtaskDraft}
                onChangeText={setSubtaskDraft}
                onSubmitEditing={handleAddSubtask}
                placeholder="Subtask name..."
                placeholderTextColor={T.t3}
                style={styles.addSubInput}
                returnKeyType="done"
              />
              <Pressable
                style={[styles.addSubBtn, subtaskDraft.trim() ? { backgroundColor: T.brand } : {}]}
                onPress={handleAddSubtask}
              >
                <Text style={[styles.addSubBtnText, subtaskDraft.trim() ? { color: 'white' } : {}]}>Add</Text>
              </Pressable>
              <Pressable onPress={() => { setAddingSub(false); setSubtaskDraft(''); }} hitSlop={8}>
                <Feather name="x" size={14} color={T.t3} />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.addSubTrigger} onPress={() => setAddingSub(true)}>
              <Feather name="plus" size={12} color={T.brand} />
              <Text style={styles.addSubTriggerText}>Add subtask</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.card, shadow.xs]}>
          <Text style={styles.sectionLabel}>Notes</Text>
          {editingNotes ? (
            <View>
              <TextInput
                autoFocus
                value={notesDraft}
                onChangeText={setNotesDraft}
                onBlur={handleSaveNotes}
                style={styles.descInput}
                multiline
                placeholder="Add notes..."
                placeholderTextColor={T.t3}
              />
              <Pressable style={styles.saveBtn} onPress={handleSaveNotes}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => { setNotesDraft(step.notes || ''); setEditingNotes(true); }}>
              <Text style={step.notes ? styles.descText : styles.descPlaceholder}>
                {step.notes || 'Tap to add notes...'}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: S.md,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: T.sep,
    ...Platform.select({
      web: { paddingTop: 67 + 10 },
      default: {},
    }),
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: T.fill,
    alignItems: 'center', justifyContent: 'center',
  },
  headerSubtitle: {
    fontSize: 13, fontWeight: '600' as const, color: T.t3,
  },
  headerTitle: {
    fontSize: 16, fontWeight: '700' as const, color: T.text, flex: 1, textAlign: 'center',
  },
  deleteBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: T.red + '08',
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: S.md },

  statusToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  statusBox: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 2,
    borderColor: T.t3 + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  statusBoxDone: { backgroundColor: T.green, borderColor: T.green },
  statusBoxDoing: { borderColor: T.brand, backgroundColor: T.brand + '12' },
  statusBoxBlocked: { borderColor: '#E53E3E', backgroundColor: '#E53E3E12' },
  statusLabel: { fontSize: 13, fontWeight: '600' as const },

  title: {
    fontSize: 20, fontWeight: '700' as const, color: T.text,
    lineHeight: 28, marginBottom: 12,
  },
  titleDone: { textDecorationLine: 'line-through', color: T.t3 },
  titleInput: {
    fontSize: 20, fontWeight: '700' as const, color: T.text,
    lineHeight: 28, marginBottom: 12, padding: 0,
    borderBottomWidth: 1, borderBottomColor: T.brand + '40',
  },

  statusPickerRow: {
    flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap',
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: T.fill, borderWidth: 1, borderColor: 'transparent',
  },
  statusPillDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 11, fontWeight: '500' as const, color: T.t3 },

  card: {
    backgroundColor: T.glass,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: T.sep,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 12, fontWeight: '700' as const, color: T.t2,
    textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8,
  },
  sectionCount: {
    fontSize: 12, fontWeight: '700' as const, color: T.t3, marginBottom: 8,
  },

  metaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8,
  },
  metaLabel: { fontSize: 14, color: T.t2 },
  metaValue: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  metaValueText: { fontSize: 13, fontWeight: '600' as const, color: T.t2 },
  metaDivider: { height: 0.5, backgroundColor: T.sep },
  stepperBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: T.fill, borderWidth: 1, borderColor: T.sep, alignItems: 'center' as const, justifyContent: 'center' as const },

  descText: { fontSize: 14, color: T.text, lineHeight: 20 },
  descPlaceholder: { fontSize: 14, color: T.t3, fontStyle: 'italic' },
  descInput: {
    fontSize: 14, color: T.text, lineHeight: 20,
    minHeight: 60, textAlignVertical: 'top', padding: 0,
  },
  saveBtn: {
    alignSelf: 'flex-end', marginTop: 6,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6,
    backgroundColor: T.brand,
  },
  saveBtnText: { fontSize: 12, fontWeight: '600' as const, color: 'white' },

  subtaskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6,
  },
  subCheck: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.5,
    borderColor: T.t3 + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  subCheckDone: { backgroundColor: T.green, borderColor: T.green },
  subtaskText: { fontSize: 13, color: T.text },
  subtaskDone: { textDecorationLine: 'line-through', color: T.t3 },
  emptySubtasks: { fontSize: 13, color: T.t3, paddingVertical: 8, fontStyle: 'italic' },

  addSubRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6,
  },
  addSubInput: {
    flex: 1, fontSize: 13, color: T.text, padding: 8,
    backgroundColor: T.fill, borderRadius: 8,
  },
  addSubBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6,
    backgroundColor: T.fill,
  },
  addSubBtnText: { fontSize: 12, fontWeight: '600' as const, color: T.t3 },
  addSubTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6,
    paddingVertical: 6,
  },
  addSubTriggerText: { fontSize: 13, fontWeight: '600' as const, color: T.brand },

  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  emptyText: { fontSize: 15, color: T.t3 },
});
