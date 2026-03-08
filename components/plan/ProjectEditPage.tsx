import { useState, useRef } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, Alert,
  StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { useStore } from '@/lib/store';
import { projectProgress, itemKind, createStep } from '@/utils/items';
import { ProgressBar } from '@/components/items/ProgressBar';
import { ITEM_AREAS, STEP_STATUS, PRIORITY, EFFORT } from '@/constants/config';
import { T, S, R, F, shadow } from '@/constants/theme';
import { generateProjectTasks, generateSubtasks, assessProjectComplexity, expandProjectPhase } from '@/lib/ai';
import type { Step, Subtask } from '@/types';

interface ProjectEditPageProps {
  itemId: string;
  onBack: () => void;
  backLabel?: string;
}

const STATUS_ORDER: Step['status'][] = ['todo', 'doing', 'blocked', 'done'];
const PRIORITY_ORDER: ('normal' | 'high' | 'urgent' | 'low')[] = ['normal', 'high', 'urgent', 'low'];
const EFFORT_ORDER: ('quick' | 'medium' | 'deep')[] = ['quick', 'medium', 'deep'];

export function ProjectEditPage({ itemId, onBack, backLabel = 'Back' }: ProjectEditPageProps) {
  const item = useStore(s => s.items.find(i => i.id === itemId));
  const updateItem = useStore(s => s.updateItem);
  const removeItem = useStore(s => s.removeItem);
  const toggleStep = useStore(s => s.toggleStep);
  const addStep = useStore(s => s.addStep);
  const removeStep = useStore(s => s.removeStep);
  const updateStep = useStore(s => s.updateStep);
  const updateStepStatus = useStore(s => s.updateStepStatus);
  const reorderStep = useStore(s => s.reorderStep);
  const toggleSubtask = useStore(s => s.toggleSubtask);
  const addSubtask = useStore(s => s.addSubtask);
  const removeSubtask = useStore(s => s.removeSubtask);
  const reorderSubtask = useStore(s => s.reorderSubtask);
  const pauseItem = useStore(s => s.pauseItem);
  const resumeItem = useStore(s => s.resumeItem);
  const completeItem = useStore(s => s.completeItem);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSubText, setNewSubText] = useState('');
  const [aiTasksLoading, setAiTasksLoading] = useState(false);
  const [aiSubLoading, setAiSubLoading] = useState<string | null>(null);
  const [aiBanner, setAiBanner] = useState<'success' | 'error' | null>(null);
  const [clarifyQuestions, setClarifyQuestions] = useState<string[]>([]);
  const [clarifyAnswers, setClarifyAnswers] = useState<Record<number, string>>({});
  const [showClarify, setShowClarify] = useState(false);
  const [showPhasePicker, setShowPhasePicker] = useState(false);
  const [expandingPhase, setExpandingPhase] = useState<string | null>(null);

  const taskInputRef = useRef<TextInput>(null);
  const subInputRef = useRef<TextInput>(null);

  if (!item) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="alert-circle" size={32} color={T.t3} />
        <Text style={styles.emptyText}>Item not found</Text>
      </View>
    );
  }

  const ai = ITEM_AREAS[item.area];
  const ac = ai?.c || T.brand;
  const steps = item.steps || [];
  const sortedSteps = [...steps].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const pct = Math.round(projectProgress(item) * 100);
  const kind = itemKind(item);
  const doneCount = steps.filter(s => s.done).length;
  const totalCount = steps.length;
  const blockedCount = steps.filter(s => s.status === 'blocked').length;

  const cycleStatus = (step: Step) => {
    const idx = STATUS_ORDER.indexOf(step.status || 'todo');
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateStepStatus(item.id, step.id, next);
  };

  const cyclePriority = (step: Step) => {
    const idx = PRIORITY_ORDER.indexOf((step.priority || 'normal') as any);
    const next = PRIORITY_ORDER[(idx + 1) % PRIORITY_ORDER.length];
    updateStep(item.id, step.id, { priority: next });
  };

  const cycleEffort = (step: Step) => {
    const idx = EFFORT_ORDER.indexOf((step.effort || 'medium') as any);
    const next = EFFORT_ORDER[(idx + 1) % EFFORT_ORDER.length];
    updateStep(item.id, step.id, { effort: next });
  };

  const doAddTask = () => {
    if (!newTaskText.trim()) return;
    const newStep = createStep(item.id, {
      title: newTaskText.trim(),
      sort_order: steps.length,
    });
    addStep(item.id, newStep);
    setNewTaskText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => taskInputRef.current?.focus(), 50);
  };

  const doAddSubtask = (stepId: string) => {
    if (!newSubText.trim()) return;
    const step = steps.find(s => s.id === stepId);
    const existingSubs = step?.subtasks || [];
    const maxOrder = existingSubs.reduce((m, s) => Math.max(m, s.sort_order ?? 0), 0);
    const sub: Subtask = {
      id: Crypto.randomUUID(),
      step_id: stepId,
      title: newSubText.trim(),
      done: false,
      assignees: [],
      sort_order: maxOrder + 1,
    };
    addSubtask(item.id, stepId, sub);
    setNewSubText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => subInputRef.current?.focus(), 50);
  };

  const handleMoreTasksPress = () => {
    if (steps.length > 0) {
      setShowPhasePicker(prev => !prev);
      return;
    }
    handleAiTasks();
  };

  const handleAiTasks = async (context?: string, skipComplexityCheck?: boolean) => {
    if (aiTasksLoading) return;
    setShowPhasePicker(false);
    setAiTasksLoading(true);
    setAiBanner(null);
    try {
      if (steps.length === 0 && !context && !skipComplexityCheck) {
        const complexity = await assessProjectComplexity(item.title);
        if (complexity.complex && complexity.questions.length > 0) {
          setClarifyQuestions(complexity.questions);
          setClarifyAnswers({});
          setShowClarify(true);
          setAiTasksLoading(false);
          return;
        }
      }
      const existing = steps.map(s => s.title);
      const result = await generateProjectTasks(item.title, existing, undefined, context);
      if (result.tasks?.length) {
        result.tasks.forEach((t, i) => {
          const newStep = createStep(item.id, {
            title: t.title,
            sort_order: steps.length + i,
            effort: t.effort || undefined,
          });
          addStep(item.id, newStep);
        });
        setAiBanner('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setAiBanner('error');
    }
    setAiTasksLoading(false);
    setTimeout(() => setAiBanner(null), 3000);
  };

  const handleExpandPhase = async (stepId: string) => {
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
          addStep(item.id, newStep);
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
        ordered.forEach((s, i) => updateStep(item.id, s.id, { sort_order: i }));
        setAiBanner('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setAiBanner('error');
      }
    } catch {
      setAiBanner('error');
    }
    setExpandingPhase(null);
    setTimeout(() => setAiBanner(null), 3000);
  };

  const handleClarifyGenerate = () => {
    const contextParts = clarifyQuestions.map((q, i) =>
      `Q: ${q}\nA: ${clarifyAnswers[i] || '(not answered)'}`
    ).join('\n');
    setShowClarify(false);
    handleAiTasks(contextParts);
  };

  const handleAiSubtasks = async (stepId: string) => {
    if (aiSubLoading) return;
    setAiSubLoading(stepId);
    try {
      const step = steps.find(s => s.id === stepId);
      const existingSubs = step?.subtasks || [];
      let nextOrder = existingSubs.reduce((m, s) => Math.max(m, s.sort_order ?? 0), 0) + 1;
      const subs = await generateSubtasks(step?.title || '', item.title);
      subs.forEach(t => {
        const sub: Subtask = {
          id: Crypto.randomUUID(),
          step_id: stepId,
          title: t,
          done: false,
          assignees: [],
          sort_order: nextOrder++,
        };
        addSubtask(item.id, stepId, sub);
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setAiSubLoading(null);
  };

  const confirmDelete = (type: 'project' | 'step' | 'subtask', ids?: { stepId: string; subtaskId?: string }) => {
    const title = type === 'project' ? `Delete "${item.title}"?` : 'Delete this?';
    Alert.alert(title, "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          if (type === 'project') { removeItem(item.id); onBack(); }
          else if (type === 'step' && ids?.stepId) removeStep(item.id, ids.stepId);
          else if (type === 'subtask' && ids?.stepId && ids?.subtaskId) removeSubtask(item.id, ids.stepId, ids.subtaskId);
        },
      },
    ]);
  };

  const saveTitle = () => {
    if (titleDraft.trim()) updateItem(item.id, { title: titleDraft.trim() });
    setEditingTitle(false);
  };

  const saveDesc = () => {
    updateItem(item.id, { description: descDraft.trim() || undefined });
    setEditingDesc(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Feather name="chevron-left" size={20} color={ac} />
          <Text style={[styles.backText, { color: ac }]}>{backLabel}</Text>
        </Pressable>

        <View style={[styles.heroCard, shadow.md as ViewStyle]}>
          <View style={styles.heroRow}>
            <View style={[styles.heroIcon, { backgroundColor: `${ac}12`, borderColor: `${ac}20` }]}>
              <Feather name="folder" size={22} color={ac} />
            </View>
            <View style={styles.heroContent}>
              {editingTitle ? (
                <TextInput
                  autoFocus
                  value={titleDraft}
                  onChangeText={setTitleDraft}
                  onBlur={saveTitle}
                  onSubmitEditing={saveTitle}
                  style={[styles.titleInput, { borderBottomColor: `${ac}60` }]}
                  returnKeyType="done"
                />
              ) : (
                <Pressable onPress={() => { setTitleDraft(item.title); setEditingTitle(true); }}>
                  <Text style={styles.heroTitle}>{item.title}</Text>
                </Pressable>
              )}
              <View style={styles.heroBadges}>
                {ai && (
                  <View style={[styles.badge, { backgroundColor: `${ac}10` }]}>
                    <Text style={[styles.badgeText, { color: ac }]}>{ai.n.split(' ')[0]}</Text>
                  </View>
                )}
                <View style={[styles.badge, { backgroundColor: item.status === 'paused' ? `${T.orange}10` : `${T.green}10` }]}>
                  <Text style={[styles.badgeText, { color: item.status === 'paused' ? T.orange : T.green, textTransform: 'capitalize' as const }]}>{item.status}</Text>
                </View>
                {blockedCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: '#FFF5F5' }]}>
                    <Feather name="alert-triangle" size={10} color="#E53E3E" />
                    <Text style={[styles.badgeText, { color: '#E53E3E' }]}>{blockedCount} blocked</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.heroActions}>
            {item.status === 'paused' ? (
              <Pressable style={[styles.actionBtn, { borderColor: `${T.green}30`, backgroundColor: `${T.green}08` }]} onPress={() => resumeItem(item.id)}>
                <Feather name="play" size={13} color={T.green} />
                <Text style={[styles.actionBtnText, { color: T.green }]}>Resume</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.actionBtn, { borderColor: `${T.orange}30`, backgroundColor: `${T.orange}08` }]} onPress={() => pauseItem(item.id)}>
                <Feather name="pause" size={13} color={T.orange} />
                <Text style={[styles.actionBtnText, { color: T.orange }]}>Pause</Text>
              </Pressable>
            )}
            <Pressable style={[styles.actionBtn, { borderColor: `${T.red}20`, backgroundColor: `${T.red}06` }]} onPress={() => confirmDelete('project')}>
              <Feather name="trash-2" size={13} color={T.red} />
            </Pressable>
          </View>

          <View style={styles.descSection}>
            {editingDesc ? (
              <View>
                <TextInput
                  autoFocus
                  multiline
                  value={descDraft}
                  onChangeText={setDescDraft}
                  onBlur={saveDesc}
                  placeholder="What is this project about?"
                  placeholderTextColor={T.t3}
                  style={[styles.descInput, { borderColor: `${ac}30` }]}
                />
              </View>
            ) : item.description ? (
              <Pressable onPress={() => { setDescDraft(item.description || ''); setEditingDesc(true); }}>
                <Text style={styles.descText}>{item.description}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => { setDescDraft(''); setEditingDesc(true); }} style={styles.addDescBtn}>
                <Feather name="file-text" size={13} color={T.t3} />
                <Text style={styles.addDescText}>Add description...</Text>
              </Pressable>
            )}
          </View>

          {totalCount > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={[styles.progressValue, { color: ac }]}>{doneCount}/{totalCount} tasks · {pct}%</Text>
              </View>
              <ProgressBar progress={pct / 100} color={ac} height={6} />
            </View>
          )}
        </View>

        {aiBanner && (
          <View style={[styles.aiBanner, { backgroundColor: aiBanner === 'success' ? `${T.green}10` : `${T.red}08`, borderColor: aiBanner === 'success' ? `${T.green}30` : `${T.red}30` }]}>
            <Feather name={aiBanner === 'success' ? 'check-circle' : 'alert-circle'} size={16} color={aiBanner === 'success' ? T.green : T.red} />
            <Text style={[styles.aiBannerText, { color: aiBanner === 'success' ? T.green : T.red }]}>
              {aiBanner === 'success' ? 'Tasks added! Review below.' : "Couldn't reach AI - try again."}
            </Text>
          </View>
        )}

        <View style={styles.tasksHeader}>
          <View style={styles.tasksHeaderLeft}>
            <Text style={styles.tasksTitle}>Tasks</Text>
            {totalCount > 0 && <Text style={styles.tasksCount}>{doneCount}/{totalCount}</Text>}
          </View>
          <View style={styles.tasksHeaderRight}>
            <Pressable
              style={[styles.aiBtn, { borderColor: `${T.brand}25`, backgroundColor: `${T.brand}08` }]}
              onPress={handleMoreTasksPress}
              disabled={aiTasksLoading || !!expandingPhase}
            >
              {(aiTasksLoading || !!expandingPhase) ? (
                <ActivityIndicator size="small" color={T.brand} />
              ) : (
                <Feather name="zap" size={12} color={T.brand} />
              )}
              <Text style={styles.aiBtnText}>
                {(aiTasksLoading || !!expandingPhase) ? 'Generating...' : steps.length > 0 ? 'More tasks' : 'Generate tasks'}
              </Text>
            </Pressable>
            {kind === 'project' && item.status !== 'paused' && doneCount === totalCount && totalCount > 0 && (
              <Pressable style={styles.completeBtn} onPress={() => { completeItem(item.id); onBack(); }}>
                <Feather name="check" size={13} color="#fff" />
                <Text style={styles.completeBtnText}>Complete</Text>
              </Pressable>
            )}
          </View>
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
            {sortedSteps.map(step => {
              const subCount = (step.subtasks || []).length;
              return (
                <Pressable
                  key={step.id}
                  style={styles.phaseStepRow}
                  onPress={() => handleExpandPhase(step.id)}
                >
                  <View style={[styles.phaseOptionIcon, { backgroundColor: ac + '12' }]}>
                    <Feather name="git-branch" size={14} color={ac} />
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

        {showClarify && clarifyQuestions.length > 0 && (
          <View style={styles.clarifySection}>
            <View style={styles.clarifyHeader}>
              <Feather name="help-circle" size={13} color={T.brand} />
              <Text style={styles.clarifyTitle}>A few questions first</Text>
            </View>
            <Text style={styles.clarifySubtext}>This looks like a complex project. Answering these helps M3NTOR create a better breakdown.</Text>
            {clarifyQuestions.map((q, idx) => (
              <View key={idx} style={styles.clarifyQRow}>
                <Text style={styles.clarifyQ}>{q}</Text>
                <TextInput
                  style={styles.clarifyInput}
                  placeholder="Your answer..."
                  placeholderTextColor={T.t3}
                  value={clarifyAnswers[idx] || ''}
                  onChangeText={(v) => setClarifyAnswers(prev => ({ ...prev, [idx]: v }))}
                  returnKeyType="done"
                />
              </View>
            ))}
            <View style={styles.clarifyActions}>
              <Pressable style={styles.clarifyGenBtn} onPress={handleClarifyGenerate}>
                <Feather name="zap" size={13} color="white" />
                <Text style={styles.clarifyGenText}>Generate breakdown</Text>
              </Pressable>
              <Pressable style={styles.clarifySkipBtn} onPress={() => { setShowClarify(false); handleAiTasks(undefined, true); }}>
                <Text style={styles.clarifySkipText}>Skip</Text>
              </Pressable>
            </View>
          </View>
        )}

        {sortedSteps.map((step, idx) => (
          <StepCard
            key={step.id}
            step={step}
            index={idx}
            itemId={item.id}
            accentColor={ac}
            allSteps={sortedSteps}
            isExpanded={expandedStep === step.id}
            onToggleExpand={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
            onCycleStatus={() => cycleStatus(step)}
            onCyclePriority={() => cyclePriority(step)}
            onCycleEffort={() => cycleEffort(step)}
            onToggleToday={() => updateStep(item.id, step.id, { today: !step.today })}
            onToggleStep={(done) => toggleStep(item.id, step.id, done)}
            onDeleteStep={() => confirmDelete('step', { stepId: step.id })}
            onMoveUp={() => { reorderStep(item.id, step.id, 'up'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            onMoveDown={() => { reorderStep(item.id, step.id, 'down'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            isFirst={idx === 0}
            isLast={idx === sortedSteps.length - 1}
            onToggleSubtask={(subId) => toggleSubtask(item.id, step.id, subId)}
            onDeleteSubtask={(subId) => confirmDelete('subtask', { stepId: step.id, subtaskId: subId })}
            onReorderSubtask={(subId, dir) => { reorderSubtask(item.id, step.id, subId, dir); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            addingSubFor={addingSubFor}
            onStartAddSub={() => { setAddingSubFor(step.id); setNewSubText(''); }}
            newSubText={newSubText}
            onChangeSubText={setNewSubText}
            onSubmitSub={() => doAddSubtask(step.id)}
            onCancelAddSub={() => setAddingSubFor(null)}
            subInputRef={subInputRef}
            aiSubLoading={aiSubLoading}
            onAiSubtasks={() => handleAiSubtasks(step.id)}
          />
        ))}

        {steps.length === 0 && (
          <View style={styles.emptyTasks}>
            <Feather name="inbox" size={28} color={T.t3} />
            <Text style={styles.emptyTasksText}>No tasks yet</Text>
            <Text style={styles.emptyTasksHint}>Add tasks below or use AI to generate them</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.addTaskBar, shadow.sm as ViewStyle]}>
        <View style={[styles.addTaskRow, newTaskText.trim() ? { borderColor: ac } : {}]}>
          <View style={[styles.addIcon, { backgroundColor: newTaskText.trim() ? ac : 'rgba(0,0,0,0.05)' }]}>
            <Feather name="plus" size={14} color={newTaskText.trim() ? '#fff' : T.t3} />
          </View>
          <TextInput
            ref={taskInputRef}
            value={newTaskText}
            onChangeText={setNewTaskText}
            onSubmitEditing={doAddTask}
            placeholder="Add a task..."
            placeholderTextColor={T.t3}
            style={styles.addTaskInput}
            returnKeyType="done"
          />
          {newTaskText.trim() ? (
            <Pressable style={[styles.addTaskBtn, { backgroundColor: ac }]} onPress={doAddTask}>
              <Text style={styles.addTaskBtnText}>Add</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

interface StepCardProps {
  step: Step;
  index: number;
  itemId: string;
  accentColor: string;
  allSteps: Step[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCycleStatus: () => void;
  onCyclePriority: () => void;
  onCycleEffort: () => void;
  onToggleToday: () => void;
  onToggleStep: (done: boolean) => void;
  onDeleteStep: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  onToggleSubtask: (subId: string) => void;
  onDeleteSubtask: (subId: string) => void;
  onReorderSubtask: (subId: string, direction: 'up' | 'down') => void;
  addingSubFor: string | null;
  onStartAddSub: () => void;
  newSubText: string;
  onChangeSubText: (t: string) => void;
  onSubmitSub: () => void;
  onCancelAddSub: () => void;
  subInputRef: React.RefObject<TextInput | null>;
  aiSubLoading: string | null;
  onAiSubtasks: () => void;
}

function StepCard({
  step, index, itemId, accentColor: ac, allSteps, isExpanded,
  onToggleExpand, onCycleStatus, onCyclePriority, onCycleEffort, onToggleToday,
  onToggleStep, onDeleteStep, onMoveUp, onMoveDown, isFirst, isLast,
  onToggleSubtask, onDeleteSubtask, onReorderSubtask,
  addingSubFor, onStartAddSub, newSubText, onChangeSubText, onSubmitSub,
  onCancelAddSub, subInputRef, aiSubLoading, onAiSubtasks,
}: StepCardProps) {
  const ss = STEP_STATUS[step.status || 'todo'];
  const pr = PRIORITY[(step.priority || 'normal') as keyof typeof PRIORITY];
  const ef = EFFORT[(step.effort || 'medium') as keyof typeof EFFORT];
  const subs = [...(step.subtasks || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const subDone = subs.filter(st => st.done).length;
  const subTotal = subs.length;
  const isBlocked = step.status === 'blocked';

  return (
    <View style={[
      styles.stepCard,
      isExpanded && styles.stepCardExpanded,
      isBlocked && styles.stepCardBlocked,
    ]}>
      <View style={styles.stepMainRow}>
        <View style={[styles.stepReorderCol, { backgroundColor: `${ac}08`, borderRightWidth: 1, borderRightColor: `${ac}12` }]}>
          <Pressable
            onPress={onMoveUp}
            hitSlop={4}
            style={[styles.stepReorderBtn, isFirst && { opacity: 0.2 }]}
            disabled={isFirst}
            testID={`step-up-${index}`}
          >
            <Feather name="chevron-up" size={14} color={ac} />
          </Pressable>
          <Pressable
            onPress={onMoveDown}
            hitSlop={4}
            style={[styles.stepReorderBtn, isLast && { opacity: 0.2 }]}
            disabled={isLast}
            testID={`step-down-${index}`}
          >
            <Feather name="chevron-down" size={14} color={ac} />
          </Pressable>
        </View>

        <Pressable style={styles.stepMainRowContent} onPress={onToggleExpand}>
          <Pressable
            onPress={onCycleStatus}
            hitSlop={6}
            style={[
              styles.statusDot,
              step.done
                ? { backgroundColor: T.green, borderColor: T.green }
                : step.status === 'doing'
                ? { backgroundColor: `${T.brand}15`, borderColor: `${T.brand}50` }
                : step.status === 'blocked'
                ? { backgroundColor: '#FFF5F5', borderColor: '#E53E3E50' }
                : { borderColor: `${ss.dot}50` },
            ]}
          >
            {step.done ? (
              <Feather name="check" size={13} color="#fff" />
            ) : step.status === 'blocked' ? (
              <Feather name="alert-triangle" size={11} color="#E53E3E" />
            ) : step.status === 'doing' ? (
              <View style={[styles.doingDot, { backgroundColor: T.brand }]} />
            ) : (
              <Text style={[styles.stepIndex, { color: `${ac}70` }]}>{index + 1}</Text>
            )}
          </Pressable>

          <View style={styles.stepContent}>
            <Text
              style={[
                styles.stepTitle,
                step.done && styles.stepTitleDone,
                isBlocked && { color: '#E53E3E' },
              ]}
              numberOfLines={2}
            >
              {step.title}
            </Text>
            <View style={styles.stepBadges}>
              <View style={[styles.microBadge, { backgroundColor: `${ss.dot}15` }]}>
                <Text style={[styles.microBadgeText, { color: ss.color }]}>{ss.label}</Text>
              </View>
              {step.priority && step.priority !== 'normal' && (
                <View style={[styles.microBadge, { backgroundColor: `${pr.color}10` }]}>
                  <Text style={[styles.microBadgeText, { color: pr.color }]}>{pr.label}</Text>
                </View>
              )}
              {step.effort && (
                <View style={[styles.microBadge, { backgroundColor: `${ef.color}10` }]}>
                  <Text style={[styles.microBadgeText, { color: ef.color }]}>{ef.label} · {ef.sub}</Text>
                </View>
              )}
              {subTotal > 0 && (
                <Text style={styles.subCount}>{subDone}/{subTotal} sub</Text>
              )}
            </View>
          </View>

          <Feather name={isExpanded ? 'chevron-down' : 'chevron-right'} size={14} color={T.t3} style={{ opacity: 0.5 }} />
        </Pressable>
      </View>

      {isExpanded && (
        <View style={styles.expandedPanel}>
          <View style={styles.chipRow}>
            <Pressable style={[styles.chip, { borderColor: `${ss.dot}40`, backgroundColor: `${ss.dot}10` }]} onPress={onCycleStatus}>
              <View style={[styles.chipDot, { backgroundColor: ss.dot }]} />
              <Text style={[styles.chipText, { color: ss.color }]}>{ss.label}</Text>
            </Pressable>
            <Pressable style={[styles.chip, { borderColor: `${pr.color}25`, backgroundColor: `${pr.color}08` }]} onPress={onCyclePriority}>
              <Text style={[styles.chipText, { color: pr.color }]}>{pr.label}</Text>
            </Pressable>
            <Pressable style={[styles.chip, { borderColor: `${ef.color}25`, backgroundColor: `${ef.color}08` }]} onPress={onCycleEffort}>
              <Text style={[styles.chipText, { color: ef.color }]}>{ef.label} · {ef.sub}</Text>
            </Pressable>
            <Pressable style={[styles.chip, { backgroundColor: step.today ? `${T.brand}10` : T.fill }]} onPress={onToggleToday}>
              <Text style={[styles.chipText, { color: step.today ? T.brand : T.t3, fontWeight: step.today ? '700' as const : '500' as const }]}>
                {step.today ? 'Today' : '+ Today'}
              </Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 2, marginLeft: 'auto' }}>
              <Pressable style={[styles.chip, { borderColor: `${T.red}20`, backgroundColor: `${T.red}06` }]} onPress={onDeleteStep}>
                <Feather name="trash-2" size={11} color={T.red} />
              </Pressable>
            </View>
          </View>

          {subTotal > 0 && (
            <View style={[styles.subtaskList, { borderLeftColor: `${ac}20` }]}>
              {subs.map((st, si) => (
                <View key={st.id} style={styles.subtaskRow}>
                  <View style={styles.subReorderCol}>
                    <Pressable
                      onPress={() => onReorderSubtask(st.id, 'up')}
                      hitSlop={3}
                      style={[styles.subReorderBtn, si === 0 && { opacity: 0.2 }]}
                      disabled={si === 0}
                    >
                      <Feather name="chevron-up" size={11} color={ac} />
                    </Pressable>
                    <Pressable
                      onPress={() => onReorderSubtask(st.id, 'down')}
                      hitSlop={3}
                      style={[styles.subReorderBtn, si === subs.length - 1 && { opacity: 0.2 }]}
                      disabled={si === subs.length - 1}
                    >
                      <Feather name="chevron-down" size={11} color={ac} />
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => onToggleSubtask(st.id)}
                    hitSlop={6}
                    style={[
                      styles.subCheckbox,
                      st.done && { backgroundColor: T.green, borderColor: T.green },
                    ]}
                  >
                    {st.done && <Feather name="check" size={9} color="#fff" />}
                  </Pressable>
                  <Text style={[styles.subTitle, st.done && styles.subTitleDone]}>{st.title}</Text>
                  <Pressable onPress={() => onDeleteSubtask(st.id)} hitSlop={6} style={styles.subDelete}>
                    <Feather name="x" size={12} color={T.red} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={styles.subActions}>
            {addingSubFor === step.id ? (
              <View style={styles.addSubRow}>
                <TextInput
                  ref={subInputRef}
                  autoFocus
                  value={newSubText}
                  onChangeText={onChangeSubText}
                  onSubmitEditing={onSubmitSub}
                  placeholder="Subtask name..."
                  placeholderTextColor={T.t3}
                  style={[styles.subInput, { borderColor: `${ac}40` }]}
                  returnKeyType="done"
                />
                <Pressable
                  style={[styles.subAddBtn, { backgroundColor: newSubText.trim() ? ac : T.fill }]}
                  onPress={onSubmitSub}
                >
                  <Text style={[styles.subAddBtnText, { color: newSubText.trim() ? '#fff' : T.t3 }]}>Add</Text>
                </Pressable>
                <Pressable onPress={onCancelAddSub} hitSlop={6}>
                  <Feather name="x" size={16} color={T.t3} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.subActionBtns}>
                <Pressable style={[styles.subActionBtn, { borderColor: `${ac}30` }]} onPress={onStartAddSub}>
                  <Feather name="plus" size={11} color={ac} />
                  <Text style={[styles.subActionText, { color: ac }]}>Add</Text>
                </Pressable>
                <Pressable
                  style={[styles.subActionBtn, { borderColor: `${T.brand}25`, backgroundColor: `${T.brand}06` }]}
                  onPress={onAiSubtasks}
                  disabled={aiSubLoading === step.id}
                >
                  {aiSubLoading === step.id ? (
                    <ActivityIndicator size="small" color={T.brand} />
                  ) : (
                    <Feather name="zap" size={11} color={T.brand} />
                  )}
                  <Text style={[styles.subActionText, { color: T.brand }]}>
                    {aiSubLoading === step.id ? 'Thinking...' : 'AI break down'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create<Record<string, any>>({
  flex: { flex: 1, backgroundColor: T.bg },
  scrollContent: { paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: F.md, color: T.t3 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: S.md, paddingTop: S.md, paddingBottom: S.sm },
  backText: { fontSize: F.sm, fontWeight: '600' as const },

  heroCard: {
    marginHorizontal: S.md,
    backgroundColor: T.glassHeavy,
    borderRadius: R.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  heroRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  heroIcon: { width: 48, height: 48, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  heroContent: { flex: 1 },
  heroTitle: { fontSize: 17, fontWeight: '700' as const, color: T.text, letterSpacing: -0.3 },
  titleInput: { fontSize: 17, fontWeight: '700' as const, color: T.text, borderBottomWidth: 2, paddingBottom: 2 },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' as const },

  heroActions: { flexDirection: 'row', gap: 6, marginTop: 14, justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5 },
  actionBtnText: { fontSize: 12, fontWeight: '650' as const },

  descSection: { marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.sep },
  descInput: { fontSize: 13, color: T.text, borderWidth: 1.5, borderRadius: 10, padding: 10, minHeight: 60, textAlignVertical: 'top' as const },
  descText: { fontSize: 13, color: T.t2, lineHeight: 20 },
  addDescBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addDescText: { fontSize: 12, color: T.t3 },

  progressSection: { marginTop: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressLabel: { fontSize: 11, color: T.t3, fontWeight: '500' as const },
  progressValue: { fontSize: 11, fontWeight: '700' as const },

  aiBanner: { marginHorizontal: S.md, marginTop: S.md, padding: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiBannerText: { fontSize: 13, fontWeight: '600' as const },

  tasksHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.md, marginTop: 20, marginBottom: 12 },
  tasksHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tasksTitle: { fontSize: 13, fontWeight: '700' as const, color: T.text },
  tasksCount: { fontSize: 13, fontWeight: '400' as const, color: T.t3 },
  tasksHeaderRight: { flexDirection: 'row', gap: 6 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  aiBtnText: { fontSize: 11, fontWeight: '700' as const, color: T.brand },
  completeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: T.green },
  completeBtnText: { fontSize: 11, fontWeight: '700' as const, color: '#fff' },

  stepCard: {
    marginHorizontal: S.md,
    marginBottom: 8,
    backgroundColor: T.glassHeavy,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  stepCardExpanded: { borderColor: T.brand + '26' },
  stepCardBlocked: { borderColor: 'rgba(229,62,62,0.15)', opacity: 0.85 },
  stepReorderCol: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0, paddingLeft: 8, paddingVertical: 4 },
  stepReorderBtn: { width: 28, height: 22, alignItems: 'center', justifyContent: 'center' },
  stepMainRow: { flexDirection: 'row', alignItems: 'center' },
  stepMainRowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingLeft: 8 },
  statusDot: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  doingDot: { width: 8, height: 8, borderRadius: 4 },
  stepIndex: { fontSize: 9, fontWeight: '700' as const },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '600' as const, color: T.text, letterSpacing: -0.1 },
  stepTitleDone: { textDecorationLine: 'line-through', color: T.t3, fontWeight: '400' as const },
  stepBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  microBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  microBadgeText: { fontSize: 10, fontWeight: '600' as const },
  subCount: { fontSize: 10, color: T.t3 },

  expandedPanel: { paddingHorizontal: 14, paddingBottom: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12, paddingLeft: 34 },
  chip: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 11, fontWeight: '600' as const },

  subtaskList: { marginLeft: 34, borderLeftWidth: 2, paddingLeft: 8, marginBottom: 10 },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5 },
  subReorderCol: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 20 },
  subReorderBtn: { width: 20, height: 14, alignItems: 'center', justifyContent: 'center' },
  subCheckbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: T.sep, alignItems: 'center', justifyContent: 'center' },
  subTitle: { flex: 1, fontSize: 13, color: T.text },
  subTitleDone: { textDecorationLine: 'line-through', color: T.t3 },
  subDelete: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center', opacity: 0.4 },

  subActions: { marginLeft: 34 },
  addSubRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  subInput: { flex: 1, fontSize: 13, padding: 8, borderRadius: 10, borderWidth: 1.5, color: T.text, backgroundColor: '#fff' },
  subAddBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  subAddBtnText: { fontSize: 12, fontWeight: '700' as const },
  subActionBtns: { flexDirection: 'row', gap: 6 },
  subActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  subActionText: { fontSize: 11, fontWeight: '600' as const },

  emptyTasks: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  emptyTasksText: { fontSize: F.md, fontWeight: '600' as const, color: T.t3 },
  emptyTasksHint: { fontSize: F.sm, color: T.t3 },

  addTaskBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: S.md,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  addTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  addIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addTaskInput: { flex: 1, fontSize: 14, color: T.text, fontWeight: '500' as const, minHeight: 36 },
  addTaskBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 12 },
  addTaskBtnText: { fontSize: 13, fontWeight: '700' as const, color: '#fff' },

  phasePickerSection: { backgroundColor: T.brand + '06', borderRadius: 14, padding: 14, marginBottom: 12, marginHorizontal: S.md, borderWidth: 1, borderColor: T.brand + '15' },
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

  clarifySection:   { backgroundColor: T.brand + '08', borderRadius: 14, padding: 14, marginBottom: 12, marginHorizontal: S.md, borderWidth: 1, borderColor: T.brand + '18' },
  clarifyHeader:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  clarifyTitle:     { fontSize: 14, fontWeight: '700' as const, color: T.brand },
  clarifySubtext:   { fontSize: 12, color: T.t3, marginBottom: 10, lineHeight: 17 },
  clarifyQRow:      { marginBottom: 10 },
  clarifyQ:         { fontSize: 13, fontWeight: '600' as const, color: T.text, marginBottom: 4 },
  clarifyInput:     { fontSize: 13, color: T.text, padding: 10, borderRadius: 10, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  clarifyActions:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  clarifyGenBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.brand, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  clarifyGenText:   { fontSize: 13, fontWeight: '700' as const, color: 'white' },
  clarifySkipBtn:   { paddingHorizontal: 12, paddingVertical: 9 },
  clarifySkipText:  { fontSize: 13, fontWeight: '600' as const, color: T.t3 },
});
