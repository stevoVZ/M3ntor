import { View, Text, ScrollView, StyleSheet, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import React, { useState, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useItems } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { ItemCard } from '@/components/items/ItemCard';
import { Fab } from '@/components/Fab';
import { itemKind, ItemKind, ItemStatus, Item } from '@/types';
import { KIND_CONFIG, STATUS_CONFIG } from '@/constants/config';
import Colors from '@/constants/colors';

const KIND_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'action', label: 'Actions' },
  { key: 'habit', label: 'Habits' },
  { key: 'goal', label: 'Goals' },
  { key: 'project', label: 'Projects' },
];

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'someday', label: 'Someday' },
  { key: 'paused', label: 'Paused' },
  { key: 'done', label: 'Done' },
];

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const { items, toggleDone } = useItems();
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const filteredItems = useMemo(() => {
    let result = items.filter((i) => i.status === statusFilter);
    if (kindFilter !== 'all') {
      result = result.filter((i) => itemKind(i) === kindFilter);
    }
    return result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [items, kindFilter, statusFilter]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + webTopInset + 16, paddingBottom: Platform.OS === 'web' ? 120 : 100 },
        ]}
      >
        <Text style={styles.title}>Plan</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {KIND_FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              active={kindFilter === f.key}
              onPress={() => setKindFilter(f.key)}
            />
          ))}
        </ScrollView>

        <View style={styles.statusRow}>
          {STATUS_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setStatusFilter(f.key)}
              style={[styles.statusChip, statusFilter === f.key && styles.statusChipActive]}
            >
              <Text style={[styles.statusChipText, statusFilter === f.key && styles.statusChipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>Nothing here</Text>
            <Text style={styles.emptySubtitle}>
              No {kindFilter === 'all' ? 'items' : KIND_CONFIG[kindFilter]?.label.toLowerCase() + 's'} with status "{STATUS_CONFIG[statusFilter]?.label}"
            </Text>
          </View>
        ) : (
          <Card variant="grouped" style={{ marginTop: 8 }}>
            {filteredItems.map((item, idx) => (
              <ItemCard
                key={item.id}
                item={item}
                onToggle={() => toggleDone(item.id)}
                onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
                isLast={idx === filteredItems.length - 1}
              />
            ))}
          </Card>
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
  scrollContent: {
    paddingHorizontal: 0,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    color: Colors.light.text,
    letterSpacing: -0.5,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(120, 120, 128, 0.08)',
  },
  chipActive: {
    backgroundColor: Colors.light.systemBlue,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.light.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
  statusRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 0,
    marginBottom: 8,
    backgroundColor: 'rgba(120, 120, 128, 0.08)',
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 3,
  },
  statusChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusChipActive: {
    backgroundColor: '#fff',
    ...Colors.shadow.sm,
  },
  statusChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.light.textTertiary,
  },
  statusChipTextActive: {
    color: Colors.light.text,
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
    paddingHorizontal: 40,
  },
});
