import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Platform, Alert, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useStore } from '@/lib/store';
import { T, S, F, R, shadow } from '@/constants/theme';
import { ITEM_AREAS, KIND_CONFIG, PRG } from '@/constants/config';
import { itemKind } from '@/utils/items';
import { goalProgress, linkedItemProgress, getUnlinkedItems } from '@/utils/scores';
import { formatDeadline, isOverdue } from '@/utils/dates';
import { ProgressBar } from '@/components/items/ProgressBar';
import type { Item, JourneyProgress, Step } from '@/types';

interface GoalDetailPageProps {
  goalId: string;
  onBack: () => void;
}

const RING_SIZE = 64;
const RING_STROKE = 4;
const HALF = RING_SIZE / 2;

function ProgressRing({ percent, color, size = RING_SIZE, stroke = RING_STROKE, children }: {
  percent: number; color: string; size?: number; stroke?: number; children?: React.ReactNode;
}) {
  const half = size / 2;
  const clamp = Math.max(0, Math.min(100, percent));
  const rightDeg = clamp <= 50 ? (clamp / 50) * 180 - 180 : 0;
  const leftDeg = clamp <= 50 ? -180 : ((clamp - 50) / 50) * 180 - 180;

  return (
    <View style={{ width: size, height: size, borderRadius: half, borderWidth: stroke, borderColor: color + '20', alignItems: 'center', justifyContent: 'center' }}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: half, overflow: 'hidden' }]}>
        <View style={{ position: 'absolute', top: 0, right: 0, width: half, height: size, overflow: 'hidden' }}>
          <View style={{
            width: half, height: size, borderTopRightRadius: half, borderBottomRightRadius: half,
            borderWidth: stroke, borderLeftWidth: 0, borderColor: color,
            position: 'absolute', top: -stroke, right: -stroke, 
            transform: [{ rotate: `${rightDeg}deg` }],
            transformOrigin: `${stroke}px ${half}px`,
          }} />
        </View>
        <View style={{ position: 'absolute', top: 0, left: 0, width: half, height: size, overflow: 'hidden' }}>
          <View style={{
            width: half, height: size, borderTopLeftRadius: half, borderBottomLeftRadius: half,
            borderWidth: stroke, borderRightWidth: 0, borderColor: color,
            position: 'absolute', top: -stroke, left: -stroke,
            transform: [{ rotate: `${leftDeg}deg` }],
            transformOrigin: `${half - stroke}px ${half}px`,
          }} />
        </View>
      </View>
      {children}
    </View>
  );
}

function StepQuickRow({ step, itemId, accentColor }: { step: Step; itemId: string; accentColor: string }) {
  const toggleStep = useStore(s => s.toggleStep);
  const markStepToday = useStore(s => s.markStepToday);

  return (
    <View style={styles.stepQuickRow}>
      <Pressable
        style={[styles.stepCheckbox, step.done && { backgroundColor: T.green, borderColor: T.green }]}
        onPress={() => toggleStep(itemId, step.id, !step.done)}
        hitSlop={6}
      >
        {step.done && <Feather name="check" size={10} color="#fff" />}
      </Pressable>
      <Text style={[styles.stepQuickTitle, step.done && styles.stepQuickTitleDone]} numberOfLines={1}>{step.title}</Text>
      <Pressable
        style={[styles.stepTodayBtn, step.today && { backgroundColor: T.brand + '14' }]}
        onPress={() => markStepToday(itemId, step.id, !step.today)}
        hitSlop={6}
      >
        <Feather name="sun" size={12} color={step.today ? T.brand : T.t3} />
      </Pressable>
    </View>
  );
}

function LinkedItemRow({ item, areaColor, onPress, isExpanded, onToggleExpand }: {
  item: Item; areaColor: string; onPress: () => void; isExpanded?: boolean; onToggleExpand?: () => void;
}) {
  const kind = itemKind(item);
  const kc = KIND_CONFIG[kind];
  const area = ITEM_AREAS[item.area];
  const color = area?.c || kc.color || T.t3;
  const pct = Math.round(linkedItemProgress(item) * 100);
  const hasSteps = (item.steps?.length ?? 0) > 0;
  const isProject = kind === 'project';
  const incompleteSteps = isProject ? (item.steps || []).filter(s => !s.done && s.status !== 'blocked').slice(0, 3) : [];
  const allDone = isProject && hasSteps && (item.steps || []).every(s => s.done);

  return (
    <View>
      <Pressable style={styles.linkedItemRow} onPress={onPress}>
        {isProject && hasSteps && (
          <Pressable style={styles.expandChevron} onPress={onToggleExpand} hitSlop={8}>
            <Feather name={isExpanded ? 'chevron-down' : 'chevron-right'} size={12} color={color} />
          </Pressable>
        )}
        <View style={[styles.linkedItemIcon, { backgroundColor: color + '12', borderColor: color + '20' }]}>
          <Feather name={(kc.icon || 'folder') as any} size={18} color={color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.linkedItemTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.linkedItemMeta}>
            <View style={[styles.kindBadge, { backgroundColor: kc.color + '0D' }]}>
              <Text style={[styles.kindBadgeText, { color: kc.color }]}>{kc.label}</Text>
            </View>
            {hasSteps && (
              <Text style={styles.linkedItemSub}>
                {item.steps!.filter(s => s.done).length}/{item.steps!.length} tasks
              </Text>
            )}
            {kind === 'habit' && <Text style={styles.linkedItemSub}>Active</Text>}
          </View>
        </View>
        <View style={styles.miniRing}>
          <Text style={[styles.miniRingText, { color }]}>{pct}%</Text>
          <ProgressBar progress={pct / 100} color={color} height={3} />
        </View>
        <Feather name="chevron-right" size={12} color={T.t3} style={{ opacity: 0.3 }} />
      </Pressable>

      {isExpanded && isProject && (
        <View style={[styles.stepsExpandedPanel, { borderLeftColor: color + '30' }]}>
          {allDone ? (
            <View style={styles.allDoneRow}>
              <Feather name="check-circle" size={14} color={T.green} />
              <Text style={styles.allDoneText}>All tasks complete</Text>
            </View>
          ) : incompleteSteps.length > 0 ? (
            incompleteSteps.map(step => (
              <StepQuickRow key={step.id} step={step} itemId={item.id} accentColor={color} />
            ))
          ) : (
            <Text style={styles.noStepsText}>No pending tasks</Text>
          )}
        </View>
      )}
    </View>
  );
}

function LinkedJourneyRow({ jp, areaColor, onPress }: { jp: JourneyProgress; areaColor: string; onPress: () => void }) {
  const prog = PRG.find(p => p.id === jp.journey_id);
  if (!prog) return null;
  const progress = Math.min(1, jp.current_week / prog.w);
  const pct = Math.round(progress * 100);
  const area = ITEM_AREAS[prog.a];
  const color = area?.c || T.brand;

  return (
    <Pressable style={styles.linkedItemRow} onPress={onPress}>
      <View style={[styles.linkedItemIcon, { backgroundColor: color + '12', borderColor: color + '20' }]}>
        <Feather name="compass" size={18} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.linkedItemTitle} numberOfLines={1}>{prog.t}</Text>
        <View style={styles.linkedItemMeta}>
          <View style={[styles.kindBadge, { backgroundColor: T.brand + '0D' }]}>
            <Text style={[styles.kindBadgeText, { color: T.brand }]}>Journey</Text>
          </View>
          <Text style={styles.linkedItemSub}>Week {jp.current_week}/{prog.w}</Text>
        </View>
      </View>
      <View style={styles.miniRing}>
        <Text style={[styles.miniRingText, { color }]}>{pct}%</Text>
        <ProgressBar progress={progress} color={color} height={3} />
      </View>
      <Feather name="chevron-right" size={12} color={T.t3} style={{ opacity: 0.3 }} />
    </Pressable>
  );
}

function UnlinkedItemRow({ item, onLink }: { item: Item; onLink: () => void }) {
  const kind = itemKind(item);
  const kc = KIND_CONFIG[kind];
  const area = ITEM_AREAS[item.area];
  const color = area?.c || kc.color || T.t3;

  return (
    <Pressable style={styles.unlinkRow} onPress={onLink}>
      <View style={[styles.unlinkIcon, { backgroundColor: color + '0A' }]}>
        <Feather name={(kc.icon || 'folder') as any} size={14} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.unlinkTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.unlinkSub}>{kc.label} {area ? `\u00B7 ${area.n.split(' ')[0]}` : ''}</Text>
      </View>
      <Feather name="plus-circle" size={18} color={T.brand} />
    </Pressable>
  );
}

const PRIORITY_OPTIONS = [
  { id: 'urgent', label: 'Urgent', color: '#E53E3E' },
  { id: 'high', label: 'High', color: '#DD6B20' },
  { id: 'normal', label: 'Normal', color: T.t3 },
  { id: 'low', label: 'Low', color: '#718096' },
] as const;

const EFFORT_OPTIONS = [
  { id: 'quick', label: 'Quick', color: T.green },
  { id: 'medium', label: 'Medium', color: T.orange },
  { id: 'deep', label: 'Deep', color: T.brand },
] as const;

export default function GoalDetailPage({ goalId, onBack }: GoalDetailPageProps) {
  const items = useStore(s => s.items);
  const journeyProgresses = useStore(s => s.journeys);
  const updateItem = useStore(s => s.updateItem);
  const removeItem = useStore(s => s.removeItem);

  const goal = items.find(i => i.id === goalId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [showLinkSheet, setShowLinkSheet] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState('');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  if (!goal) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Goal not found</Text>
      </View>
    );
  }

  const area = ITEM_AREAS[goal.area];
  const ac = area?.c || '#AF52DE';
  const gp = goalProgress(goal, items, journeyProgresses, PRG);
  const gpPct = Math.round(gp * 100);

  const linkedItemIds = goal.linked_items || [];
  const linkedJourneyIds = goal.linked_journeys || [];
  const linkedItems = linkedItemIds
    .map(id => items.find(i => i.id === id))
    .filter(Boolean) as Item[];

  const handleReorderLinked = (itemId: string, direction: 'up' | 'down') => {
    const current = [...linkedItemIds];
    const idx = current.indexOf(itemId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= current.length) return;
    [current[idx], current[swapIdx]] = [current[swapIdx], current[idx]];
    updateItem(goal.id, { linked_items: current });
  };
  const linkedJourneyEntries = linkedJourneyIds
    .map(id => journeyProgresses.find(j => j.journey_id === id))
    .filter(Boolean) as JourneyProgress[];
  const totalLinked = linkedItems.length + linkedJourneyEntries.length;

  const unlinkableItems = useMemo(() => {
    const linkedSet = new Set(linkedItemIds);
    return items.filter(i =>
      i.id !== goalId &&
      i.status !== 'someday' &&
      i.status !== 'done' &&
      !linkedSet.has(i.id)
    );
  }, [items, linkedItemIds, goalId]);

  const deadlineFormatted = goal.deadline ? formatDeadline(goal.deadline) : null;
  const deadlineOverdue = goal.deadline ? isOverdue(goal.deadline) : false;
  const currentPriority = PRIORITY_OPTIONS.find(p => p.id === goal.priority) || PRIORITY_OPTIONS[2];
  const currentEffort = EFFORT_OPTIONS.find(e => e.id === goal.effort) || EFFORT_OPTIONS[1];

  const handleSaveTitle = () => {
    if (titleDraft.trim()) {
      updateItem(goal.id, { title: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  const handleSaveDesc = () => {
    updateItem(goal.id, { description: descDraft.trim() || undefined });
    setEditingDesc(false);
  };

  const handleSaveDeadline = () => {
    updateItem(goal.id, { deadline: deadlineDraft.trim() || undefined });
    setEditingDeadline(false);
  };

  const cyclePriority = () => {
    const idx = PRIORITY_OPTIONS.findIndex(p => p.id === goal.priority);
    const next = PRIORITY_OPTIONS[(idx + 1) % PRIORITY_OPTIONS.length];
    updateItem(goal.id, { priority: next.id as any });
  };

  const cycleEffort = () => {
    const idx = EFFORT_OPTIONS.findIndex(e => e.id === goal.effort);
    const next = EFFORT_OPTIONS[(idx + 1) % EFFORT_OPTIONS.length];
    updateItem(goal.id, { effort: next.id as any });
  };

  const handleLinkItem = (itemId: string) => {
    const current = goal.linked_items || [];
    if (!current.includes(itemId)) {
      updateItem(goal.id, { linked_items: [...current, itemId] });
    }
  };

  const handleUnlinkItem = (itemId: string) => {
    const current = goal.linked_items || [];
    updateItem(goal.id, { linked_items: current.filter(id => id !== itemId) });
  };

  const handleUnlinkJourney = (journeyId: string) => {
    const current = goal.linked_journeys || [];
    updateItem(goal.id, { linked_journeys: current.filter(id => id !== journeyId) });
  };

  const handleDelete = () => {
    removeItem(goal.id);
    onBack();
  };

  const confirmDeleteGoal = () => {
    if (Platform.OS === 'web') {
      setConfirmDelete(true);
    } else {
      Alert.alert(
        'Delete this goal?',
        'Linked projects won\'t be deleted.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: handleDelete },
        ]
      );
    }
  };

  const handleCreateNew = (type: string) => {
    setShowLinkSheet(false);
    router.push(`/create?linkToGoal=${goalId}&suggestType=${type}`);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, Platform.OS === 'web' && { paddingTop: 12 }]}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Feather name="chevron-left" size={20} color={T.brand} />
          <Text style={styles.backText}>Plan</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, shadow.md]}>
          <View style={styles.heroTop}>
            <ProgressRing percent={gpPct} color={ac}>
              <Text style={styles.heroEmoji}>{goal.emoji}</Text>
            </ProgressRing>

            <View style={{ flex: 1, minWidth: 0 }}>
              {editingTitle ? (
                <TextInput
                  style={styles.titleInput}
                  value={titleDraft}
                  onChangeText={setTitleDraft}
                  onBlur={handleSaveTitle}
                  onSubmitEditing={handleSaveTitle}
                  autoFocus
                  returnKeyType="done"
                />
              ) : (
                <Pressable onPress={() => { setTitleDraft(goal.title); setEditingTitle(true); }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.heroTitle} numberOfLines={2}>{goal.title}</Text>
                    <Feather name="edit-2" size={11} color={T.t3} style={{ marginLeft: 6, opacity: 0.5 }} />
                  </View>
                </Pressable>
              )}

              <View style={[styles.areaBadge, { backgroundColor: ac + '08', borderColor: ac + '15' }]}>
                <View style={[styles.areaDot, { backgroundColor: ac }]} />
                <Text style={[styles.areaText, { color: ac }]}>{area?.n || goal.area}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailChips}>
            <Pressable style={[styles.detailChip, { borderColor: currentPriority.color + '30', backgroundColor: currentPriority.color + '08' }]} onPress={cyclePriority}>
              <Feather name="flag" size={11} color={currentPriority.color} />
              <Text style={[styles.detailChipText, { color: currentPriority.color }]}>{currentPriority.label}</Text>
            </Pressable>
            <Pressable style={[styles.detailChip, { borderColor: currentEffort.color + '30', backgroundColor: currentEffort.color + '08' }]} onPress={cycleEffort}>
              <Feather name="zap" size={11} color={currentEffort.color} />
              <Text style={[styles.detailChipText, { color: currentEffort.color }]}>{currentEffort.label}</Text>
            </Pressable>
          </View>

          {editingDesc ? (
            <View style={{ marginTop: 14 }}>
              <TextInput
                style={[styles.descInput, { borderColor: ac + '30' }]}
                value={descDraft}
                onChangeText={setDescDraft}
                onBlur={handleSaveDesc}
                multiline
                placeholder="Add details — target, constraints, what success looks like..."
                placeholderTextColor={T.t3}
                autoFocus
              />
            </View>
          ) : goal.description ? (
            <Pressable onPress={() => { setDescDraft(goal.description || ''); setEditingDesc(true); }} style={{ marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.sep }}>
              <Text style={styles.descText}>{goal.description}</Text>
              <Feather name="edit-2" size={10} color={T.t3} style={{ position: 'absolute' as const, right: 0, top: 16, opacity: 0.3 }} />
            </Pressable>
          ) : (
            <Pressable onPress={() => { setDescDraft(''); setEditingDesc(true); }} style={{ marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.sep }}>
              <View style={styles.addDescRow}>
                <Feather name="file-text" size={13} color={T.t3} />
                <Text style={styles.addDescText}>Add description...</Text>
              </View>
            </Pressable>
          )}

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: ac + '06' }]}>
              <Text style={[styles.statValue, { color: ac }]}>{gpPct}%</Text>
              <Text style={styles.statLabel}>Progress</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: T.fill }]}>
              <Text style={[styles.statValue, { color: T.text }]}>{totalLinked}</Text>
              <Text style={styles.statLabel}>Linked</Text>
            </View>
            <Pressable
              style={[styles.statBox, { backgroundColor: deadlineOverdue ? T.red + '08' : T.fill }]}
              onPress={() => { setDeadlineDraft(goal.deadline || ''); setEditingDeadline(true); }}
            >
              {editingDeadline ? (
                <TextInput
                  style={styles.deadlineInput}
                  value={deadlineDraft}
                  onChangeText={setDeadlineDraft}
                  onBlur={handleSaveDeadline}
                  onSubmitEditing={handleSaveDeadline}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={T.t3}
                  autoFocus
                  returnKeyType="done"
                />
              ) : (
                <>
                  <Feather name="calendar" size={14} color={deadlineOverdue ? T.red : T.t3} />
                  <Text style={[styles.statValue, { color: deadlineOverdue ? T.red : T.text, fontSize: deadlineFormatted ? 12 : 11 }]}>
                    {deadlineFormatted || 'Set target'}
                  </Text>
                  {deadlineOverdue && <Text style={styles.overdueLabel}>Overdue</Text>}
                  {!deadlineFormatted && <Text style={styles.statLabel}>Target</Text>}
                </>
              )}
            </Pressable>
          </View>

          <View style={{ marginTop: 14 }}>
            <ProgressBar progress={gp} color={ac} height={6} />
          </View>
        </View>

        {totalLinked > 0 && (
          <View style={styles.breakdownContainer}>
            <Text style={styles.breakdownTitle}>Progress Breakdown</Text>
            {linkedItems.map(li => {
              const liKind = itemKind(li);
              const liKc = KIND_CONFIG[liKind];
              const liArea = ITEM_AREAS[li.area];
              const liColor = liArea?.c || liKc.color || T.t3;
              const liPct = Math.round(linkedItemProgress(li) * 100);
              const hasSteps = (li.steps?.length ?? 0) > 0;
              return (
                <View key={li.id} style={styles.breakdownRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.breakdownItemTitle} numberOfLines={1}>{li.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.kindBadgeSm, { backgroundColor: liKc.color + '0D' }]}>
                        <Text style={[styles.kindBadgeSmText, { color: liKc.color }]}>{liKc.label}</Text>
                      </View>
                      {hasSteps && (
                        <Text style={styles.breakdownSub}>{li.steps!.filter(s => s.done).length}/{li.steps!.length} tasks</Text>
                      )}
                      {liKind === 'habit' && <Text style={styles.breakdownSub}>Active</Text>}
                    </View>
                  </View>
                  <Text style={[styles.breakdownPct, { color: liColor }]}>{liPct}%</Text>
                  <View style={{ width: 50 }}>
                    <ProgressBar progress={liPct / 100} color={liColor} height={3} />
                  </View>
                </View>
              );
            })}
            {linkedJourneyEntries.map(jp => {
              const prog = PRG.find(p => p.id === jp.journey_id);
              if (!prog) return null;
              const progress = Math.min(1, jp.current_week / prog.w);
              const pct = Math.round(progress * 100);
              const jArea = ITEM_AREAS[prog.a];
              const jColor = jArea?.c || T.brand;
              return (
                <View key={jp.id} style={styles.breakdownRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.breakdownItemTitle} numberOfLines={1}>{prog.t}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.kindBadgeSm, { backgroundColor: T.brand + '0D' }]}>
                        <Text style={[styles.kindBadgeSmText, { color: T.brand }]}>Journey</Text>
                      </View>
                      <Text style={styles.breakdownSub}>Week {jp.current_week}/{prog.w}</Text>
                    </View>
                  </View>
                  <Text style={[styles.breakdownPct, { color: jColor }]}>{pct}%</Text>
                  <View style={{ width: 50 }}>
                    <ProgressBar progress={progress} color={jColor} height={3} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Linked Projects & Journeys</Text>
            <Pressable style={[styles.linkBtn, { backgroundColor: ac + '08' }]} onPress={() => setShowLinkSheet(true)}>
              <Feather name="plus" size={13} color={ac} />
              <Text style={[styles.linkBtnText, { color: ac }]}>Link</Text>
            </Pressable>
          </View>

          {linkedItems.length === 0 && linkedJourneyEntries.length === 0 ? (
            <Pressable style={[styles.emptyLinked, { borderColor: ac + '20', backgroundColor: ac + '03' }]} onPress={() => setShowLinkSheet(true)}>
              <Feather name="link" size={20} color={ac} style={{ opacity: 0.4, marginBottom: 8 }} />
              <Text style={styles.emptyLinkedText}>No items linked yet</Text>
              <Text style={styles.emptyLinkedSub}>Tap to link projects, habits or journeys</Text>
            </Pressable>
          ) : (
            <View style={{ gap: 6 }}>
              {linkedItems.map((li, idx) => (
                <View key={li.id} style={[styles.linkedWrapper, { flexDirection: 'row', alignItems: 'stretch' }]}>
                  <View style={[styles.linkedReorderCol, { backgroundColor: ac + '08', borderColor: ac + '15' }]}>
                    <Pressable
                      onPress={() => handleReorderLinked(li.id, 'up')}
                      hitSlop={4}
                      style={[styles.linkedReorderBtn, idx === 0 && { opacity: 0.2 }]}
                      disabled={idx === 0}
                    >
                      <Feather name="chevron-up" size={12} color={ac} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleReorderLinked(li.id, 'down')}
                      hitSlop={4}
                      style={[styles.linkedReorderBtn, idx === linkedItems.length - 1 && { opacity: 0.2 }]}
                      disabled={idx === linkedItems.length - 1}
                    >
                      <Feather name="chevron-down" size={12} color={ac} />
                    </Pressable>
                  </View>
                  <View style={{ flex: 1 }}>
                    <LinkedItemRow
                      item={li}
                      areaColor={ac}
                      onPress={() => router.push(`/item/${li.id}`)}
                      isExpanded={expandedProjectId === li.id}
                      onToggleExpand={() => setExpandedProjectId(expandedProjectId === li.id ? null : li.id)}
                    />
                  </View>
                  <Pressable style={styles.unlinkBtn} onPress={() => handleUnlinkItem(li.id)}>
                    <Feather name="x" size={12} color={T.t3} />
                  </Pressable>
                </View>
              ))}
              {linkedJourneyEntries.map(jp => (
                <View key={jp.id} style={styles.linkedWrapper}>
                  <LinkedJourneyRow
                    jp={jp}
                    areaColor={ac}
                    onPress={() => {}}
                  />
                  <Pressable style={styles.unlinkBtn} onPress={() => handleUnlinkJourney(jp.journey_id)}>
                    <Feather name="x" size={12} color={T.t3} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.deleteSection}>
          <Pressable style={styles.deleteBtn} onPress={confirmDeleteGoal}>
            <Feather name="trash-2" size={14} color={T.red} />
            <Text style={styles.deleteBtnText}>Delete Goal</Text>
          </Pressable>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      <Modal visible={showLinkSheet} transparent animationType="slide" onRequestClose={() => setShowLinkSheet(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowLinkSheet(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Link to this Goal</Text>
            <Text style={styles.modalSub}>Add existing items or create new ones</Text>

            <View style={styles.createNewRow}>
              <Pressable style={[styles.createNewBtn, { borderColor: T.brand + '25' }]} onPress={() => handleCreateNew('project')}>
                <Feather name="layers" size={16} color={T.brand} />
                <Text style={[styles.createNewBtnText, { color: T.brand }]}>New Project</Text>
              </Pressable>
              <Pressable style={[styles.createNewBtn, { borderColor: T.orange + '25' }]} onPress={() => handleCreateNew('habit')}>
                <Feather name="repeat" size={16} color={T.orange} />
                <Text style={[styles.createNewBtnText, { color: T.orange }]}>New Habit</Text>
              </Pressable>
              <Pressable style={[styles.createNewBtn, { borderColor: T.green + '25' }]} onPress={() => handleCreateNew('action')}>
                <Feather name="check" size={16} color={T.green} />
                <Text style={[styles.createNewBtnText, { color: T.green }]}>New Action</Text>
              </Pressable>
            </View>

            {unlinkableItems.length > 0 && (
              <Text style={styles.existingLabel}>Existing items</Text>
            )}
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {unlinkableItems.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <Feather name="check-circle" size={24} color={T.t3} style={{ marginBottom: 8 }} />
                  <Text style={styles.modalEmptyText}>All items are already linked</Text>
                </View>
              ) : (
                unlinkableItems.map(item => (
                  <UnlinkedItemRow
                    key={item.id}
                    item={item}
                    onLink={() => {
                      handleLinkItem(item.id);
                    }}
                  />
                ))
              )}
            </ScrollView>
            <Pressable style={styles.modalDoneBtn} onPress={() => setShowLinkSheet(false)}>
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {confirmDelete && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>Delete this goal?</Text>
              <Text style={styles.confirmSub}>Linked projects won't be deleted.</Text>
              <View style={styles.confirmActions}>
                <Pressable style={styles.confirmCancel} onPress={() => setConfirmDelete(false)}>
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.confirmDeleteBtn} onPress={handleDelete}>
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  notFoundText: { fontSize: F.md, color: T.t3 },

  header: { paddingHorizontal: S.md, paddingTop: 12, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  backText: { fontSize: 14, fontWeight: '600' as const, color: T.brand },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: S.md },

  heroCard: {
    backgroundColor: T.glassHeavy,
    borderRadius: 22,
    padding: 20,
    marginTop: 8,
    marginBottom: 20,
    elevation: 4,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroEmoji: { fontSize: 28 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  heroTitle: { fontSize: 19, fontWeight: '800' as const, color: T.text, letterSpacing: -0.3, flex: 1 },
  titleInput: {
    fontSize: 19, fontWeight: '800' as const, color: T.text,
    borderBottomWidth: 2, borderBottomColor: T.brand,
    paddingVertical: 2, paddingHorizontal: 0,
    letterSpacing: -0.3,
  },
  areaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start' as const,
    marginTop: 8, borderRadius: 8, borderWidth: 0.5,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  areaDot: { width: 7, height: 7, borderRadius: 4 },
  areaText: { fontSize: 11, fontWeight: '600' as const },

  detailChips: { flexDirection: 'row', gap: 6, marginTop: 12 },
  detailChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    borderWidth: 1,
  },
  detailChipText: { fontSize: 11, fontWeight: '600' as const },

  descText: { fontSize: 13, color: T.t2, lineHeight: 20 },
  descInput: {
    fontSize: 13, color: T.text, lineHeight: 20,
    borderWidth: 1.5, borderRadius: 10,
    padding: 10, minHeight: 70,
    textAlignVertical: 'top' as const,
  },
  addDescRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addDescText: { fontSize: 12, color: T.t3 },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  statBox: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 20, fontWeight: '800' as const },
  statLabel: { fontSize: 10, color: T.t3, marginTop: 2 },
  deadlineInput: { fontSize: 12, fontWeight: '600' as const, color: T.text, textAlign: 'center' as const, width: '100%' as any, padding: 0 },
  overdueLabel: { fontSize: 9, fontWeight: '700' as const, color: T.red, marginTop: 1 },

  breakdownContainer: { marginBottom: 20, backgroundColor: T.fill, borderRadius: 16, padding: 14 },
  breakdownTitle: { fontSize: 13, fontWeight: '700' as const, color: T.text, marginBottom: 10 },
  breakdownRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.sep,
  },
  breakdownItemTitle: { fontSize: 13, fontWeight: '600' as const, color: T.text },
  breakdownSub: { fontSize: 10, color: T.t3 },
  breakdownPct: { fontSize: 11, fontWeight: '700' as const, minWidth: 28, textAlign: 'right' as const },
  kindBadgeSm: { borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  kindBadgeSmText: { fontSize: 9, fontWeight: '600' as const },

  sectionContainer: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700' as const, color: T.text },
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4,
  },
  linkBtnText: { fontSize: 11, fontWeight: '650' as const },

  emptyLinked: {
    padding: 28, borderRadius: 16, borderWidth: 1.5,
    borderStyle: 'dashed' as const, alignItems: 'center',
  },
  emptyLinkedText: { fontSize: 13, color: T.t3, fontWeight: '500' as const },
  emptyLinkedSub: { fontSize: 11, color: T.t3, marginTop: 4 },

  linkedWrapper: { position: 'relative' as const },
  linkedReorderCol: {
    flexDirection: 'column' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    width: 28, borderWidth: 1, borderRightWidth: 0,
    borderTopLeftRadius: 14, borderBottomLeftRadius: 14,
  },
  linkedReorderBtn: {
    width: 24, height: 18, alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  linkedItemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, backgroundColor: 'white',
    elevation: 1,
  },
  expandChevron: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  linkedItemIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 0.5,
  },
  linkedItemTitle: { fontSize: 14, fontWeight: '650' as const, color: T.text },
  linkedItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  kindBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  kindBadgeText: { fontSize: 10, fontWeight: '600' as const },
  linkedItemSub: { fontSize: 10, color: T.t3 },
  miniRing: { width: 40, alignItems: 'center', gap: 3 },
  miniRingText: { fontSize: 9, fontWeight: '800' as const },

  stepsExpandedPanel: {
    marginLeft: 32, marginTop: 2, marginBottom: 6,
    paddingLeft: 12, borderLeftWidth: 2,
    paddingVertical: 6,
  },
  stepQuickRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 5,
  },
  stepCheckbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: T.sep,
    alignItems: 'center', justifyContent: 'center',
  },
  stepQuickTitle: { flex: 1, fontSize: 13, color: T.text },
  stepQuickTitleDone: { textDecorationLine: 'line-through' as const, color: T.t3 },
  stepTodayBtn: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  allDoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  allDoneText: { fontSize: 12, color: T.green, fontWeight: '600' as const },
  noStepsText: { fontSize: 12, color: T.t3, paddingVertical: 4 },

  unlinkBtn: {
    position: 'absolute' as const, top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: T.fill, alignItems: 'center', justifyContent: 'center',
  },

  unlinkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.sep,
  },
  unlinkIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  unlinkTitle: { fontSize: 14, fontWeight: '600' as const, color: T.text },
  unlinkSub: { fontSize: 11, color: T.t3, marginTop: 1 },

  deleteSection: { paddingVertical: 20 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 12, borderRadius: 12, borderWidth: 1.5,
    borderColor: T.red + '20', backgroundColor: 'transparent',
  },
  deleteBtnText: { fontSize: 13, fontWeight: '650' as const, color: T.red },

  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalSheet: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'web' ? 34 : 40,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: T.sep,
    alignSelf: 'center' as const, marginTop: 10, marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' as const, color: T.text, marginBottom: 4 },
  modalSub: { fontSize: 13, color: T.t3, marginBottom: 12 },

  createNewRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  createNewBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.015)',
  },
  createNewBtnText: { fontSize: 11, fontWeight: '700' as const },

  existingLabel: { fontSize: 11, fontWeight: '600' as const, color: T.t3, marginBottom: 8, letterSpacing: 0.3 },
  modalScroll: { maxHeight: 260 },
  modalEmpty: { alignItems: 'center', paddingVertical: 40 },
  modalEmptyText: { fontSize: 13, color: T.t3 },
  modalDoneBtn: {
    marginTop: 16, padding: 14, borderRadius: 14,
    backgroundColor: T.brand, alignItems: 'center',
  },
  modalDoneBtnText: { fontSize: 15, fontWeight: '700' as const, color: 'white' },

  confirmOverlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  confirmBox: {
    backgroundColor: 'white', borderRadius: 20,
    padding: 24, width: 280, alignItems: 'center',
    elevation: 20,
  },
  confirmTitle: { fontSize: 17, fontWeight: '700' as const, color: T.text, marginBottom: 6 },
  confirmSub: { fontSize: 13, color: T.t3, textAlign: 'center' as const, marginBottom: 20 },
  confirmActions: { flexDirection: 'row', gap: 10, width: '100%' as any },
  confirmCancel: {
    flex: 1, padding: 12, borderRadius: 12, alignItems: 'center',
    backgroundColor: T.fill,
  },
  confirmCancelText: { fontSize: 13, fontWeight: '650' as const, color: T.text },
  confirmDeleteBtn: {
    flex: 1, padding: 12, borderRadius: 12, alignItems: 'center',
    backgroundColor: T.red,
  },
  confirmDeleteText: { fontSize: 13, fontWeight: '650' as const, color: 'white' },
});
