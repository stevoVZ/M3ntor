import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Item, itemKind } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/items/ProgressBar';
import { getAreaConfig, getKindConfig, projectProgress } from '@/utils/items';
import { KIND_CONFIG } from '@/constants/config';

interface ItemCardProps {
  item: Item;
  onPress?: () => void;
  onToggle?: () => void;
  showArea?: boolean;
  isLast?: boolean;
}

export function ItemCard({ item, onPress, onToggle, showArea = true, isLast = false }: ItemCardProps) {
  const kind = itemKind(item);
  const kindCfg = getKindConfig(kind);
  const areaCfg = getAreaConfig(item.area);
  const isDone = item.status === 'done';
  const progress = kind === 'project' ? projectProgress(item) : 0;

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggle?.();
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        !isLast && styles.separator,
        pressed && { backgroundColor: 'rgba(120, 120, 128, 0.08)' },
      ]}
    >
      {kind !== 'project' && (
        <Pressable onPress={handleToggle} hitSlop={8} style={styles.checkArea}>
          <View style={[styles.checkbox, isDone && { backgroundColor: kindCfg.color, borderColor: kindCfg.color }]}>
            {isDone && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        </Pressable>
      )}

      {kind === 'project' && (
        <View style={[styles.kindIcon, { backgroundColor: kindCfg.tint }]}>
          <Ionicons name={kindCfg.icon as any} size={16} color={kindCfg.color} />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, isDone && styles.titleDone]} numberOfLines={1}>
            {item.title}
          </Text>
        </View>

        {item.description ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.meta}>
          {showArea && areaCfg && (
            <Badge label={areaCfg.label} color={areaCfg.color} tint={areaCfg.tint} />
          )}
          {kind === 'habit' && item.habit_time_of_day && (
            <View style={styles.timeTag}>
              <Ionicons name="time-outline" size={11} color="#8E8E93" />
              <Text style={styles.timeText}>{item.habit_time_of_day}</Text>
            </View>
          )}
        </View>

        {kind === 'project' && (
          <View style={styles.progressRow}>
            <ProgressBar progress={progress} color={kindCfg.color} />
            <Text style={styles.progressText}>
              {item.steps?.filter((s) => s.done).length}/{item.steps?.length}
            </Text>
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 52,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
  },
  checkArea: {
    padding: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#000',
    flex: 1,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    fontFamily: 'Inter_400Regular',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: 11,
    color: '#8E8E93',
    fontFamily: 'Inter_400Regular',
    textTransform: 'capitalize',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#8E8E93',
    fontFamily: 'Inter_500Medium',
  },
});
