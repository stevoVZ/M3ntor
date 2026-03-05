import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Platform, Alert, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useStore } from '@/lib/store';
import { T, S, F, R, shadow } from '@/constants/theme';
import { ITEM_AREAS, KIND_CONFIG, PRG } from '@/constants/config';
import { itemKind, projectProgress } from '@/utils/items';
import { goalProgress, getUnlinkedItems, journeyProgress } from '@/utils/scores';
import { ProgressBar } from '@/components/items/ProgressBar';
import type { Item, JourneyProgress } from '@/types';

interface GoalDetailPageProps {
  goalId: string;
  onBack: () => void;
}

function LinkedItemRow({ item, areaColor, onPress }: { item: Item; areaColor: string; onPress: () => void }) {
  const kind = itemKind(item);
  const kc = KIND_CONFIG[kind];
  const area = ITEM_AREAS[item.area];
  const color = area?.c || kc.color || T.t3;
  const pct = kind === 'project' ? Math.round(projectProgress(item) * 100) : 0;
  const hasSteps = (item.steps?.length ?? 0) > 0;

  return (
    <Pressable style={styles.linkedItemRow} onPress={onPress}>
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
        </View>
      </View>
      <View style={styles.miniRing}>
        <View style={styles.miniRingInner}>
          <Text style={[styles.miniRingText, { color }]}>{pct}%</Text>
        </View>
        <ProgressBar progress={pct / 100} color={color} height={3} />
      </View>
      <Feather name="chevron-right" size={12} color={T.t3} style={{ opacity: 0.3 }} />
    </Pressable>
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
        <View style={styles.miniRingInner}>
          <Text style={[styles.miniRingText, { color }]}>{pct}%</Text>
        </View>
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
            <View style={[styles.progressRing, { borderColor: ac + '30' }]}>
              <Text style={styles.heroEmoji}>{goal.emoji}</Text>
              <View style={[styles.progressRingOverlay, { borderColor: ac }]}>
                <View style={[StyleSheet.absoluteFill, {
                  borderRadius: 32,
                  borderWidth: 4,
                  borderColor: ac,
                  borderTopColor: gpPct > 25 ? ac : 'transparent',
                  borderRightColor: gpPct > 50 ? ac : 'transparent',
                  borderBottomColor: gpPct > 75 ? ac : 'transparent',
                  borderLeftColor: gpPct > 0 ? ac : 'transparent',
                }]} />
              </View>
            </View>

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
          </View>

          <View style={{ marginTop: 14 }}>
            <ProgressBar progress={gp} color={ac} height={6} />
          </View>
        </View>

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
              {linkedItems.map(li => (
                <View key={li.id} style={styles.linkedWrapper}>
                  <LinkedItemRow
                    item={li}
                    areaColor={ac}
                    onPress={() => router.push(`/item/${li.id}`)}
                  />
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
            <Text style={styles.modalSub}>Tap an item to link it</Text>
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
  progressRing: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  progressRingOverlay: {
    position: 'absolute' as const, width: 64, height: 64, borderRadius: 32,
  },
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
  statBox: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' as const },
  statLabel: { fontSize: 10, color: T.t3, marginTop: 2 },

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
  linkedItemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, backgroundColor: 'white',
    elevation: 1,
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
  miniRingInner: { alignItems: 'center' },
  miniRingText: { fontSize: 9, fontWeight: '800' as const },

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
  modalSub: { fontSize: 13, color: T.t3, marginBottom: 16 },
  modalScroll: { maxHeight: 340 },
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
  confirmTitle: { fontSize: 15, fontWeight: '700' as const, color: T.text, marginBottom: 6 },
  confirmSub: { fontSize: 13, color: T.t3, marginBottom: 18, lineHeight: 18, textAlign: 'center' as const },
  confirmActions: { flexDirection: 'row', gap: 8, width: '100%' },
  confirmCancel: {
    flex: 1, padding: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: T.sep, alignItems: 'center',
  },
  confirmCancelText: { fontSize: 13, fontWeight: '650' as const, color: T.text },
  confirmDeleteBtn: {
    flex: 1, padding: 10, borderRadius: 10,
    backgroundColor: T.red, alignItems: 'center',
  },
  confirmDeleteText: { fontSize: 13, fontWeight: '650' as const, color: 'white' },
});
