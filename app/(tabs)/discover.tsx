import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { T, S, F, R, shadow } from '../../constants/theme';
import { useStore } from '../../lib/store';
import { ITEM_AREAS, PRG, DIFF, JOURNEY_ICONS, WA } from '../../constants/config';
import type { Journey } from '../../types';
import AICoach from '../../components/discover/AICoach';

function JourneyCard({ journey }: { journey: Journey }) {
  const area = ITEM_AREAS[journey.a] ?? ITEM_AREAS.learning;
  const enrollJourney = useStore(s => s.enrollJourney);
  const unenrollJourney = useStore(s => s.unenrollJourney);
  const reEnrollJourney = useStore(s => s.reEnrollJourney);
  const journeys = useStore(s => s.journeys);
  const jp = journeys.find(j => j.journey_id === journey.id);
  const isActive = jp?.status === 'active';
  const isPaused = jp?.status === 'paused';
  const isDone = jp?.status === 'done';

  const handleLeave = () => {
    Alert.alert(
      'Leave journey?',
      'Your progress will be saved — you can come back anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => unenrollJourney(journey.id) },
      ]
    );
  };

  const handleStartOver = () => {
    Alert.alert(
      'Start over?',
      'This will reset your progress to Week 1, Day 1.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start over', style: 'destructive', onPress: () => reEnrollJourney(journey.id, true) },
      ]
    );
  };

  return (
    <Pressable style={[styles.card, shadow.sm]}>
      <View style={[styles.cardAccent, { backgroundColor: area.c }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardArea, { backgroundColor: area.c + '14' }]}>
            <Text style={{ fontSize: 16 }}>{JOURNEY_ICONS[journey.id] || area.e}</Text>
          </View>
          <View style={styles.cardBadges}>
            {journey.d && DIFF[journey.d] && (
              <View style={[styles.diffBadge, { backgroundColor: DIFF[journey.d].c + '14' }]}>
                <Text style={[styles.diffBadgeText, { color: DIFF[journey.d].c }]}>{DIFF[journey.d].l}</Text>
              </View>
            )}
            {journey.f && (
              <View style={styles.featuredBadge}>
                <Feather name="award" size={11} color="#B8860B" />
                <Text style={styles.featuredText}>Featured</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.cardTitle}>{journey.t}</Text>
        <Text style={styles.cardExpert}>by {journey.e}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{journey.ds}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaText}>{journey.w} weeks</Text>
          <Text style={styles.cardMetaDot}>·</Text>
          <Text style={styles.cardMetaText}>{journey.m} min/day</Text>
          <Text style={styles.cardMetaDot}>·</Text>
          <Text style={styles.cardMetaText}>★ {journey.rt}</Text>
          <Text style={styles.cardMetaDot}>·</Text>
          <Text style={styles.cardMetaText}>{(journey.u / 1000).toFixed(1)}k enrolled</Text>
        </View>
        {WA[journey.id] && WA[journey.id][0] && (
          <View style={styles.waPreview}>
            <Text style={styles.waPreviewLabel}>Week 1 preview</Text>
            {WA[journey.id][0].slice(0, 3).map((action, idx) => (
              <View key={idx} style={styles.waPreviewRow}>
                <Feather name="check-circle" size={10} color={area.c} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.waPreviewTitle} numberOfLines={1}>{action.t}</Text>
                  <Text style={styles.waPreviewDur}>{action.dur}</Text>
                </View>
              </View>
            ))}
            {WA[journey.id][0].length > 3 && (
              <Text style={styles.waPreviewMore}>+{WA[journey.id][0].length - 3} more actions</Text>
            )}
          </View>
        )}

        {isPaused && jp && (
          <View style={styles.pausedInfo}>
            <Feather name="clock" size={11} color={T.t3} />
            <Text style={styles.pausedInfoText}>
              Paused at Week {jp.current_week}, Day {jp.current_day ?? 1}
            </Text>
          </View>
        )}

        {!jp ? (
          <Pressable style={[styles.enrollBtn, { backgroundColor: area.c }]}
            onPress={() => enrollJourney(journey.id)}>
            <Text style={styles.enrollBtnText}>Enrol in journey</Text>
          </Pressable>
        ) : isActive ? (
          <View style={styles.enrolledActions}>
            <View style={[styles.enrolledBadge, { backgroundColor: T.green + '14' }]}>
              <Feather name="check" size={11} color={T.green} />
              <Text style={[styles.enrolledBadgeText, { color: T.green }]}>Enrolled</Text>
            </View>
            <Pressable style={styles.leaveBtn} onPress={handleLeave}>
              <Feather name="log-out" size={12} color={T.t3} />
              <Text style={styles.leaveBtnText}>Leave</Text>
            </Pressable>
          </View>
        ) : isPaused ? (
          <View style={styles.enrolledActions}>
            <Pressable style={[styles.enrollBtn, { backgroundColor: area.c, flex: 1 }]}
              onPress={() => reEnrollJourney(journey.id, false)}>
              <Text style={styles.enrollBtnText}>Resume</Text>
            </Pressable>
            <Pressable style={[styles.enrollBtn, { backgroundColor: T.fill, flex: 1 }]}
              onPress={handleStartOver}>
              <Text style={[styles.enrollBtnText, { color: T.t2 }]}>Start over</Text>
            </Pressable>
          </View>
        ) : isDone ? (
          <View style={styles.enrolledActions}>
            <View style={[styles.enrolledBadge, { backgroundColor: T.green + '14' }]}>
              <Feather name="award" size={11} color={T.green} />
              <Text style={[styles.enrolledBadgeText, { color: T.green }]}>Completed</Text>
            </View>
            <Pressable style={[styles.enrollBtn, { backgroundColor: T.fill, flex: 0 }]}
              onPress={handleStartOver}>
              <Text style={[styles.enrollBtnText, { color: T.t2 }]}>Restart</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const [showCoach, setShowCoach] = useState(false);
  const areas = [...new Set(PRG.map(p => p.a))];

  const filtered = PRG.filter(j => {
    const matchSearch = !search.trim() || j.t.toLowerCase().includes(search.toLowerCase()) || j.e.toLowerCase().includes(search.toLowerCase());
    const matchFilter = !filter || j.a === filter;
    return matchSearch && matchFilter;
  });

  const featured = filtered.filter(j => j.f);
  const rest     = filtered.filter(j => !j.f);

  if (showCoach) {
    return (
      <SafeAreaView style={[styles.safe, Platform.OS === 'web' && { paddingTop: 67 }]} edges={['top']}>
        <AICoach onClose={() => setShowCoach(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, Platform.OS === 'web' && { paddingTop: 67 }]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Expert programs</Text>
          <Text style={styles.heroTitle}>Discover</Text>
          <Text style={styles.heroSub}>Science-backed journeys curated for real results</Text>
        </View>

        <Pressable style={[styles.coachCard, shadow.sm]} onPress={() => setShowCoach(true)}>
          <View style={styles.coachLeft}>
            <View style={styles.coachAvatar}>
              <Feather name="compass" size={18} color="white" />
            </View>
            <View style={styles.coachInfo}>
              <Text style={styles.coachTitle}>Find Your Journey</Text>
              <Text style={styles.coachSub}>Describe your goals and get AI-powered recommendations</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={T.t3} />
        </Pressable>

        {/* Search */}
        <View style={styles.searchWrap}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search journeys…"
            placeholderTextColor={T.t3}
            style={styles.search}
          />
        </View>

        {/* Area filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.filters} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
          <Pressable style={[styles.filterChip, !filter && styles.filterChipActive]}
            onPress={() => setFilter(null)}>
            <Text style={[styles.filterChipText, !filter && styles.filterChipTextActive]}>All</Text>
          </Pressable>
          {areas.map(a => {
            const area = ITEM_AREAS[a];
            if (!area) return null;
            const on = filter === a;
            return (
              <Pressable key={a} style={[styles.filterChip, on && { backgroundColor: area.c + '12', borderColor: area.c + '40' }]}
                onPress={() => setFilter(prev => prev === a ? null : a)}>
                <Text style={{ fontSize: 13 }}>{area.e}</Text>
                <Text style={[styles.filterChipText, on && { color: area.c, fontWeight: '700' }]}>
                  {area.n.split(' ')[0]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {featured.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="award" size={14} color="#B8860B" />
              <Text style={styles.sectionTitle}>Featured</Text>
            </View>
            {featured.map(j => <JourneyCard key={j.id} journey={j} />)}
          </View>
        )}

        {rest.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All journeys</Text>
            {rest.map(j => <JourneyCard key={j.id} journey={j} />)}
          </View>
        )}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Feather name="search" size={40} color={T.t3} />
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptySub}>Try a different search or filter</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: T.bg },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: S.md },

  hero:        { paddingTop: S.lg, paddingBottom: S.md },
  heroEyebrow: { fontSize: F.xs, color: T.t3, fontWeight: '600', marginBottom: 2 },
  heroTitle:   { fontSize: F.h1, fontWeight: '800', color: T.text, letterSpacing: -1 },
  heroSub:     { fontSize: F.sm, color: T.t2, marginTop: 6 },

  searchWrap: { marginBottom: 12 },
  search:     { backgroundColor: 'white', borderRadius: R.lg, padding: S.md, fontSize: 15, color: T.text, borderWidth: 1, borderColor: T.sep },

  filters: { marginBottom: S.md },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'white' },
  filterChipActive: { backgroundColor: T.brand + '10', borderColor: T.brand + '30' },
  filterChipText: { fontSize: 12, color: T.t3, fontWeight: '500' },
  filterChipTextActive: { color: T.brand, fontWeight: '700' },

  section:      { marginBottom: S.lg },
  sectionTitle: { fontSize: F.sm, fontWeight: '700', color: T.t2, marginBottom: S.sm },

  card:       { flexDirection: 'row', backgroundColor: 'white', borderRadius: R.lg, marginBottom: S.sm, overflow: 'hidden' },
  cardAccent: { width: 4 },
  cardBody:   { flex: 1, padding: S.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardArea:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  diffBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  diffBadgeText: { fontSize: 11, fontWeight: '700' },
  featuredBadge: { backgroundColor: '#FDCB6E20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 },
  featuredText:  { fontSize: 11, fontWeight: '700', color: '#B8860B' },
  cardTitle:  { fontSize: F.md, fontWeight: '800', color: T.text, letterSpacing: -0.3 },
  cardExpert: { fontSize: F.xs, color: T.brand, fontWeight: '600', marginTop: 2, marginBottom: 6 },
  cardDesc:   { fontSize: F.xs, color: T.t2, lineHeight: 18, marginBottom: 10 },
  cardMeta:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  cardMetaText: { fontSize: 11, color: T.t3 },
  cardMetaDot:  { fontSize: 11, color: T.t3 },
  enrollBtn:    { borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  enrollBtnText:{ fontSize: 13, fontWeight: '700', color: 'white' },
  enrolledActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  enrolledBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flex: 1 },
  enrolledBadgeText: { fontSize: 13, fontWeight: '700' },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: T.fill },
  leaveBtnText: { fontSize: 12, fontWeight: '600', color: T.t3 },
  pausedInfo: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  pausedInfoText: { fontSize: 11, color: T.t3, fontWeight: '500' },

  coachCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'white', borderRadius: R.lg, padding: S.md, marginBottom: S.md,
    borderWidth: 0.5, borderColor: T.brand + '20',
  },
  coachLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  coachAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' },
  coachInfo: { flex: 1 },
  coachTitle: { fontSize: F.md, fontWeight: '700', color: T.text },
  coachSub: { fontSize: F.xs, color: T.t2, marginTop: 2 },

  waPreview: { marginTop: 8, marginBottom: 10, backgroundColor: T.fill, borderRadius: 10, padding: 10, gap: 6 },
  waPreviewLabel: { fontSize: 10, fontWeight: '700', color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  waPreviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  waPreviewTitle: { fontSize: 12, fontWeight: '600', color: T.text, lineHeight: 16 },
  waPreviewDur: { fontSize: 10, color: T.t3, marginTop: 1 },
  waPreviewMore: { fontSize: 10, color: T.t3, fontWeight: '600', marginTop: 2 },

  empty:      { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 40, marginBottom: S.md },
  emptyTitle: { fontSize: F.lg, fontWeight: '700', color: T.text, marginBottom: S.sm },
  emptySub:   { fontSize: F.md, color: T.t2 },
});
