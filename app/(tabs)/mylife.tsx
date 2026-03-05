import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useStore } from '@/lib/store';
import { T, S, F, R, shadow } from '@/constants/theme';
import { AREAS, normalizeAreaId } from '@/constants/config';
import type { LifeArea } from '@/constants/config';
import WheelOfLife, { scoreLabel, scoreTier } from '@/components/WheelOfLife';
import WheelAreaDetail from '@/components/WheelAreaDetail';

export default function MyLifeScreen() {
  const items = useStore(s => s.items);
  const [tappedIdx, setTappedIdx] = useState<number | null>(null);

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

  return (
    <SafeAreaView style={[styles.safe, Platform.OS === 'web' && { paddingTop: 67 }]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Life balance</Text>
          <Text style={styles.title}>My Life.</Text>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: '#34C75912' }]}>
              <Text style={[styles.badgeValue, { color: '#34C759' }]}>{avg}</Text>
              <Text style={styles.badgeLabel}>avg</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: weakest.c + '12' }]}>
              <Text style={[styles.badgeValue, { color: weakest.c }]}>{weakest.n}</Text>
              <Text style={styles.badgeLabel}>focus</Text>
            </View>
          </View>
        </View>

        <View style={[styles.glassCard, shadow.md]}>
          <WheelOfLife
            areas={areas}
            size={300}
            tappedIdx={tappedIdx}
            onTapArea={handleTap}
          />
          {tappedIdx === null && (
            <Text style={styles.tapHint}>Tap an area to explore</Text>
          )}
        </View>

        {selectedArea && (
          <WheelAreaDetail area={selectedArea} />
        )}

        <View style={styles.insightsRow}>
          <InsightCard
            label="Strongest"
            iconName={getFeatherName(strongest.icon)}
            value={strongest.n}
            score={strongest.score}
            color={strongest.c}
          />
          <InsightCard
            label="Focus area"
            iconName={getFeatherName(weakest.icon)}
            value={weakest.n}
            score={weakest.score}
            color={weakest.c}
          />
          <InsightCard
            label="Average"
            iconName="bar-chart-2"
            value={avg.toString()}
            score={avg}
            color={avg >= 7 ? '#34C759' : avg >= 5 ? '#FF9500' : '#FF3B30'}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InsightCard({ label, iconName, value, score, color }: {
  label: string; iconName: string; value: string; score: number; color: string;
}) {
  const tier = scoreTier(score);
  return (
    <View style={[styles.insightCard, shadow.sm]}>
      <View style={[styles.insightIconWrap, { backgroundColor: color + '14' }]}>
        <Feather name={iconName as any} size={16} color={color} />
      </View>
      <Text style={styles.insightLabel}>{label}</Text>
      <Text style={[styles.insightValue, { color }]} numberOfLines={1}>{value}</Text>
      <View style={[styles.insightTier, { backgroundColor: tier.bg }]}>
        <Text style={[styles.insightTierText, { color: tier.color }]}>{scoreLabel(score)}</Text>
      </View>
    </View>
  );
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
  eyebrow: { fontSize: F.xs, color: T.t3, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 4 },
  title: { fontSize: 36, fontWeight: '800', color: T.text, letterSpacing: -1 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill },
  badgeValue: { fontSize: 14, fontWeight: '700' },
  badgeLabel: { fontSize: 11, color: T.t3, fontWeight: '600' },

  glassCard: {
    backgroundColor: T.glass,
    borderRadius: 24,
    padding: S.md,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  tapHint: {
    fontSize: 11,
    color: T.t3,
    marginTop: 8,
  },

  insightsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  insightCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: R.lg,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  insightIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  insightLabel: { fontSize: 10, color: T.t3, fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  insightValue: { fontSize: 14, fontWeight: '700' },
  insightTier: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  insightTierText: { fontSize: 9, fontWeight: '700' },
});
