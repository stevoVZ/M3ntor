import { View, Text, ScrollView, StyleSheet, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { useItems } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { ItemCard } from '@/components/items/ItemCard';
import { Fab } from '@/components/Fab';
import { getGreeting, getFormattedDate } from '@/utils/items';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Item } from '@/types';

function SectionHeader({ title, icon, count }: { title: string; icon: string; count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={16} color="#8E8E93" />
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
}

function ItemSection({ title, icon, items, onToggle, onPress }: {
  title: string;
  icon: string;
  items: Item[];
  onToggle: (id: string) => void;
  onPress: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title={title} icon={icon} count={items.length} />
      <Card variant="grouped">
        {items.map((item, idx) => (
          <ItemCard
            key={item.id}
            item={item}
            onToggle={() => onToggle(item.id)}
            onPress={() => onPress(item.id)}
            isLast={idx === items.length - 1}
          />
        ))}
      </Card>
    </View>
  );
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { getTodayItems, toggleDone, isLoading, refresh, getCompletedToday } = useItems();
  const [refreshing, setRefreshing] = useState(false);

  const today = getTodayItems();
  const completedToday = getCompletedToday();
  const totalToday = today.morning.length + today.afternoon.length + today.evening.length + today.actions.length;
  const hasItems = totalToday > 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleToggle = (id: string) => toggleDone(id);
  const handlePress = (id: string) => router.push({ pathname: '/item/[id]', params: { id } });

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  if (isLoading) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={Colors.light.systemBlue} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + webTopInset + 16, paddingBottom: Platform.OS === 'web' ? 120 : 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.systemBlue} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.date}>{getFormattedDate()}</Text>
        </View>

        {completedToday.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.light.systemGreen} />
              <Text style={styles.statText}>{completedToday.length} completed today</Text>
            </View>
          </View>
        )}

        {!hasItems ? (
          <View style={styles.emptyState}>
            <Ionicons name="sunny-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>Your day is clear</Text>
            <Text style={styles.emptySubtitle}>Tap + to add actions, habits, or projects</Text>
          </View>
        ) : (
          <>
            <ItemSection
              title="Morning"
              icon="sunny-outline"
              items={today.morning}
              onToggle={handleToggle}
              onPress={handlePress}
            />
            <ItemSection
              title="Afternoon"
              icon="partly-sunny-outline"
              items={today.afternoon}
              onToggle={handleToggle}
              onPress={handlePress}
            />
            <ItemSection
              title="Evening"
              icon="moon-outline"
              items={today.evening}
              onToggle={handleToggle}
              onPress={handlePress}
            />
            <ItemSection
              title="Actions"
              icon="flash-outline"
              items={today.actions}
              onToggle={handleToggle}
              onPress={handlePress}
            />
          </>
        )}
      </ScrollView>

      <Fab onPress={() => router.push('/add')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.groupedBackground,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.groupedBackground,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  statsRow: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.light.systemGreen,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  sectionCount: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#C7C7CC',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.text,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.textTertiary,
    textAlign: 'center',
  },
});
