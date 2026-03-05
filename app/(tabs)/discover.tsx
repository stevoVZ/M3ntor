import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T, S, F, R, shadow } from '../../constants/theme';
import { useStore } from '../../lib/store';
import { ITEM_AREAS } from '../../constants/config';
import { PRG } from '../../constants/config';
import type { Journey } from '../../types';

function JourneyCard({ journey }: { journey: Journey }) {
  const area = ITEM_AREAS[journey.a] ?? ITEM_AREAS.learning;
  const enrollJourney = useStore(s => s.enrollJourney);
  const journeys      = useStore(s => s.journeys);
  const enrolled      = journeys.some(j => j.journey_id === journey.id);

  return (
    <Pressable style={[styles.card, shadow.sm]}>
      <View style={[styles.cardAccent, { backgroundColor: area.c }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardArea, { backgroundColor: area.c + '14' }]}>
            <Text style={{ fontSize: 16 }}>{area.e}</Text>
          </View>
          {journey.f && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>⭐ Featured</Text>
            </View>
          )}
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
        <Pressable style={[styles.enrollBtn, { backgroundColor: enrolled ? T.green : area.c }]}
          onPress={() => !enrolled && enrollJourney(journey.id)} disabled={enrolled}>
          <Text style={styles.enrollBtnText}>{enrolled ? "✓ Enrolled" : "Enrol in journey"}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string | null>(null);

  const areas = [...new Set(PRG.map(p => p.a))];

  const filtered = PRG.filter(j => {
    const matchSearch = !search.trim() || j.t.toLowerCase().includes(search.toLowerCase()) || j.e.toLowerCase().includes(search.toLowerCase());
    const matchFilter = !filter || j.a === filter;
    return matchSearch && matchFilter;
  });

  const featured = filtered.filter(j => j.f);
  const rest     = filtered.filter(j => !j.f);

  return (
    <SafeAreaView style={[styles.safe, Platform.OS === 'web' && { paddingTop: 67 }]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Expert programs</Text>
          <Text style={styles.heroTitle}>Discover</Text>
          <Text style={styles.heroSub}>Science-backed journeys curated for real results</Text>
        </View>

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
            <Text style={styles.sectionTitle}>⭐  Featured</Text>
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
            <Text style={styles.emptyEmoji}>🔍</Text>
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
  featuredBadge: { backgroundColor: '#FDCB6E20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  featuredText:  { fontSize: 11, fontWeight: '700', color: '#B8860B' },
  cardTitle:  { fontSize: F.md, fontWeight: '800', color: T.text, letterSpacing: -0.3 },
  cardExpert: { fontSize: F.xs, color: T.brand, fontWeight: '600', marginTop: 2, marginBottom: 6 },
  cardDesc:   { fontSize: F.xs, color: T.t2, lineHeight: 18, marginBottom: 10 },
  cardMeta:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  cardMetaText: { fontSize: 11, color: T.t3 },
  cardMetaDot:  { fontSize: 11, color: T.t3 },
  enrollBtn:    { borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  enrollBtnText:{ fontSize: 13, fontWeight: '700', color: 'white' },

  empty:      { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 40, marginBottom: S.md },
  emptyTitle: { fontSize: F.lg, fontWeight: '700', color: T.text, marginBottom: S.sm },
  emptySub:   { fontSize: F.md, color: T.t2 },
});
