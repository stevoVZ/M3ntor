import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Step } from '@/types';

interface TaskRowProps {
  step: Step;
  onToggle?: () => void;
  onPress?: () => void;
  isLast?: boolean;
}

export function TaskRow({ step, onToggle, onPress, isLast = false }: TaskRowProps) {
  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      <Pressable onPress={handleToggle} hitSlop={8} style={styles.checkArea}>
        <View style={[styles.checkbox, step.done && styles.checkboxDone]}>
          {step.done && <Ionicons name="checkmark" size={12} color="#fff" />}
        </View>
      </Pressable>

      <Text style={[styles.title, step.done && styles.titleDone]} numberOfLines={1}>
        {step.title}
      </Text>

      {step.today && !step.done && (
        <View style={styles.todayBadge}>
          <Text style={styles.todayText}>Today</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
    minHeight: 44,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
    marginLeft: 42,
  },
  checkArea: {
    padding: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#000',
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  todayBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  todayText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#007AFF',
  },
});
