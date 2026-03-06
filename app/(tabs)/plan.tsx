import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useStore } from '../../lib/store';
import { router } from 'expo-router';
import { T, S, F, R, shadow } from '../../constants/theme';
import { ITEM_AREAS, KIND_CONFIG, PRG } from '../../constants/config';
import { itemKind, projectProgress, formatRecurrence, formatDuration } from '../../utils/items';
import { goalProgress, linkedItemProgress, getUnlinkedItems } from '../../utils/scores';
import { formatDeadline, isOverdue } from '../../utils/dates';
import { ProgressBar } from '../../components/items/ProgressBar';
import { ItemEditSheet } from '../../components/plan/ItemEditSheet';
import GoalDetailPage from '../../components/plan/GoalDetailPage';
import { ProjectEditPage } from '../../components/plan/ProjectEditPage';
import type { Item } from '../../types';

type FilterId = 'all' | 'goals' | 'active' | 'paused';
type ViewMode = 'hierarchy' | 'list';
type ListSort = 'custom' | 'area' | 'kind' | 'progress';

function ActionMenuModal({ item, visible, onClose, onEdit, onDelete, onOpenProject }: {
  item: Item;
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenProject?: (id: string) => void;
}) {
  const kind = itemKind(item);
  const isPaused = item.status === 'paused';
  const pauseItem = useStore(s => s.pauseItem);
  const resumeItem = useStore(s => s.resumeItem);
  const completeItem = useStore(s => s.completeItem);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={menuStyles.overlay} onPress={onClose}>
        <View style={menuStyles.card}>
          <View style={menuStyles.handle} />

          {kind !== 'goal' && (
            <Pressable
              style={menuStyles.menuBtn}
              onPress={() => { onEdit(); onClose(); }}
            >
              <Feather name="edit-2" size={15} color={T.brand} />
              <Text style={[menuStyles.menuBtnText, { color: T.brand }]}>Edit</Text>
            </Pressable>
          )}

          {kind === 'goal' && (
            <Pressable
              style={menuStyles.menuBtn}
              onPress={() => { onEdit(); onClose(); }}
            >
              <Feather name="edit-2" size={15} color={T.brand} />
              <Text style={[menuStyles.menuBtnText, { color: T.brand }]}>Edit</Text>
            </Pressable>
          )}

          {kind === 'project' && onOpenProject && (
            <Pressable
              style={menuStyles.menuBtn}
              onPress={() => { onOpenProject(item.id); onClose(); }}
            >
              <Feather name="folder" size={15} color={T.t2} />
              <Text style={menuStyles.menuBtnText}>Open project</Text>
            </Pressable>
          )}

          <View style={menuStyles.divider} />

          {isPaused ? (
            <Pressable
              style={menuStyles.menuBtn}
              onPress={() => { resumeItem(item.id); onClose(); }}
            >
              <Feather name="play" size={15} color={T.green} />
              <Text style={[menuStyles.menuBtnText, { color: T.green }]}>Resume</Text>
            </Pressable>
          ) : (
            <Pressable
              style={menuStyles.menuBtn}
              onPress={() => { pauseItem(item.id); onClose(); }}
            >
              <Feather name="pause" size={15} color={T.orange} />
              <Text style={[menuStyles.menuBtnText, { color: T.orange }]}>Pause</Text>
            </Pressable>
          )}

          {(kind === 'project' || kind === 'action') && !isPaused && (
            <Pressable
              style={menuStyles.menuBtn}
              onPress={() => { completeItem(item.id); onClose(); }}
            >
              <Feather name="check" size={15} color={T.green} />
              <Text style={[menuStyles.menuBtnText, { color: T.green }]}>Mark done</Text>
            </Pressable>
          )}

          <View style={menuStyles.divider} />

          <Pressable
            style={menuStyles.menuBtn}
            onPress={() => { onDelete(); onClose(); }}
          >
            <Feather name="trash-2" size={15} color={T.red} />
            <Text style={[menuStyles.menuBtnText, { color: T.red }]}>Delete</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

function DeleteConfirmModal({ item, visible, onConfirm, onCancel }: {
  item: Item;
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={menuStyles.overlay} onPress={onCancel}>
        <View style={menuStyles.confirmCard}>
          <View style={menuStyles.confirmIconWrap}>
            <Feather name="alert-triangle" size={24} color={T.red} />
          </View>
          <Text style={menuStyles.confirmTitle}>Delete item?</Text>
          <Text style={menuStyles.confirmSub} numberOfLines={2}>
            "{item.title}" will be permanently removed. This can't be undone.
          </Text>
          <View style={menuStyles.confirmActions}>
            <Pressable style={menuStyles.cancelBtn} onPress={onCancel}>
              <Text style={menuStyles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={menuStyles.deleteBtn} onPress={onConfirm}>
              <Text style={menuStyles.deleteBtnText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

function GoalCard({ goal, items, journeyProgresses, onMenu, onOpenGoal, reorderable = false, isFirst = false, isLast = false, onMoveUp, onMoveDown }: {
  goal: Item;
  items: Item[];
  journeyProgresses: any[];
  onMenu: (item: Item) => void;
  onOpenGoal: (id: string) => void;
  reorderable?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const area = ITEM_AREAS[goal.area];
  const ac = area?.c || '#AF52DE';

  const gp = goalProgress(goal, items, journeyProgresses, PRG);
  const gpPct = Math.round(gp * 100);

  const linkedItemIds = goal.linked_items || [];
  const linkedItems = linkedItemIds
    .map(id => items.find(i => i.id === id))
    .filter(Boolean) as Item[];

  const deadlineStr = goal.deadline ? formatDeadline(goal.deadline) : null;
  const overdue = goal.deadline ? isOverdue(goal.deadline) : false;

  const ringSize = 42;
  const ringStroke = 3;
  const ringHalf = ringSize / 2;
  const clamp = Math.max(0, Math.min(100, gpPct));
  const rightDeg = clamp <= 50 ? (clamp / 50) * 180 - 180 : 0;
  const leftDeg = clamp <= 50 ? -180 : ((clamp - 50) / 50) * 180 - 180;

  return (
    <View style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'stretch' }}>
      {reorderable && (
        <View style={[styles.goalReorderCol, { backgroundColor: ac + '08', borderColor: ac + '15' }]}>
          <Pressable
            onPress={onMoveUp}
            hitSlop={4}
            style={[styles.goalReorderBtn, isFirst && { opacity: 0.2 }]}
            disabled={isFirst}
          >
            <Feather name="chevron-up" size={14} color={ac} />
          </Pressable>
          <Pressable
            onPress={onMoveDown}
            hitSlop={4}
            style={[styles.goalReorderBtn, isLast && { opacity: 0.2 }]}
            disabled={isLast}
          >
            <Feather name="chevron-down" size={14} color={ac} />
          </Pressable>
        </View>
      )}
      <View style={{ flex: 1 }}>
      <Pressable
        style={[styles.goalCard, shadow.sm, expanded && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }, reorderable && { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
        onPress={() => onOpenGoal(goal.id)}
        onLongPress={() => onMenu(goal)}
      >
        <Pressable
          style={styles.goalChevronArea}
          onPress={() => setExpanded(e => !e)}
        >
          <Feather
            name="chevron-down"
            size={14}
            color={ac}
            style={{ transform: [{ rotate: expanded ? '0deg' : '-90deg' }] }}
          />
        </Pressable>

        <View style={{ width: ringSize, height: ringSize, borderRadius: ringHalf, borderWidth: ringStroke, borderColor: ac + '20', alignItems: 'center', justifyContent: 'center' }}>
          <View style={[StyleSheet.absoluteFill, { borderRadius: ringHalf, overflow: 'hidden' }]}>
            <View style={{ position: 'absolute', top: 0, right: 0, width: ringHalf, height: ringSize, overflow: 'hidden' }}>
              <View style={{
                width: ringHalf, height: ringSize, borderTopRightRadius: ringHalf, borderBottomRightRadius: ringHalf,
                borderWidth: ringStroke, borderLeftWidth: 0, borderColor: ac,
                position: 'absolute', top: -ringStroke, right: -ringStroke,
                transform: [{ rotate: `${rightDeg}deg` }],
                transformOrigin: `${ringStroke}px ${ringHalf}px`,
              }} />
            </View>
            <View style={{ position: 'absolute', top: 0, left: 0, width: ringHalf, height: ringSize, overflow: 'hidden' }}>
              <View style={{
                width: ringHalf, height: ringSize, borderTopLeftRadius: ringHalf, borderBottomLeftRadius: ringHalf,
                borderWidth: ringStroke, borderRightWidth: 0, borderColor: ac,
                position: 'absolute', top: -ringStroke, left: -ringStroke,
                transform: [{ rotate: `${leftDeg}deg` }],
                transformOrigin: `${ringHalf - ringStroke}px ${ringHalf}px`,
              }} />
            </View>
          </View>
          <Text style={styles.goalEmoji}>{goal.emoji}</Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.goalTitle} numberOfLines={1}>{goal.title}</Text>
          <View style={styles.goalMeta}>
            {area && <Text style={styles.goalAreaText}>{area.e} {area.n.split(' ')[0]}</Text>}
            {linkedItems.length > 0
              ? <Text style={styles.goalLinkedText}> {linkedItems.length} linked  {gpPct}%</Text>
              : <Text style={[styles.goalLinkedText, { fontStyle: 'italic' as const }]}>Nothing linked yet</Text>
            }
            {deadlineStr && (
              <Text style={[styles.goalLinkedText, overdue && { color: T.red }]}> {deadlineStr}</Text>
            )}
          </View>
          <View style={{ marginTop: 6 }}>
            <ProgressBar progress={gp} color={ac} height={3} />
          </View>
        </View>

        <Pressable
          style={styles.goalAddBtn}
          onPress={() => router.push(`/create?linkToGoal=${goal.id}`)}
          hitSlop={6}
        >
          <Feather name="plus" size={14} color={ac} />
        </Pressable>

        <Pressable
          style={styles.goalMenuBtn}
          onPress={() => onMenu(goal)}
        >
          <Feather name="more-horizontal" size={14} color={T.t3} />
        </Pressable>
      </Pressable>

      {expanded && (
        <View style={[styles.goalLinkedContainer, { backgroundColor: ac + '06', borderColor: ac + '15' }]}>
          {linkedItems.length > 0 ? (
            linkedItems.map(li => {
              const liKind = itemKind(li);
              const liKc = KIND_CONFIG[liKind];
              const liArea = ITEM_AREAS[li.area];
              const liColor = liArea?.c || liKc.color || T.t3;
              const liPct = linkedItemProgress(li);
              return (
                <View key={li.id} style={styles.goalLinkedItem}>
                  <ItemRow item={li} indented onMenu={onMenu} />
                  <View style={styles.goalLinkedItemBar}>
                    <ProgressBar progress={liPct} color={liColor} height={2} />
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.goalLinkedEmpty}>
              <Text style={styles.goalLinkedEmptyText}>Nothing linked to this goal</Text>
              <Text style={styles.goalLinkedEmptySub}>Open the goal to add projects, habits or journeys</Text>
            </View>
          )}
        </View>
      )}
      </View>
    </View>
  );
}

function ItemRow({ item, indented = false, onMenu, reorderable = false, isFirst = false, isLast = false, onMoveUp, onMoveDown }: {
  item: Item;
  indented?: boolean;
  onMenu: (item: Item) => void;
  reorderable?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const kind = itemKind(item);
  const kc = KIND_CONFIG[kind];
  const area = ITEM_AREAS[item.area];
  const pct = kind === 'project' ? Math.round(projectProgress(item) * 100) : 0;
  const isPaused = item.status === 'paused';

  return (
    <Pressable
      style={[styles.itemRow, shadow.xs, indented && { marginLeft: 16 }, isPaused && { opacity: 0.65 }]}
      onPress={() => router.push(`/item/${item.id}`)}
      onLongPress={() => onMenu(item)}
    >
      {reorderable && (
        <Pressable
          style={styles.reorderCol}
          onPress={(e) => e.stopPropagation()}
        >
          <Pressable
            onPress={(e) => { e.stopPropagation(); onMoveUp?.(); }}
            hitSlop={6}
            style={[styles.reorderBtn, isFirst && { opacity: 0.2 }]}
            disabled={isFirst}
          >
            <Feather name="chevron-up" size={14} color={T.brand} />
          </Pressable>
          <Pressable
            onPress={(e) => { e.stopPropagation(); onMoveDown?.(); }}
            hitSlop={6}
            style={[styles.reorderBtn, isLast && { opacity: 0.2 }]}
            disabled={isLast}
          >
            <Feather name="chevron-down" size={14} color={T.brand} />
          </Pressable>
        </Pressable>
      )}

      <Text style={styles.itemEmoji}>{item.emoji}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.itemMetaRow}>
          <View style={[styles.kindBadge, { backgroundColor: kc.color + '12' }]}>
            <Text style={[styles.kindBadgeText, { color: kc.color }]}>{kc.label}</Text>
          </View>
          {area && <Text style={styles.itemAreaText}>{area.e} {area.n.split(' ')[0]}</Text>}
          {kind === 'project' && item.steps && (
            <Text style={styles.itemStepCount}>{item.steps.filter(s => s.done).length}/{item.steps.length}</Text>
          )}
          {kind === 'habit' && item.recurrence && (
            <Text style={styles.itemRecurrence}>{formatRecurrence(item)}</Text>
          )}
          {isPaused && <Text style={styles.pausedBadge}>Paused</Text>}
        </View>
      </View>

      {pct > 0 ? (
        <View style={styles.miniProgressBg}>
          <View style={[styles.miniProgressFill, {
            width: `${pct}%` as any,
            backgroundColor: area?.c || T.brand,
          }]} />
        </View>
      ) : (
        <View style={[styles.miniDot, { backgroundColor: area?.c || T.t3 }]} />
      )}

      <Pressable onPress={() => onMenu(item)} hitSlop={8}>
        <Feather name="more-vertical" size={14} color={T.t3} style={{ opacity: 0.5 }} />
      </Pressable>
    </Pressable>
  );
}

export default function PlanScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchy');
  const [filter, setFilter] = useState<FilterId>('all');
  const [listSort, setListSort] = useState<ListSort>('custom');

  const [editMode, setEditMode] = useState(false);

  const [menuItem, setMenuItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [openGoalId, setOpenGoalId] = useState<string | null>(null);
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);

  const items = useStore(s => s.items);
  const journeyProgresses = useStore(s => s.journeys);
  const updateItem = useStore(s => s.updateItem);
  const removeItem = useStore(s => s.removeItem);
  const reorderItem = useStore(s => s.reorderItem);

  const sortByOrder = useCallback((arr: Item[]) =>
    [...arr].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), []);

  const goals = useMemo(() => sortByOrder(items.filter(i => i.status === 'someday')), [items, sortByOrder]);
  const unlinked = useMemo(() => getUnlinkedItems(items), [items]);
  const activeUnlinked = useMemo(() => sortByOrder(unlinked.filter(i => i.status === 'active')), [unlinked, sortByOrder]);
  const pausedUnlinked = useMemo(() => sortByOrder(unlinked.filter(i => i.status === 'paused')), [unlinked, sortByOrder]);

  const filters: Array<{ id: FilterId; label: string; count?: number }> = [
    { id: 'all', label: 'All' },
    { id: 'goals', label: 'Goals', count: goals.length },
    { id: 'active', label: 'Active', count: activeUnlinked.length },
    { id: 'paused', label: 'Paused', count: pausedUnlinked.length },
  ];

  const allFlat = useMemo(() => {
    const arr: (Item & { _kind: string })[] = [];
    goals.forEach(g => arr.push({ ...g, _kind: 'goal' }));
    activeUnlinked.forEach(i => arr.push({ ...i, _kind: itemKind(i) }));
    pausedUnlinked.forEach(i => arr.push({ ...i, _kind: itemKind(i) }));
    return arr;
  }, [goals, activeUnlinked, pausedUnlinked]);

  const filteredList = useMemo(() => {
    let visible = allFlat.filter(i => {
      if (filter === 'goals') return i.status === 'someday';
      if (filter === 'active') return i.status === 'active';
      if (filter === 'paused') return i.status === 'paused';
      return true;
    });

    if (listSort === 'custom') {
      visible = [...visible].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    } else if (listSort === 'area') {
      visible = [...visible].sort((a, b) => (a.area || '').localeCompare(b.area || ''));
    } else if (listSort === 'kind') {
      visible = [...visible].sort((a, b) =>
        ((KIND_CONFIG as any)[a._kind]?.order ?? 9) - ((KIND_CONFIG as any)[b._kind]?.order ?? 9)
      );
    } else if (listSort === 'progress') {
      visible = [...visible].sort((a, b) => {
        const pa = a._kind === 'project' ? projectProgress(a) : 0;
        const pb = b._kind === 'project' ? projectProgress(b) : 0;
        return pb - pa;
      });
    }
    return visible;
  }, [allFlat, filter, listSort]);

  const handleOpenMenu = useCallback((item: Item) => {
    setMenuItem(item);
  }, []);

  const handleEdit = useCallback(() => {
    if (menuItem) {
      setEditingItem(menuItem);
    }
  }, [menuItem]);

  const handleRequestDelete = useCallback(() => {
    if (menuItem) {
      setDeletingItem(menuItem);
    }
  }, [menuItem]);

  const handleConfirmDelete = useCallback(() => {
    if (deletingItem) {
      removeItem(deletingItem.id);
      setDeletingItem(null);
    }
  }, [deletingItem, removeItem]);

  const handleSaveEdit = useCallback((patch: Partial<Item>) => {
    if (editingItem) {
      updateItem(editingItem.id, patch);
    }
  }, [editingItem, updateItem]);

  if (openProjectId) {
    return (
      <SafeAreaView style={[styles.safe, Platform.OS === 'web' && { paddingTop: 67 }]} edges={['top']}>
        <ProjectEditPage itemId={openProjectId} onBack={() => setOpenProjectId(null)} backLabel="Plan" />
      </SafeAreaView>
    );
  }

  if (openGoalId) {
    return (
      <SafeAreaView style={[styles.safe, Platform.OS === 'web' && { paddingTop: 67 }]} edges={['top']}>
        <GoalDetailPage goalId={openGoalId} onBack={() => setOpenGoalId(null)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, Platform.OS === 'web' && { paddingTop: 67 }]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>GOALS & PROJECTS</Text>
          <Text style={styles.heroTitle}>Plan.</Text>
          <View style={styles.heroStats}>
            <View style={[styles.heroBadge, { backgroundColor: T.green + '14' }]}>
              <Text style={[styles.heroBadgeText, { color: T.green }]}>
                {goals.length} goal{goals.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={[styles.heroBadge, { backgroundColor: T.brand + '14' }]}>
              <Text style={[styles.heroBadgeText, { color: T.brand }]}>
                {activeUnlinked.length} active
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPills}>
            {filters.map(f => {
              const on = filter === f.id;
              return (
                <Pressable key={f.id}
                  style={[styles.filterPill, on && styles.filterPillActive]}
                  onPress={() => setFilter(f.id)}>
                  <Text style={[styles.filterPillText, on && styles.filterPillTextActive]}>
                    {f.label}
                  </Text>
                  {f.count !== undefined && (
                    <View style={[styles.filterCount, on && styles.filterCountActive]}>
                      <Text style={[styles.filterCountText, on && { color: 'white' }]}>
                        {f.count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {viewMode === 'hierarchy' && (
            <Pressable
              style={[styles.editToggleBtn, editMode && styles.editToggleBtnActive]}
              onPress={() => setEditMode(e => !e)}
            >
              <Feather name="move" size={13} color={editMode ? '#fff' : T.t3} />
            </Pressable>
          )}

          <View style={styles.viewToggle}>
            <Pressable
              style={[styles.viewToggleBtn, viewMode === 'hierarchy' && styles.viewToggleBtnActive]}
              onPress={() => { setViewMode('hierarchy'); }}
            >
              <Feather name="git-merge" size={13}
                color={viewMode === 'hierarchy' ? T.brand : T.t3} />
            </Pressable>
            <Pressable
              style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
              onPress={() => { setViewMode('list'); setEditMode(false); }}
            >
              <Feather name="list" size={13}
                color={viewMode === 'list' ? T.brand : T.t3} />
            </Pressable>
          </View>
        </View>

        {viewMode === 'hierarchy' && (
          <View style={styles.section}>
            {(filter === 'all' || filter === 'goals') && goals.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                {filter !== 'goals' && (
                  <Text style={styles.sectionLabel}>GOALS</Text>
                )}
                {goals.map((goal, idx) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    items={items}
                    journeyProgresses={journeyProgresses}
                    onMenu={handleOpenMenu}
                    onOpenGoal={setOpenGoalId}
                    reorderable={editMode}
                    isFirst={idx === 0}
                    isLast={idx === goals.length - 1}
                    onMoveUp={() => reorderItem(goal.id, 'up', (i: Item) => i.status === 'someday')}
                    onMoveDown={() => reorderItem(goal.id, 'down', (i: Item) => i.status === 'someday')}
                  />
                ))}
              </View>
            )}

            {(filter === 'all' || filter === 'active') && activeUnlinked.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <View style={styles.sectionLabelRow}>
                  <Text style={styles.sectionLabel}>ACTIVE — NO GOAL YET</Text>
                  <View style={styles.sectionHint}>
                    <Text style={styles.sectionHintText}>Link these to a goal</Text>
                  </View>
                </View>
                {activeUnlinked.map((item, idx) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onMenu={handleOpenMenu}
                    reorderable={editMode}
                    isFirst={idx === 0}
                    isLast={idx === activeUnlinked.length - 1}
                    onMoveUp={() => reorderItem(item.id, 'up', (i: Item) => i.status === 'active' && !goals.some(g => g.linked_items?.includes(i.id)))}
                    onMoveDown={() => reorderItem(item.id, 'down', (i: Item) => i.status === 'active' && !goals.some(g => g.linked_items?.includes(i.id)))}
                  />
                ))}
              </View>
            )}

            {(filter === 'all' || filter === 'paused') && pausedUnlinked.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.sectionLabel}>ON HOLD</Text>
                {pausedUnlinked.map((item, idx) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onMenu={handleOpenMenu}
                    reorderable={editMode}
                    isFirst={idx === 0}
                    isLast={idx === pausedUnlinked.length - 1}
                    onMoveUp={() => reorderItem(item.id, 'up', (i: Item) => i.status === 'paused' && !goals.some(g => g.linked_items?.includes(i.id)))}
                    onMoveDown={() => reorderItem(item.id, 'down', (i: Item) => i.status === 'paused' && !goals.some(g => g.linked_items?.includes(i.id)))}
                  />
                ))}
              </View>
            )}

            {goals.length === 0 && activeUnlinked.length === 0 && pausedUnlinked.length === 0 && (
              <View style={styles.empty}>
                <Feather name="map" size={40} color={T.t3} style={{ marginBottom: S.md }} />
                <Text style={styles.emptyTitle}>Nothing planned yet</Text>
                <Text style={styles.emptySub}>Tap + to add a goal, project, habit or action</Text>
              </View>
            )}
          </View>
        )}

        {viewMode === 'list' && (
          <View style={styles.section}>
            <View style={styles.sortRow}>
              {([
                { id: 'custom' as ListSort, label: 'Custom', icon: 'menu' as const },
                { id: 'area' as ListSort, label: 'By area', icon: 'grid' as const },
                { id: 'kind' as ListSort, label: 'By type', icon: 'layers' as const },
                { id: 'progress' as ListSort, label: 'By progress', icon: 'bar-chart-2' as const },
              ]).map(s => (
                <Pressable key={s.id}
                  style={[styles.sortPill, listSort === s.id && styles.sortPillActive]}
                  onPress={() => setListSort(s.id)}>
                  <Text style={[styles.sortPillText, listSort === s.id && styles.sortPillTextActive]}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {(() => {
              if (filteredList.length === 0) {
                return (
                  <View style={styles.empty}>
                    <Text style={styles.emptySub}>Nothing here</Text>
                  </View>
                );
              }
              const scopeIds = new Set(filteredList.map(i => i.id));
              const scopeFilter = filter !== 'all'
                ? (i: Item) => scopeIds.has(i.id)
                : undefined;
              return filteredList.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onMenu={handleOpenMenu}
                  reorderable={listSort === 'custom'}
                  isFirst={idx === 0}
                  isLast={idx === filteredList.length - 1}
                  onMoveUp={() => reorderItem(item.id, 'up', scopeFilter)}
                  onMoveDown={() => reorderItem(item.id, 'down', scopeFilter)}
                />
              ));
            })()}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {menuItem && (
        <ActionMenuModal
          item={menuItem}
          visible={!!menuItem}
          onClose={() => setMenuItem(null)}
          onEdit={handleEdit}
          onDelete={handleRequestDelete}
          onOpenProject={(id) => { setMenuItem(null); setOpenProjectId(id); }}
        />
      )}

      {deletingItem && (
        <DeleteConfirmModal
          item={deletingItem}
          visible={!!deletingItem}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingItem(null)}
        />
      )}

      {editingItem && (
        <ItemEditSheet
          item={editingItem}
          onSave={handleSaveEdit}
          onClose={() => setEditingItem(null)}
        />
      )}
    </SafeAreaView>
  );
}

const menuStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end', alignItems: 'center',
  },
  card: {
    width: '92%', maxWidth: 360,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 20, padding: 6, marginBottom: 40,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 32 },
      android: { elevation: 24 },
      default: {},
    }),
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#DDD', alignSelf: 'center', marginTop: 6, marginBottom: 8,
  },
  menuBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
  },
  menuBtnText: {
    fontSize: 14, fontWeight: '550' as const, color: T.text,
  },
  divider: {
    height: 1, backgroundColor: T.sep, marginHorizontal: 12, marginVertical: 2,
  },
  confirmCard: {
    width: '85%', maxWidth: 320,
    backgroundColor: 'white', borderRadius: 20,
    padding: 24, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 32 },
      android: { elevation: 24 },
      default: {},
    }),
  },
  confirmIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: T.red + '10', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 18, fontWeight: '700' as const, color: T.text, marginBottom: 6,
  },
  confirmSub: {
    fontSize: 13, color: T.t2, textAlign: 'center', lineHeight: 19, marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row', gap: 10, width: '100%',
  },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: T.fill, alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14, fontWeight: '600' as const, color: T.t2,
  },
  deleteBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: T.red, alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 14, fontWeight: '700' as const, color: 'white',
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: S.md },

  hero: { paddingTop: S.xl, paddingBottom: S.md },
  heroEyebrow: { fontSize: F.xs, fontWeight: '600' as const, color: T.t3, letterSpacing: 1, marginBottom: 8 },
  heroTitle: { fontSize: 34, fontWeight: '800' as const, color: T.text, letterSpacing: -1 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  heroBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  heroBadgeText: { fontSize: 12, fontWeight: '600' as const },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: S.md, gap: 8 },
  filterPills: { gap: 5, flex: 1 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12,
    backgroundColor: T.glass,
  },
  filterPillActive: {
    backgroundColor: T.brand,
    ...Platform.select({
      ios: { shadowColor: T.brand, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  filterPillText: { fontSize: 12, fontWeight: '650' as const, color: T.t2 },
  filterPillTextActive: { color: 'white' },
  filterCount: {
    backgroundColor: T.t3 + '14', borderRadius: 5,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  filterCountText: { fontSize: 10, fontWeight: '700' as const, color: T.t3 },

  editToggleBtn: {
    width: 30, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.fill,
  },
  editToggleBtnActive: {
    backgroundColor: T.brand,
  },
  goalReorderCol: {
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    width: 32, borderWidth: 1, borderRightWidth: 0,
    borderTopLeftRadius: 16, borderBottomLeftRadius: 16,
  },
  goalReorderBtn: {
    width: 28, height: 22, alignItems: 'center', justifyContent: 'center',
  },
  viewToggle: {
    flexDirection: 'row', backgroundColor: T.fill, borderRadius: 10, padding: 2,
  },
  viewToggleBtn: {
    width: 30, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  viewToggleBtnActive: {
    backgroundColor: 'white',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
      android: { elevation: 1 },
      default: {},
    }),
  },

  section: { paddingTop: 0 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700' as const, color: T.t3,
    letterSpacing: 0.5, marginBottom: 10,
  },
  sectionLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
  },
  sectionHint: {
    backgroundColor: T.fill, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  sectionHintText: {
    fontSize: 10, fontWeight: '500' as const, color: T.t3,
  },

  goalCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: R.lg,
    overflow: 'hidden',
  },
  goalChevronArea: {
    width: 46, minHeight: 56, alignItems: 'center', justifyContent: 'center',
  },
  goalProgressRing: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  goalProgressFillRing: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 3,
  },
  goalEmoji: { fontSize: 16 },
  goalTitle: { fontSize: 14, fontWeight: '700' as const, color: T.text, letterSpacing: -0.2 },
  goalMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  goalAreaText: { fontSize: 11, color: T.t3 },
  goalLinkedText: { fontSize: 11, color: T.t3 },
  goalAddBtn: {
    width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  goalMenuBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },

  goalLinkedContainer: {
    borderWidth: 0.5, borderTopWidth: 0,
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    padding: 10, paddingBottom: 12,
  },
  goalLinkedItem: { position: 'relative' as const },
  goalLinkedItemBar: { paddingHorizontal: 14, paddingBottom: 4 },
  goalLinkedEmpty: { padding: 14, alignItems: 'center' },
  goalLinkedEmptyText: { fontSize: 13, color: T.t3, fontWeight: '500' as const, marginBottom: 4 },
  goalLinkedEmptySub: { fontSize: 11, color: T.t3 },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 11, paddingHorizontal: 14, borderRadius: 14,
    backgroundColor: 'white', marginBottom: 4,
  },
  itemEmoji: { fontSize: 18 },
  itemTitle: { fontSize: 13, fontWeight: '650' as const, color: T.text },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2, flexWrap: 'wrap' },
  kindBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  kindBadgeText: { fontSize: 10, fontWeight: '600' as const },
  itemAreaText: { fontSize: 10, color: T.t3 },
  itemStepCount: { fontSize: 10, color: T.t3 },
  itemRecurrence: { fontSize: 10, color: T.t3 },
  pausedBadge: { fontSize: 10, color: T.orange, fontWeight: '600' as const },

  reorderCol: {
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    marginRight: 2, marginLeft: -4, gap: 0,
  },
  reorderBtn: {
    width: 24, height: 18, alignItems: 'center', justifyContent: 'center',
  },

  miniProgressBg: {
    width: 34, height: 4, borderRadius: 2,
    backgroundColor: T.sep, overflow: 'hidden',
  },
  miniProgressFill: { height: '100%', borderRadius: 2 },
  miniDot: { width: 7, height: 7, borderRadius: 4, opacity: 0.4 },

  sortRow: { flexDirection: 'row', gap: 5, marginBottom: 14 },
  sortPill: {
    paddingHorizontal: 11, paddingVertical: 5, borderRadius: 8,
    backgroundColor: T.fill,
  },
  sortPillActive: { backgroundColor: T.text },
  sortPillText: { fontSize: 11, fontWeight: '650' as const, color: T.t3 },
  sortPillTextActive: { color: 'white' },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: F.lg, fontWeight: '700' as const, color: T.text, marginBottom: S.sm },
  emptySub: { fontSize: F.md, color: T.t2, lineHeight: 22 },
});
