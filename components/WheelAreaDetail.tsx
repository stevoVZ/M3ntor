import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { T, S, F, R, shadow } from '@/constants/theme';
import { scoreLabel, scoreTier } from './WheelOfLife';
import type { LifeArea } from '@/constants/config';
import { normalizeAreaId } from '@/constants/config';
import { useStore } from '@/lib/store';

interface Props {
  area: LifeArea;
}

export default function WheelAreaDetail({ area }: Props) {
  const items = useStore(s => s.items);
  const tier = scoreTier(area.score);

  const normalizedId = normalizeAreaId(area.id);
  const areaItems = items.filter(
    i => (i.status === 'active' || i.status === 'paused') &&
         (i.area === area.id || i.area === normalizedId ||
          (i.secondary_areas ?? []).includes(area.id) ||
          (i.secondary_areas ?? []).includes(normalizedId))
  );

  const habits = areaItems.filter(i => i.status === 'active' && !!i.recurrence);
  const projects = areaItems.filter(i => i.status === 'active' && (i.steps?.length ?? 0) > 0);
  const actions = areaItems.filter(i => i.status === 'active' && !i.recurrence && !(i.steps?.length ?? 0));
  const totalActive = habits.length + projects.length + actions.length;

  return (
    <View style={[styles.container, { backgroundColor: area.c + '0A', borderColor: area.c + '18' }]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: area.c + '18' }]}>
          <Feather name={getFeatherName(area.icon)} size={20} color={area.c} />
        </View>
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.areaName}>{area.n}</Text>
            <View style={[styles.tierBadge, { backgroundColor: tier.bg }]}>
              <Text style={[styles.tierText, { color: tier.color }]}>{scoreLabel(area.score)}</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            {totalActive > 0
              ? `${totalActive} thing${totalActive !== 1 ? 's' : ''} actively improving your score`
              : 'Nothing active yet'}
          </Text>
        </View>
        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreValue, { color: area.c }]}>{area.score}</Text>
          <Text style={styles.scoreMax}>/10</Text>
        </View>
      </View>

      <Text style={styles.desc}>{area.desc}</Text>

      {totalActive > 0 && (
        <View style={styles.itemsSection}>
          {habits.length > 0 && (
            <ItemGroup label="Habits" color={T.orange} items={habits} />
          )}
          {projects.length > 0 && (
            <ItemGroup label="Projects" color={T.green} items={projects} />
          )}
          {actions.length > 0 && (
            <ItemGroup label="Actions" color={T.t3} items={actions} />
          )}
        </View>
      )}
    </View>
  );
}

function ItemGroup({ label, color, items }: { label: string; color: string; items: any[] }) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <View style={[styles.groupDot, { backgroundColor: color }]} />
        <Text style={styles.groupLabel}>{label}</Text>
        <Text style={styles.groupCount}>{items.length}</Text>
      </View>
      {items.slice(0, 3).map(item => (
        <Pressable
          key={item.id}
          style={styles.itemRow}
          onPress={() => router.push(`/item/${item.id}`)}
        >
          <View style={styles.itemDot} />
          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        </Pressable>
      ))}
      {items.length > 3 && (
        <Text style={styles.moreText}>+{items.length - 3} more</Text>
      )}
    </View>
  );
}

function getFeatherName(icon: string): any {
  const map: Record<string, string> = {
    heart: 'heart', briefcase: 'briefcase', dollar: 'dollar-sign', people: 'users',
    star: 'star', chat: 'message-circle', heart2: 'heart', zap: 'zap',
    home: 'home', sun: 'sun',
  };
  return map[icon] || 'star';
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: S.md,
    marginTop: 8,
    padding: S.md,
    borderRadius: 18,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  areaName: {
    fontSize: F.md,
    fontWeight: '700',
    color: T.text,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    color: T.t3,
    marginTop: 2,
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  scoreMax: {
    fontSize: 12,
    color: T.t3,
    fontWeight: '600',
  },
  desc: {
    fontSize: 13,
    color: T.t2,
    lineHeight: 19,
    marginTop: 12,
  },
  itemsSection: {
    marginTop: 14,
    gap: 12,
  },
  group: {
    gap: 4,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  groupDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: T.t2,
    letterSpacing: 0.3,
  },
  groupCount: {
    fontSize: 10,
    fontWeight: '600',
    color: T.t3,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginBottom: 2,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.t3,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: T.text,
    flex: 1,
  },
  moreText: {
    fontSize: 11,
    color: T.t3,
    paddingLeft: 8,
    marginTop: 2,
  },
});
