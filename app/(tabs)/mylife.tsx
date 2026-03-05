import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../lib/store';
import { T, S, F, R, shadow } from '../../constants/theme';
import { ITEM_AREAS } from '../../constants/config';
import { projectProgress } from '../../utils/items';

export default function MyLifeScreen() {
  const itemsByArea = useStore(s => s.itemsByArea);

  const areaEntries = Object.entries(ITEM_AREAS);

  return (
    <SafeAreaView style={[styles.safe, Platform.OS === 'web' && { paddingTop: 67 }]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Overview</Text>
          <Text style={styles.heroTitle}>My Life</Text>
          <Text style={styles.heroSub}>See how each area of your life is moving</Text>
        </View>

        <View style={styles.grid}>
          {areaEntries.map(([id, area]) => {
            const items = itemsByArea(id);
            const projects = items.filter(i => (i.steps?.length ?? 0) > 0);
            const avg = projects.length
              ? projects.reduce((sum, i) => sum + projectProgress(i), 0) / projects.length
              : 0;

            return (
              <Pressable key={id} style={[styles.areaCard, shadow.sm]}>
                {/* Colour accent top */}
                <View style={[styles.areaTop, { backgroundColor: area.c + '14' }]}>
                  <Text style={styles.areaEmoji}>{area.e}</Text>
                  {items.length > 0 && (
                    <View style={[styles.areaBadge, { backgroundColor: area.c }]}>
                      <Text style={styles.areaBadgeText}>{items.length}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.areaBody}>
                  <Text style={styles.areaName} numberOfLines={1}>{area.n.split(' ')[0]}</Text>
                  {items.length === 0 ? (
                    <Text style={styles.areaEmpty}>Nothing active</Text>
                  ) : (
                    <>
                      {/* Progress bar */}
                      {projects.length > 0 && (
                        <View style={styles.areaProgress}>
                          <View style={styles.areaProgressBg}>
                            <View style={[styles.areaProgressFill, {
                              width: `${Math.round(avg * 100)}%` as any,
                              backgroundColor: area.c,
                            }]} />
                          </View>
                          <Text style={[styles.areaProgressLabel, { color: area.c }]}>
                            {Math.round(avg * 100)}%
                          </Text>
                        </View>
                      )}
                      <Text style={styles.areaCount}>
                        {items.length} item{items.length !== 1 ? 's' : ''}
                      </Text>
                    </>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

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

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  areaCard: { width: '47%', backgroundColor: 'white', borderRadius: R.lg, overflow: 'hidden' },
  areaTop:  { padding: S.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  areaEmoji:{ fontSize: 28 },
  areaBadge:{ borderRadius: R.pill, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  areaBadgeText: { fontSize: 10, fontWeight: '800', color: 'white' },

  areaBody:     { padding: S.md, paddingTop: 8 },
  areaName:     { fontSize: F.md, fontWeight: '700', color: T.text, marginBottom: 6 },
  areaEmpty:    { fontSize: 11, color: T.t3 },
  areaCount:    { fontSize: 11, color: T.t3, marginTop: 4 },

  areaProgress:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  areaProgressBg:    { flex: 1, height: 4, backgroundColor: T.sep, borderRadius: 2, overflow: 'hidden' },
  areaProgressFill:  { height: '100%', borderRadius: 2 },
  areaProgressLabel: { fontSize: 10, fontWeight: '700', minWidth: 28 },
});
