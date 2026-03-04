import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../lib/store';
import { router } from 'expo-router';
import { T, S, F, R, shadow } from '../../constants/theme';
import { ITEM_AREAS, KIND_CONFIG, PRIORITY } from '../../constants/config';
import { itemKind, projectProgress, formatRecurrence, formatDuration } from '../../utils/items';
import { formatDeadline, isOverdue } from '../../utils/dates';
import type { Item } from '../../types';

type FilterKind = 'all' | 'action' | 'habit' | 'project' | 'goal';
type FilterStatus = 'active' | 'paused' | 'someday';

const KIND_FILTERS: Array<{ id: FilterKind; label: string }> = [
  { id: 'all',     label: 'All'      },
  { id: 'action',  label: 'Actions'  },
  { id: 'habit',   label: 'Habits'   },
  { id: 'project', label: 'Projects' },
  { id: 'goal',    label: 'Goals'    },
];

const STATUS_FILTERS: Array<{ id: FilterStatus; label: string }> = [
  { id: 'active',  label: 'Active'  },
  { id: 'paused',  label: 'Paused'  },
  { id: 'someday', label: 'Someday' },
];

function PlanCard({ item, onStatusChange }: {
  item: Item;
  onStatusChange: (id: string, status: Item['status']) => void;
}) {
  const kind       = itemKind(item);
  const kindConf   = KIND_CONFIG[kind];
  const area       = ITEM_AREAS[item.area];
  const priConf    = PRIORITY[item.priority];
  const progress   = kind === 'project' ? projectProgress(item) : null;
  const overdue    = isOverdue(item.deadline);
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable style={[styles.card, shadow.xs]} onLongPress={() => setExpanded(e => !e)} onPress={() => router.push(`/item/${item.id}`)}>
      {/* Accent bar */}
      <View style={[styles.accent, { backgroundColor: kindConf.color }]} />

      <View style={styles.cardInner}>
        {/* Top row */}
        <View style={styles.topRow}>
          <Text style={styles.emoji}>{item.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={expanded ? 0 : 1}>{item.title}</Text>
            <View style={styles.metaRow}>
              {area && <Text style={styles.metaChip}>{area.e} {area.n.split(' ')[0]}</Text>}
              <View style={[styles.kindPill, { backgroundColor: kindConf.color + '12' }]}>
                <Text style={[styles.kindPillText, { color: kindConf.color }]}>{kindConf.label}</Text>
              </View>
              {item.priority !== 'normal' && priConf.icon && (
                <Text style={{ fontSize: 12 }}>{priConf.icon}</Text>
              )}
              {item.deadline && (
                <Text style={[styles.metaDeadline, overdue && { color: T.red }]}>
                  {formatDeadline(item.deadline)}
                </Text>
              )}
            </View>
          </View>
          <Text style={[styles.chevron, expanded && { transform: [{ rotate: '90deg' }] }]}>›</Text>
        </View>

        {/* Progress */}
        {progress !== null && (
          <View style={styles.progressRow}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, {
                width: `${Math.round(progress * 100)}%` as any,
                backgroundColor: kindConf.color,
              }]} />
            </View>
            <Text style={styles.progressLabel}>{Math.round(progress * 100)}%</Text>
          </View>
        )}

        {/* Habit recurrence */}
        {kind === 'habit' && item.recurrence && (
          <Text style={styles.recurrenceText}>
            🔄 {formatRecurrence(item)}
            {item.habit_duration ? `  ·  ${formatDuration(item.habit_duration)}` : ''}
          </Text>
        )}

        {/* Expanded: steps list */}
        {expanded && kind === 'project' && item.steps && item.steps.length > 0 && (
          <View style={styles.stepsList}>
            {item.steps.map(step => (
              <View key={step.id} style={styles.stepRow}>
                <View style={[styles.stepDot, step.done && styles.stepDotDone]} />
                <Text style={[styles.stepText, step.done && styles.stepTextDone]} numberOfLines={1}>
                  {step.title}
                </Text>
                {step.today && !step.done && (
                  <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Today</Text></View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Expanded: description */}
        {expanded && item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}

        {/* Expanded: status actions */}
        {expanded && (
          <View style={styles.statusRow}>
            {item.status !== 'active' && (
              <Pressable style={styles.statusBtn}
                onPress={() => onStatusChange(item.id, 'active')}>
                <Text style={styles.statusBtnText}>▶ Activate</Text>
              </Pressable>
            )}
            {item.status === 'active' && (
              <Pressable style={[styles.statusBtn, styles.statusBtnPause]}
                onPress={() => onStatusChange(item.id, 'paused')}>
                <Text style={[styles.statusBtnText, { color: T.orange }]}>⏸ Pause</Text>
              </Pressable>
            )}
            {item.status !== 'done' && (
              <Pressable style={[styles.statusBtn, styles.statusBtnDone]}
                onPress={() => onStatusChange(item.id, 'done')}>
                <Text style={[styles.statusBtnText, { color: T.green }]}>✓ Done</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function PlanScreen() {
  const [kindFilter,   setKindFilter]   = useState<FilterKind>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('active');
  const items      = useStore(s => s.items);
  const updateItem = useStore(s => s.updateItem);

  const filtered = items.filter(item => {
    if (item.status !== statusFilter) return false;
    if (kindFilter === 'all') return true;
    return itemKind(item) === kindFilter;
  });

  const counts = {
    active:  items.filter(i => i.status === 'active').length,
    paused:  items.filter(i => i.status === 'paused').length,
    someday: items.filter(i => i.status === 'someday').length,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Everything</Text>
          <Text style={styles.heroTitle}>Plan</Text>
          <Text style={styles.heroSub}>All your items across every area</Text>
        </View>

        {/* Status tabs */}
        <View style={styles.statusTabs}>
          {STATUS_FILTERS.map(f => {
            const on = statusFilter === f.id;
            return (
              <Pressable key={f.id}
                style={[styles.statusTab, on && styles.statusTabActive]}
                onPress={() => setStatusFilter(f.id)}>
                <Text style={[styles.statusTabText, on && styles.statusTabTextActive]}>
                  {f.label}
                </Text>
                <View style={[styles.statusCount, on && { backgroundColor: T.brand }]}>
                  <Text style={[styles.statusCountText, on && { color: 'white' }]}>
                    {counts[f.id]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Kind filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.kindFilters} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
          {KIND_FILTERS.map(f => {
            const on = kindFilter === f.id;
            return (
              <Pressable key={f.id}
                style={[styles.kindChip, on && styles.kindChipActive]}
                onPress={() => setKindFilter(f.id)}>
                <Text style={[styles.kindChipText, on && styles.kindChipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Items */}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>
              {statusFilter === 'active' ? '🌱' : statusFilter === 'paused' ? '⏸' : '🌟'}
            </Text>
            <Text style={styles.emptyTitle}>
              {statusFilter === 'active' ? 'Nothing active yet'
                : statusFilter === 'paused' ? 'Nothing paused'
                : 'No dreams yet'}
            </Text>
            <Text style={styles.emptySub}>Tap + to add something</Text>
          </View>
        ) : (
          filtered.map(item => (
            <PlanCard
              key={item.id}
              item={item}
              onStatusChange={(id, status) => updateItem(id, { status })}
            />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: T.bg, ...(Platform.OS === 'web' ? { paddingTop: 67 } : {}) },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: S.md },

  hero:        { paddingTop: S.lg, paddingBottom: S.md },
  heroEyebrow: { fontSize: F.xs, color: T.t3, fontWeight: '600', marginBottom: 2 },
  heroTitle:   { fontSize: F.h1, fontWeight: '800', color: T.text, letterSpacing: -1 },
  heroSub:     { fontSize: F.sm, color: T.t2, marginTop: 6 },

  statusTabs: { flexDirection: 'row', gap: 8, marginBottom: S.md },
  statusTab:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: R.md, backgroundColor: 'white',
    borderWidth: 1, borderColor: T.sep },
  statusTabActive: { backgroundColor: T.brand + '0C', borderColor: T.brand + '30' },
  statusTabText:   { fontSize: F.xs, fontWeight: '600', color: T.t3 },
  statusTabTextActive: { color: T.brand, fontWeight: '800' },
  statusCount:     { backgroundColor: T.sep, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  statusCountText: { fontSize: 10, fontWeight: '700', color: T.t3 },

  kindFilters:      { marginBottom: S.md },
  kindChip:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'white', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)' },
  kindChipActive:   { backgroundColor: T.brand + '10', borderColor: T.brand + '30' },
  kindChipText:     { fontSize: 12, color: T.t3, fontWeight: '500' },
  kindChipTextActive: { color: T.brand, fontWeight: '700' },

  card:      { flexDirection: 'row', backgroundColor: 'white', borderRadius: R.lg,
    marginBottom: 8, overflow: 'hidden' },
  accent:    { width: 4 },
  cardInner: { flex: 1, padding: S.md },
  topRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  emoji:     { fontSize: 22, lineHeight: 26 },
  cardTitle: { fontSize: F.md, fontWeight: '700', color: T.text, lineHeight: 20 },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  metaChip:  { fontSize: 11, color: T.t3 },
  kindPill:  { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  kindPillText: { fontSize: 10, fontWeight: '700' },
  metaDeadline: { fontSize: 11, color: T.orange },
  chevron:   { fontSize: 20, color: T.t3, marginTop: -2 },

  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  progressBg:   { flex: 1, height: 4, backgroundColor: T.sep, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel:{ fontSize: 11, color: T.t3, fontWeight: '600', minWidth: 28 },

  recurrenceText: { fontSize: 12, color: T.t3, marginTop: 8 },

  stepsList: { marginTop: 12, gap: 6 },
  stepRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepDot:   { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: T.t3 },
  stepDotDone: { backgroundColor: T.green, borderColor: T.green },
  stepText:  { flex: 1, fontSize: 12, color: T.t2 },
  stepTextDone: { textDecorationLine: 'line-through', color: T.t3 },
  todayBadge: { backgroundColor: T.brand + '12', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  todayBadgeText: { fontSize: 9, fontWeight: '700', color: T.brand },

  description: { fontSize: 12, color: T.t2, lineHeight: 18, marginTop: 10, fontStyle: 'italic' },

  statusRow:    { flexDirection: 'row', gap: 8, marginTop: 12 },
  statusBtn:    { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: T.brand + '0C',
    alignItems: 'center', borderWidth: 1, borderColor: T.brand + '20' },
  statusBtnPause: { backgroundColor: T.orange + '0C', borderColor: T.orange + '20' },
  statusBtnDone:  { backgroundColor: T.green  + '0C', borderColor: T.green  + '20' },
  statusBtnText:  { fontSize: 12, fontWeight: '700', color: T.brand },

  empty:      { alignItems: 'center', paddingVertical: 56 },
  emptyEmoji: { fontSize: 44, marginBottom: S.md },
  emptyTitle: { fontSize: F.lg, fontWeight: '700', color: T.text, marginBottom: S.sm },
  emptySub:   { fontSize: F.md, color: T.t2 },
});
