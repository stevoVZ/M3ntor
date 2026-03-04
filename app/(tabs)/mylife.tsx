import { View, Text, ScrollView, StyleSheet, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useItems } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { ItemCard } from '@/components/items/ItemCard';
import { ITEM_AREAS } from '@/constants/config';
import Colors from '@/constants/colors';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProgressRing({ progress, color, size = 36 }: { progress: number; color: string; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(progress, 1));

  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.ringTrack, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: color + '20' }]} />
      <View style={[styles.ringProgress, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: color, borderTopColor: 'transparent', borderRightColor: progress > 0.25 ? color : 'transparent', borderBottomColor: progress > 0.5 ? color : 'transparent', borderLeftColor: progress > 0.75 ? color : 'transparent', transform: [{ rotate: '-90deg' }] }]} />
      <Text style={[styles.ringText, { color }]}>{Math.round(progress * 100)}%</Text>
    </View>
  );
}

export default function MyLifeScreen() {
  const insets = useSafeAreaInsets();
  const { items, getItemsByArea, toggleDone, getActiveItems, getCompletedToday } = useItems();
  const [expandedArea, setExpandedArea] = useState<string | null>(null);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const activeItems = getActiveItems();
  const completedToday = getCompletedToday();
  const totalItems = items.filter((i) => i.status !== 'done').length;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + webTopInset + 16, paddingBottom: Platform.OS === 'web' ? 120 : 100 },
        ]}
      >
        <Text style={styles.title}>My Life</Text>

        <View style={styles.statsRow}>
          <StatCard icon="layers-outline" label="Active" value={activeItems.length} color={Colors.light.systemBlue} />
          <StatCard icon="checkmark-circle-outline" label="Done today" value={completedToday.length} color={Colors.light.systemGreen} />
          <StatCard icon="albums-outline" label="Total" value={totalItems} color={Colors.light.systemOrange} />
        </View>

        <View style={styles.grid}>
          {ITEM_AREAS.map((area) => {
            const areaItems = getItemsByArea(area.key);
            const doneCount = items.filter((i) => i.area === area.key && i.status === 'done').length;
            const totalAreaItems = areaItems.length + doneCount;
            const progress = totalAreaItems > 0 ? doneCount / totalAreaItems : 0;
            const isExpanded = expandedArea === area.key;

            return (
              <React.Fragment key={area.key}>
                <Pressable
                  onPress={() => setExpandedArea(isExpanded ? null : area.key)}
                  style={({ pressed }) => [
                    styles.areaCard,
                    { backgroundColor: area.tint },
                    pressed && { opacity: 0.8 },
                    isExpanded && styles.areaCardExpanded,
                  ]}
                >
                  <View style={styles.areaCardHeader}>
                    <View style={[styles.areaIcon, { backgroundColor: area.color + '20' }]}>
                      <Ionicons name={area.icon as any} size={20} color={area.color} />
                    </View>
                    <View style={styles.areaInfo}>
                      <Text style={styles.areaName}>{area.label}</Text>
                      <Text style={styles.areaCount}>{areaItems.length} active</Text>
                    </View>
                  </View>
                </Pressable>

                {isExpanded && areaItems.length > 0 && (
                  <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.expandedSection}>
                    <Card variant="grouped">
                      {areaItems.map((item, idx) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          showArea={false}
                          onToggle={() => toggleDone(item.id)}
                          onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
                          isLast={idx === areaItems.length - 1}
                        />
                      ))}
                    </Card>
                  </Animated.View>
                )}

                {isExpanded && areaItems.length === 0 && (
                  <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.expandedEmpty}>
                    <Text style={styles.expandedEmptyText}>No active items in {area.label}</Text>
                  </Animated.View>
                )}
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.groupedBackground,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    color: Colors.light.text,
    letterSpacing: -0.5,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    gap: 4,
    ...Colors.shadow.sm,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.textTertiary,
  },
  grid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  areaCard: {
    width: '48%',
    borderRadius: 14,
    padding: 16,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  areaCardExpanded: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  areaCardHeader: {
    gap: 10,
  },
  areaIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaInfo: {
    gap: 2,
  },
  areaName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.text,
  },
  areaCount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.textTertiary,
  },
  expandedSection: {
    width: '100%',
    marginBottom: 10,
  },
  expandedEmpty: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  expandedEmptyText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.textTertiary,
  },
  ringTrack: {
    position: 'absolute',
  },
  ringProgress: {
    position: 'absolute',
  },
  ringText: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 8,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 36,
  },
});
