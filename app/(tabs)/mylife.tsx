import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '@/lib/store';
import { T, S, F, R, shadow } from '@/constants/theme';
import { AREAS, normalizeAreaId, PRG } from '@/constants/config';
import type { LifeArea } from '@/constants/config';
import WheelOfLife, { scoreLabel, scoreTier } from '@/components/WheelOfLife';
import WheelAreaDetail from '@/components/WheelAreaDetail';
import { computeAppScore, appScoreInsight } from '@/utils/scores';
import ProfileScreen from '@/components/profile/ProfileScreen';

type ViewMode = 'wheel' | 'list';
type ListSort = 'score-asc' | 'score-desc' | 'name';
type TimePeriod = 'now' | 'week' | 'month' | 'start';

const TIME_OPTIONS: { id: TimePeriod; label: string }[] = [
  { id: 'now', label: 'Now' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'start', label: 'Start' },
];

export default function MyLifeScreen() {
  const items = useStore(s => s.items);
  const journeys = useStore(s => s.journeys);
  const profile = useStore(s => s.profile);
  const [tappedIdx, setTappedIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('wheel');
  const [listSort, setListSort] = useState<ListSort>('score-asc');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('now');
  const [showProfile, setShowProfile] = useState(false);

  const userInitial = (profile?.name || 'Y').charAt(0).toUpperCase();

  const areas: LifeArea[] = useMemo(() => {
    return AREAS.map(area => {
      const normalizedId = normalizeAreaId(area.id);
      const areaItems = items.filter(
        i => (i.status === 'active' || i.status === 'paused') &&
             (i.area === area.id || i.area === normalizedId ||
              (i.secondary_areas ?? []).includes(area.id) ||
              (i.secondary_areas ?? []).includes(normalizedId))
      );
      const activeCount = areaItems.filter(i => i.status === 'active').length;
      const boost = Math.min(activeCount, 3);
      const score = Math.min(10, Math.max(1, area.start + boost));
      return { ...area, score };
    });
  }, [items]);

  const appScores = useMemo(() => {
    const s: Record<string, number> = {};
    AREAS.forEach(a => {
      s[a.id] = computeAppScore(a.id, items, journeys, PRG);
    });
    return s;
  }, [items, journeys]);

  const compareScores = useMemo(() => {
    if (timePeriod === 'now') return null;
    if (timePeriod === 'start') {
      const scores: Record<string, number> = {};
      areas.forEach(a => {
        const base = AREAS.find(ar => ar.id === a.id);
        scores[a.id] = base?.start ?? 5;
      });
      return scores;
    }
    return null;
  }, [timePeriod, areas]);

  const compareLabel = useMemo(() => {
    const labels: Record<string, string> = { week: 'Last week', month: 'Last month', start: 'Start' };
    return labels[timePeriod] || '';
  }, [timePeriod]);

  const avg = useMemo(() => {
    return +(areas.reduce((s, a) => s + a.score, 0) / areas.length).toFixed(1);
  }, [areas]);

  const strongest = useMemo(() => {
    return areas.reduce((best, a) => a.score > best.score ? a : best, areas[0]);
  }, [areas]);

  const weakest = useMemo(() => {
    return areas.reduce((w, a) => a.score < w.score ? a : w, areas[0]);
  }, [areas]);

  const handleTap = (idx: number) => {
    setTappedIdx(prev => prev === idx ? null : idx);
  };

  const selectedArea = tappedIdx !== null ? areas[tappedIdx] : null;

  const sortedAreas = useMemo(() => {
    const sorted = [...areas];
    if (listSort === 'score-asc') sorted.sort((a, b) => a.score - b.score);
    else if (listSort === 'score-desc') sorted.sort((a, b) => b.score - a.score);
    else sorted.sort((a, b) => a.n.localeCompare(b.n));
    return sorted;
  }, [areas, listSort]);

  if (showProfile) {
    return (
      <SafeAreaView style={[styles.safe, Platform.OS === 'web' && { paddingTop: 67 }]} edges={['top']}>
        <ProfileScreen onClose={() => setShowProfile(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, Platform.OS === 'web' && { paddingTop: 67 }]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
              <Text style={styles.eyebrow}>Life balance</Text>
              <Text style={styles.title}>My Life.</Text>
            </View>
            <Pressable onPress={() => setShowProfile(true)} hitSlop={8}>
              <LinearGradient
                colors={T.gradColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.profileAvatar}
              >
                <Text style={styles.profileAvatarText}>{userInitial}</Text>
              </LinearGradient>
            </Pressable>
          </View>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: T.brand + '10' }]}>
              <Text style={[styles.badgeValue, { color: T.brand }]}>Avg {avg}/10</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: weakest.c + '10' }]}>
              <Text style={[styles.badgeValue, { color: weakest.c }]}>Focus: {weakest.n.split(' ')[0]}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.glassCard, shadow.md]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Wheel of Life</Text>
              <Text style={styles.cardSubtitle}>Tap any area to explore</Text>
            </View>
            <View style={styles.viewToggle}>
              <Pressable
                style={[styles.toggleBtn, viewMode === 'wheel' && styles.toggleBtnActive]}
                onPress={() => { setViewMode('wheel'); }}
              >
                <Feather name="target" size={13} color={viewMode === 'wheel' ? T.brand : T.t3} />
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
                onPress={() => { setViewMode('list'); setTappedIdx(null); }}
              >
                <Feather name="list" size={13} color={viewMode === 'list' ? T.brand : T.t3} />
              </Pressable>
            </View>
          </View>

          <View style={styles.timePeriodRow}>
            <View style={styles.timePeriodContainer}>
              {TIME_OPTIONS.map(opt => (
                <Pressable
                  key={opt.id}
                  style={[styles.timePeriodBtn, timePeriod === opt.id && styles.timePeriodBtnActive]}
                  onPress={() => setTimePeriod(opt.id)}
                >
                  <Text style={[styles.timePeriodText, timePeriod === opt.id && styles.timePeriodTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: T.brand }]} />
              <Text style={styles.legendText}>You</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDashed, { borderColor: T.brand }]} />
              <Text style={styles.legendText}>M3NTOR</Text>
            </View>
          </View>

          {viewMode === 'wheel' && (
            <>
              <WheelOfLife
                areas={areas}
                size={300}
                tappedIdx={tappedIdx}
                onTapArea={handleTap}
                appScores={appScores}
              />
              {tappedIdx === null && (
                <Text style={styles.tapHint}>Tap an area to explore</Text>
              )}
            </>
          )}

          {viewMode === 'list' && (
            <View style={styles.listContainer}>
              <View style={styles.sortRow}>
                {([
                  { id: 'score-asc' as ListSort, label: 'Lowest first' },
                  { id: 'score-desc' as ListSort, label: 'Highest first' },
                  { id: 'name' as ListSort, label: 'A-Z' },
                ] as const).map(s => (
                  <Pressable
                    key={s.id}
                    style={[styles.sortPill, listSort === s.id && styles.sortPillActive]}
                    onPress={() => setListSort(s.id)}
                  >
                    <Text style={[styles.sortPillText, listSort === s.id && styles.sortPillTextActive]}>
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {sortedAreas.map((area) => {
                const areaIdx = areas.indexOf(area);
                const isSelected = tappedIdx === areaIdx;
                const areaAppScore = appScores[area.id] || 1;
                const normalizedId = normalizeAreaId(area.id);
                const activeCount = items.filter(
                  i => i.status === 'active' &&
                    (i.area === area.id || i.area === normalizedId ||
                      (i.secondary_areas ?? []).includes(area.id) ||
                      (i.secondary_areas ?? []).includes(normalizedId))
                ).length;
                const pastScore = compareScores ? (compareScores[area.id] || 0) : null;
                const diff = pastScore !== null ? area.score - pastScore : null;

                return (
                  <Pressable
                    key={area.id}
                    style={[styles.listRow, isSelected && { backgroundColor: area.c + '08', borderColor: area.c + '20' }]}
                    onPress={() => handleTap(areaIdx)}
                  >
                    <View style={[styles.listIcon, { backgroundColor: area.c + '14' }]}>
                      <Feather name={getFeatherName(area.icon) as any} size={16} color={area.c} />
                    </View>
                    <View style={styles.listInfo}>
                      <View style={styles.listNameRow}>
                        <Text style={styles.listName}>{area.n}</Text>
                        <View style={styles.listScores}>
                          {activeCount > 0 && (
                            <View style={styles.activeBadge}>
                              <Text style={styles.activeBadgeText}>{activeCount} active</Text>
                            </View>
                          )}
                          <Text style={[styles.listScoreVal, { color: area.c }]}>{area.score}</Text>
                          <Text style={styles.listScoreLabel}>you</Text>
                          <Text style={styles.listScoreSep}>{'\u00B7'}</Text>
                          <Text style={[styles.listAppScoreVal, { color: area.c }]}>{areaAppScore}</Text>
                          <Text style={styles.listScoreLabel}>app</Text>
                        </View>
                      </View>
                      <View style={styles.dualBars}>
                        <View style={[styles.barTrack, { backgroundColor: area.c + '10' }]}>
                          <View style={[styles.barFill, { width: `${area.score * 10}%`, backgroundColor: area.c }]} />
                        </View>
                        <View style={[styles.barTrack, { backgroundColor: area.c + '08' }]}>
                          <View style={[styles.barFillDashed, { width: `${areaAppScore * 10}%`, backgroundColor: area.c + '40' }]} />
                        </View>
                      </View>
                    </View>
                    {diff !== null && diff !== 0 && (
                      <View style={[styles.diffBadge, { backgroundColor: diff > 0 ? T.green + '14' : T.red + '14' }]}>
                        <Text style={[styles.diffText, { color: diff > 0 ? T.green : T.red }]}>
                          {diff > 0 ? '+' : ''}{diff}
                        </Text>
                      </View>
                    )}
                    <Feather name="chevron-right" size={10} color={T.t3} style={{ opacity: 0.3 }} />
                  </Pressable>
                );
              })}
            </View>
          )}

          {viewMode === 'wheel' && (
            <View style={styles.insightsRowInCard}>
              <InsightMiniCard label="Strongest" name={strongest.n} value={`${strongest.score}/10`} color={strongest.c} />
              <InsightMiniCard label="Focus area" name={weakest.n} value={`${weakest.score}/10`} color={weakest.c} />
              <InsightMiniCard label="Average" name={avg.toString()} value="out of 10" color={T.brand} />
            </View>
          )}

          {viewMode === 'list' && (
            <View style={styles.listSummaryRow}>
              <View style={[styles.listSummaryItem, { backgroundColor: T.brand + '06' }]}>
                <Text style={[styles.listSummaryBig, { color: T.brand }]}>{avg}</Text>
                <Text style={styles.listSummarySmall}> avg</Text>
              </View>
              <View style={[styles.listSummaryItem, { backgroundColor: weakest.c + '06' }]}>
                <Text style={styles.listSummarySmall}>Focus: </Text>
                <Text style={[styles.listSummaryName, { color: weakest.c }]}>{weakest.n.split(' ')[0]}</Text>
              </View>
              <View style={[styles.listSummaryItem, { backgroundColor: strongest.c + '06' }]}>
                <Text style={styles.listSummarySmall}>Best: </Text>
                <Text style={[styles.listSummaryName, { color: strongest.c }]}>{strongest.n.split(' ')[0]}</Text>
              </View>
            </View>
          )}
        </View>

        {selectedArea && (
          <WheelAreaDetail area={selectedArea} appScore={appScores[selectedArea.id]} />
        )}

        {viewMode === 'wheel' && timePeriod !== 'now' && compareScores && (
          <ComparisonSection areas={areas} compareScores={compareScores} compareLabel={compareLabel} />
        )}

        <InsightsSection areas={areas} appScores={appScores} strongest={strongest} weakest={weakest} avg={avg} />

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InsightMiniCard({ label, name, value, color }: { label: string; name: string; value: string; color: string }) {
  return (
    <View style={[styles.miniCard, { backgroundColor: color + '08', borderColor: color + '14' }]}>
      <Text style={styles.miniCardLabel}>{label}</Text>
      <Text style={[styles.miniCardName, { color }]} numberOfLines={1}>{name}</Text>
      <Text style={styles.miniCardValue}>{value}</Text>
    </View>
  );
}

function ComparisonSection({ areas, compareScores, compareLabel }: {
  areas: LifeArea[];
  compareScores: Record<string, number>;
  compareLabel: string;
}) {
  const changes = areas.map(a => ({
    ...a,
    past: compareScores[a.id] || 0,
    diff: a.score - (compareScores[a.id] || 0),
  })).sort((a, b) => b.diff - a.diff);

  const totalChange = changes.reduce((s, c) => s + c.diff, 0);
  const changed = changes.filter(c => c.diff !== 0);
  const unchanged = changes.filter(c => c.diff === 0);

  return (
    <View style={[styles.comparisonCard, shadow.sm, {
      backgroundColor: totalChange > 0 ? T.green + '08' : totalChange < 0 ? T.red + '08' : T.fill,
      borderColor: totalChange > 0 ? T.green + '18' : totalChange < 0 ? T.red + '18' : T.sep,
    }]}>
      <View style={styles.comparisonHeader}>
        <Text style={styles.comparisonTitle}>Changes since {compareLabel.toLowerCase()}</Text>
        <Text style={[styles.comparisonTotal, {
          color: totalChange > 0 ? T.green : totalChange < 0 ? T.red : T.t3,
        }]}>
          {totalChange > 0 ? '+' : ''}{totalChange} overall
        </Text>
      </View>
      {changed.map(c => (
        <View key={c.id} style={styles.changeRow}>
          <View style={[styles.changeDot, { backgroundColor: c.c }]} />
          <Text style={styles.changeName}>{c.n}</Text>
          <Text style={styles.changePast}>{c.past}</Text>
          <Feather name="arrow-right" size={10} color={T.t3} />
          <Text style={styles.changeNow}>{c.score}</Text>
          <View style={[styles.changeDiffBadge, {
            backgroundColor: c.diff > 0 ? T.green + '14' : T.red + '14',
          }]}>
            <Text style={[styles.changeDiffText, {
              color: c.diff > 0 ? T.green : T.red,
            }]}>
              {c.diff > 0 ? '+' : ''}{c.diff}
            </Text>
          </View>
        </View>
      ))}
      {unchanged.length > 0 && (
        <Text style={styles.unchangedText}>
          {unchanged.map(c => c.n).join(', ')} {'\u2014'} no change
        </Text>
      )}
    </View>
  );
}

function InsightsSection({ areas, appScores, strongest, weakest, avg }: {
  areas: LifeArea[];
  appScores: Record<string, number>;
  strongest: LifeArea;
  weakest: LifeArea;
  avg: number;
}) {
  const strongestInsight = appScoreInsight(strongest.score, appScores[strongest.id] || 1);
  const weakestInsight = appScoreInsight(weakest.score, appScores[weakest.id] || 1);

  const avgAppScore = useMemo(() => {
    const total = areas.reduce((s, a) => s + (appScores[a.id] || 1), 0);
    return +(total / areas.length).toFixed(1);
  }, [areas, appScores]);

  const overallInsight = appScoreInsight(avg, avgAppScore);

  return (
    <View style={[styles.insightsCard, shadow.sm]}>
      <Text style={styles.insightsTitle}>Insights</Text>

      <View style={styles.insightRow}>
        <View style={[styles.insightIconWrap, { backgroundColor: strongest.c + '14' }]}>
          <Feather name="trending-up" size={14} color={strongest.c} />
        </View>
        <View style={styles.insightContent}>
          <Text style={styles.insightLabel}>Strongest: {strongest.n}</Text>
          <Text style={styles.insightMsg}>Self: {strongest.score} / App: {appScores[strongest.id] || 1}</Text>
        </View>
      </View>

      <View style={styles.insightRow}>
        <View style={[styles.insightIconWrap, { backgroundColor: weakest.c + '14' }]}>
          <Feather name="target" size={14} color={weakest.c} />
        </View>
        <View style={styles.insightContent}>
          <Text style={styles.insightLabel}>Focus: {weakest.n}</Text>
          <Text style={styles.insightMsg}>Self: {weakest.score} / App: {appScores[weakest.id] || 1}</Text>
        </View>
      </View>

      <View style={styles.insightRow}>
        <View style={[styles.insightIconWrap, { backgroundColor: T.brand + '14' }]}>
          <Feather name="bar-chart-2" size={14} color={T.brand} />
        </View>
        <View style={styles.insightContent}>
          <Text style={styles.insightLabel}>Average: {avg} (App: {avgAppScore})</Text>
          <Text style={styles.insightMsg}>{overallInsight.msg}</Text>
        </View>
      </View>

      <View style={styles.insightDivider} />

      <View style={styles.insightRow}>
        <View style={[styles.insightIconWrap, { backgroundColor: insightColor(strongestInsight.type) + '14' }]}>
          <Feather name={insightIcon(strongestInsight.type) as any} size={14} color={insightColor(strongestInsight.type)} />
        </View>
        <View style={styles.insightContent}>
          <Text style={styles.insightMsg}>{strongestInsight.msg}</Text>
        </View>
      </View>

      <View style={styles.insightRow}>
        <View style={[styles.insightIconWrap, { backgroundColor: insightColor(weakestInsight.type) + '14' }]}>
          <Feather name={insightIcon(weakestInsight.type) as any} size={14} color={insightColor(weakestInsight.type)} />
        </View>
        <View style={styles.insightContent}>
          <Text style={styles.insightMsg}>{weakestInsight.msg}</Text>
        </View>
      </View>
    </View>
  );
}

function insightColor(type: 'aligned' | 'overconfident' | 'undervalued'): string {
  if (type === 'aligned') return T.green;
  if (type === 'overconfident') return T.orange;
  return T.blue;
}

function insightIcon(type: 'aligned' | 'overconfident' | 'undervalued'): string {
  if (type === 'aligned') return 'check-circle';
  if (type === 'overconfident') return 'alert-circle';
  return 'award';
}

function getFeatherName(icon: string): string {
  const map: Record<string, string> = {
    heart: 'heart', briefcase: 'briefcase', dollar: 'dollar-sign', people: 'users',
    star: 'star', chat: 'message-circle', heart2: 'heart', zap: 'zap',
    home: 'home', sun: 'sun',
  };
  return map[icon] || 'star';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: S.md },

  hero: { paddingTop: S.lg, paddingBottom: S.md },
  heroRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, justifyContent: 'space-between' as const },
  heroLeft: { flex: 1 },
  profileAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center' as const, justifyContent: 'center' as const, marginTop: 4 },
  profileAvatarText: { fontSize: 13, fontWeight: '800' as const, color: 'white' },
  eyebrow: { fontSize: F.xs, color: T.t3, fontWeight: '600' as const, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 4 },
  title: { fontSize: 36, fontWeight: '800' as const, color: T.text, letterSpacing: -1 },
  badges: { flexDirection: 'row' as const, gap: 8, marginTop: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeValue: { fontSize: 12, fontWeight: '600' as const },

  glassCard: {
    backgroundColor: T.glass,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden' as const,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  cardTitle: { fontSize: 13, fontWeight: '700' as const, color: T.t3, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  cardSubtitle: { fontSize: 11, color: T.t3, marginTop: 1 },
  viewToggle: {
    flexDirection: 'row' as const,
    backgroundColor: T.fill,
    borderRadius: 9,
    padding: 2,
  },
  toggleBtn: {
    width: 30,
    height: 26,
    borderRadius: 7,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  toggleBtnActive: {
    backgroundColor: 'white',
  },

  timePeriodRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    alignItems: 'center' as const,
  },
  timePeriodContainer: {
    flexDirection: 'row' as const,
    backgroundColor: 'rgba(120,120,128,0.08)',
    borderRadius: 10,
    padding: 2,
  },
  timePeriodBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
  },
  timePeriodBtnActive: {
    backgroundColor: 'white',
  },
  timePeriodText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: T.t3,
  },
  timePeriodTextActive: {
    color: T.text,
  },

  legendRow: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
  },
  legendLine: {
    width: 14,
    height: 3,
    borderRadius: 2,
    opacity: 0.7,
  },
  legendDashed: {
    width: 14,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed' as const,
    opacity: 0.5,
  },
  legendText: {
    fontSize: 10.5,
    color: T.t2,
    fontWeight: '500' as const,
  },

  tapHint: {
    fontSize: 11,
    color: T.t3,
    marginTop: 8,
    textAlign: 'center' as const,
    paddingBottom: 8,
  },

  insightsRowInCard: {
    flexDirection: 'row' as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
  },
  miniCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 0.5,
    alignItems: 'center' as const,
  },
  miniCardLabel: { fontSize: 10, fontWeight: '600' as const, color: T.t3, textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  miniCardName: { fontSize: 15, fontWeight: '700' as const, marginTop: 2 },
  miniCardValue: { fontSize: 11, color: T.t3 },

  listContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sortRow: {
    flexDirection: 'row' as const,
    gap: 4,
    marginBottom: 10,
    paddingLeft: 4,
  },
  sortPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: 'rgba(120,120,128,0.06)',
  },
  sortPillActive: {
    backgroundColor: T.text,
  },
  sortPillText: {
    fontSize: 10,
    fontWeight: '650' as const,
    color: T.t3,
  },
  sortPillTextActive: {
    color: 'white',
  },
  listRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'transparent',
    marginBottom: 3,
  },
  listIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  listInfo: {
    flex: 1,
    minWidth: 0,
  },
  listNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 4,
  },
  listName: {
    fontSize: 13,
    fontWeight: '650' as const,
    color: T.text,
  },
  listScores: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
  },
  activeBadge: {
    backgroundColor: T.fill,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginRight: 4,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: T.t3,
  },
  listScoreVal: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  listAppScoreVal: {
    fontSize: 13,
    fontWeight: '700' as const,
    opacity: 0.6,
  },
  listScoreLabel: {
    fontSize: 10,
    color: T.t3,
    fontWeight: '500' as const,
  },
  listScoreSep: {
    fontSize: 11,
    color: T.t3,
  },
  dualBars: {
    gap: 2,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  barFill: {
    height: '100%' as const,
    borderRadius: 2,
  },
  barFillDashed: {
    height: '100%' as const,
    borderRadius: 2,
  },
  diffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    minWidth: 28,
    alignItems: 'center' as const,
  },
  diffText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },

  listSummaryRow: {
    flexDirection: 'row' as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  listSummaryItem: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  listSummaryBig: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  listSummarySmall: {
    fontSize: 10,
    color: T.t3,
  },
  listSummaryName: {
    fontSize: 12,
    fontWeight: '700' as const,
  },

  comparisonCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 0.5,
  },
  comparisonHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 10,
  },
  comparisonTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: T.text,
  },
  comparisonTotal: {
    fontSize: 13,
    fontWeight: '800' as const,
  },
  changeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 6,
  },
  changeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  changeName: {
    fontSize: 12,
    color: T.t2,
    flex: 1,
  },
  changePast: {
    fontSize: 11,
    color: T.t3,
  },
  changeNow: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: T.text,
  },
  changeDiffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  changeDiffText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  unchangedText: {
    fontSize: 11,
    color: T.t3,
    paddingTop: 2,
  },

  insightsCard: {
    marginTop: 20,
    backgroundColor: 'white',
    borderRadius: R.lg,
    padding: 16,
    gap: 12,
  },
  insightsTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: T.t3,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  insightRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
  },
  insightIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  insightContent: {
    flex: 1,
  },
  insightLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: T.text,
    marginBottom: 2,
  },
  insightMsg: {
    fontSize: 12,
    color: T.t2,
    lineHeight: 17,
  },
  insightDivider: {
    height: 1,
    backgroundColor: T.sep,
    marginVertical: 4,
  },
});
