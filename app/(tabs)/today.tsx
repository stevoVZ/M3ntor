import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useStore } from '../../lib/store';
import { T, S, F, R, shadow } from '../../constants/theme';
import { ITEM_AREAS, KIND_CONFIG } from '../../constants/config';
import { itemKind, projectProgress, formatRecurrence } from '../../utils/items';
import { greetingForTime, formatDeadline, isOverdue } from '../../utils/dates';
import type { Item } from '../../types';

// ── Item card for Today screen ────────────────────────────
function TodayCard({ item }: { item: Item }) {
  const kind     = itemKind(item);
  const kindConf = KIND_CONFIG[kind];
  const area     = ITEM_AREAS[item.area];
  const progress = kind === 'project' ? projectProgress(item) : null;
  const overdue  = isOverdue(item.deadline);

  return (
    <Pressable style={[styles.card, shadow.sm]} onPress={() => router.push(`/item/${item.id}`)}>
      {/* Left accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: kindConf.color }]} />

      <View style={styles.cardBody}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>{item.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
            ) : null}
          </View>
          {/* Kind badge */}
          <View style={[styles.kindBadge, { backgroundColor: kindConf.color + '14' }]}>
            <Text style={[styles.kindBadgeText, { color: kindConf.color }]}>{kindConf.label}</Text>
          </View>
        </View>

        {/* Progress bar for projects */}
        {progress !== null && (
          <View style={styles.progressRow}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, {
                width:           `${Math.round(progress * 100)}%` as any,
                backgroundColor: kindConf.color,
              }]} />
            </View>
            <Text style={styles.progressLabel}>{Math.round(progress * 100)}%</Text>
          </View>
        )}

        {/* Meta row */}
        <View style={styles.metaRow}>
          {area && (
            <View style={[styles.areaChip, { backgroundColor: area.c + '12' }]}>
              <Text style={styles.areaChipText}>{area.e} {area.n.split(' ')[0]}</Text>
            </View>
          )}
          {kind === 'habit' && item.recurrence && (
            <Text style={styles.metaText}>{formatRecurrence(item)}</Text>
          )}
          {item.deadline && (
            <Text style={[styles.metaText, overdue && { color: T.red }]}>
              {formatDeadline(item.deadline)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ── Section header ────────────────────────────────────────
function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{count}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

// ── Today screen ──────────────────────────────────────────
export default function TodayScreen() {
  const items = useStore(s => s.items);

  const activeItems = items.filter(i => i.status === 'active');
  const habits   = activeItems.filter(i => !!i.recurrence);
  const projects = activeItems.filter(i => (i.steps?.length ?? 0) > 0);
  const actions  = activeItems.filter(i => !i.recurrence && !(i.steps?.length ?? 0));

  const greeting = greetingForTime();
  const isEmpty  = activeItems.length === 0;

  return (
    <SafeAreaView style={[styles.safe, Platform.OS === 'web' && { paddingTop: 67 }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Hero header ── */}
        <View style={styles.hero}>
          <Text style={styles.heroGreeting}>{greeting}</Text>
          <Text style={styles.heroTitle}>Today</Text>
          <Text style={styles.heroSub}>
            {isEmpty
              ? 'Tap + to add your first item'
              : `${activeItems.length} active item${activeItems.length !== 1 ? 's' : ''}`}
          </Text>
        </View>

        {/* ── Empty state ── */}
        {isEmpty && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>Your slate is clear</Text>
            <Text style={styles.emptySub}>Add a habit, action, goal or project to get started.</Text>
          </View>
        )}

        {/* ── Habits ── */}
        {habits.length > 0 && (
          <Section title="Habits" count={habits.length}>
            {habits.map(item => <TodayCard key={item.id} item={item} />)}
          </Section>
        )}

        {/* ── Projects ── */}
        {projects.length > 0 && (
          <Section title="Projects" count={projects.length}>
            {projects.map(item => <TodayCard key={item.id} item={item} />)}
          </Section>
        )}

        {/* ── Actions ── */}
        {actions.length > 0 && (
          <Section title="Actions" count={actions.length}>
            {actions.map(item => <TodayCard key={item.id} item={item} />)}
          </Section>
        )}

        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: T.bg },
  scroll:      { flex: 1 },
  scrollContent: { paddingHorizontal: S.md },

  hero:          { paddingTop: S.lg, paddingBottom: S.md },
  heroGreeting:  { fontSize: F.sm, color: T.t3, fontWeight: '500', marginBottom: 2 },
  heroTitle:     { fontSize: F.h1, fontWeight: '800', color: T.text, letterSpacing: -1, lineHeight: 36 },
  heroSub:       { fontSize: F.sm, color: T.t2, marginTop: 6 },

  emptyState:    { alignItems: 'center', paddingVertical: S.xxl },
  emptyEmoji:    { fontSize: 48, marginBottom: S.md },
  emptyTitle:    { fontSize: F.lg, fontWeight: '700', color: T.text, marginBottom: S.sm },
  emptySub:      { fontSize: F.md, color: T.t2, textAlign: 'center', lineHeight: 22 },

  section:       { marginBottom: S.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: S.sm },
  sectionTitle:  { fontSize: F.sm, fontWeight: '700', color: T.t2, letterSpacing: 0.2 },
  sectionBadge:  { backgroundColor: T.brand + '14', borderRadius: R.pill, paddingHorizontal: 7, paddingVertical: 2 },
  sectionBadgeText: { fontSize: 11, fontWeight: '700', color: T.brand },

  card:          { flexDirection: 'row', backgroundColor: 'white', borderRadius: R.lg, marginBottom: 8, overflow: 'hidden' },
  cardAccent:    { width: 4 },
  cardBody:      { flex: 1, padding: S.md },
  cardHeader:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardEmoji:     { fontSize: 22, lineHeight: 26 },
  cardTitle:     { fontSize: F.md, fontWeight: '700', color: T.text, lineHeight: 20, flex: 1 },
  cardDesc:      { fontSize: F.xs, color: T.t3, marginTop: 2 },

  kindBadge:     { borderRadius: R.sm, paddingHorizontal: 7, paddingVertical: 3 },
  kindBadgeText: { fontSize: 10, fontWeight: '700' },

  progressRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  progressBg:    { flex: 1, height: 4, backgroundColor: T.sep, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 2 },
  progressLabel: { fontSize: 11, color: T.t3, fontWeight: '600', minWidth: 28 },

  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  areaChip:      { borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 3 },
  areaChipText:  { fontSize: 11, color: T.t2, fontWeight: '600' },
  metaText:      { fontSize: 11, color: T.t3 },
});
