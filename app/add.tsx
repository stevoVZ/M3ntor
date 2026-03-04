import { View, Text, TextInput, ScrollView, StyleSheet, Platform, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { ITEM_AREAS, KIND_CONFIG } from '@/constants/config';
import { Item, ItemKind, TimeOfDay } from '@/types';
import { createItem, createStep } from '@/utils/items';
import { getItemHint, AiHint } from '@/lib/ai';
import { ProjectAddSheet } from '@/components/add/ProjectAddSheet';
import Colors from '@/constants/colors';

const TIME_OPTIONS: { key: TimeOfDay; label: string; icon: string }[] = [
  { key: 'morning', label: 'Morning', icon: 'sunny-outline' },
  { key: 'afternoon', label: 'Afternoon', icon: 'partly-sunny-outline' },
  { key: 'evening', label: 'Evening', icon: 'moon-outline' },
  { key: 'anytime', label: 'Anytime', icon: 'time-outline' },
];

const KIND_OPTIONS: { key: ItemKind; label: string; icon: string }[] = [
  { key: 'action', label: 'Action', icon: 'checkmark-circle' },
  { key: 'habit', label: 'Habit', icon: 'repeat' },
  { key: 'goal', label: 'Goal', icon: 'flag' },
  { key: 'project', label: 'Project', icon: 'layers' },
];

const AREA_LIST = Object.entries(ITEM_AREAS).map(([key, val]) => ({
  key,
  label: val.n,
  color: val.c,
  emoji: val.e,
}));

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ kind?: string }>();
  const { addItem, userId } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState('');
  const [kind, setKind] = useState<ItemKind>((params.kind as ItemKind) || 'action');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');
  const [steps, setSteps] = useState<string[]>([]);
  const [newStep, setNewStep] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHint, setAiHint] = useState<AiHint | null>(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTitleChange = (text: string) => {
    setTitle(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length > 5) {
      debounceRef.current = setTimeout(() => {
        fetchHint(text);
      }, 1000);
    } else {
      setAiHint(null);
    }
  };

  const fetchHint = async (prompt: string) => {
    setAiLoading(true);
    try {
      const hint = await getItemHint(prompt, kind);
      setAiHint(hint);
    } catch {
      setAiHint(null);
    }
    setAiLoading(false);
  };

  const addStepItem = () => {
    if (!newStep.trim()) return;
    setSteps((prev) => [...prev, newStep.trim()]);
    setNewStep('');
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for your item.');
      return;
    }
    if (!area) {
      Alert.alert('Area required', 'Please select a life area.');
      return;
    }

    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const item = createItem(userId ?? 'local', {
      title: title.trim(),
      description: description.trim() || undefined,
      area,
      status: kind === 'goal' ? 'someday' : 'active',
      ...(kind === 'habit' ? {
        recurrence: { type: 'daily' as const },
        habit_time_of_day: timeOfDay,
      } : {}),
      ...(kind === 'project' && steps.length > 0 ? {
        steps: steps.map((s, i) => createStep(`temp-${Date.now()}`, {
          title: s,
          sort_order: i,
        })),
      } : {}),
    });

    addItem(item);
    setSaving(false);
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.handleBar}>
        <View style={styles.handle} />
      </View>

      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={Colors.light.textSecondary} />
        </Pressable>
        <Text style={styles.topTitle}>New Item</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.titleInput}
            placeholder="What do you want to do?"
            placeholderTextColor="#C7C7CC"
            value={title}
            onChangeText={handleTitleChange}
            autoFocus
            returnKeyType="next"
          />

          {aiLoading && (
            <View style={styles.aiRow}>
              <ActivityIndicator size="small" color={Colors.light.systemBlue} />
              <Text style={styles.aiLoadingText}>Getting AI suggestions...</Text>
            </View>
          )}

          {aiHint && !aiLoading && aiHint.why && (
            <View style={styles.aiSuggestionCard}>
              <View style={styles.aiSuggestionHeader}>
                <Ionicons name="sparkles" size={14} color={Colors.light.systemBlue} />
                <Text style={styles.aiSuggestionLabel}>AI Insight</Text>
              </View>
              <Text style={styles.aiSuggestionText}>{aiHint.why}</Text>
              {aiHint.tip && (
                <Text style={styles.aiSuggestionText}>💡 {aiHint.tip}</Text>
              )}
              {aiHint.firstStep && (
                <Text style={styles.aiSuggestionText}>→ {aiHint.firstStep}</Text>
              )}
            </View>
          )}

          <TextInput
            style={styles.descInput}
            placeholder="Description (optional)"
            placeholderTextColor="#C7C7CC"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <Text style={styles.sectionLabel}>TYPE</Text>
        <View style={styles.kindRow}>
          {KIND_OPTIONS.map((k) => {
            const cfg = KIND_CONFIG[k.key];
            const active = kind === k.key;
            return (
              <Pressable
                key={k.key}
                onPress={() => { setKind(k.key); Haptics.selectionAsync(); }}
                style={[styles.kindChip, active && { backgroundColor: cfg.color + '18', borderColor: cfg.color }]}
              >
                <Ionicons name={k.icon as any} size={16} color={active ? cfg.color : '#8E8E93'} />
                <Text style={[styles.kindChipText, active && { color: cfg.color }]}>{k.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>LIFE AREA</Text>
        <View style={styles.areaGrid}>
          {AREA_LIST.map((a) => {
            const active = area === a.key;
            return (
              <Pressable
                key={a.key}
                onPress={() => { setArea(a.key); Haptics.selectionAsync(); }}
                style={[styles.areaChip, active && { backgroundColor: a.color + '18', borderColor: a.color }]}
              >
                <Text style={{ fontSize: 14 }}>{a.emoji}</Text>
                <Text style={[styles.areaChipText, active && { color: a.color }]}>{a.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {kind === 'habit' && (
          <>
            <Text style={styles.sectionLabel}>TIME OF DAY</Text>
            <View style={styles.kindRow}>
              {TIME_OPTIONS.map((t) => {
                const active = timeOfDay === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => { setTimeOfDay(t.key); Haptics.selectionAsync(); }}
                    style={[styles.kindChip, active && { backgroundColor: 'rgba(0,122,255,0.1)', borderColor: Colors.light.systemBlue }]}
                  >
                    <Ionicons name={t.icon as any} size={16} color={active ? Colors.light.systemBlue : '#8E8E93'} />
                    <Text style={[styles.kindChipText, active && { color: Colors.light.systemBlue }]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {kind === 'project' && (
          <>
            <Text style={styles.sectionLabel}>STEPS</Text>
            <ProjectAddSheet
              projectTitle={title}
              onTasksGenerated={(tasks) => setSteps(tasks)}
            />
            <View style={styles.stepsContainer}>
              {steps.map((s, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View style={styles.stepDot} />
                  <Text style={styles.stepText}>{s}</Text>
                  <Pressable onPress={() => removeStep(idx)} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color="#C7C7CC" />
                  </Pressable>
                </View>
              ))}
              <View style={styles.addStepRow}>
                <TextInput
                  style={styles.addStepInput}
                  placeholder="Add a step..."
                  placeholderTextColor="#C7C7CC"
                  value={newStep}
                  onChangeText={setNewStep}
                  onSubmitEditing={addStepItem}
                  returnKeyType="done"
                />
                <Pressable onPress={addStepItem} hitSlop={8}>
                  <Ionicons name="add-circle" size={24} color={Colors.light.systemBlue} />
                </Pressable>
              </View>
            </View>
          </>
        )}

        <View style={styles.saveArea}>
          <Button
            title="Save"
            onPress={handleSave}
            loading={saving}
            disabled={!title.trim() || !area}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E5EA',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.separator,
  },
  topTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.text,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    gap: 12,
    marginBottom: 24,
  },
  titleInput: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.text,
    paddingVertical: 8,
  },
  descInput: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.textSecondary,
    paddingVertical: 8,
    minHeight: 44,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  aiLoadingText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.textTertiary,
  },
  aiSuggestionCard: {
    backgroundColor: 'rgba(0,122,255,0.05)',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.15)',
  },
  aiSuggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiSuggestionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.systemBlue,
  },
  aiSuggestionText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  kindRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  kindChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(120,120,128,0.12)',
    backgroundColor: 'rgba(120,120,128,0.04)',
  },
  kindChipText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#8E8E93',
  },
  areaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(120,120,128,0.12)',
    backgroundColor: 'rgba(120,120,128,0.04)',
  },
  areaChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#8E8E93',
  },
  stepsContainer: {
    gap: 0,
    marginBottom: 20,
    backgroundColor: Colors.light.secondaryBackground,
    borderRadius: 12,
    padding: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.separator,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.systemBlue,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.text,
  },
  addStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addStepInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.text,
    paddingVertical: 6,
  },
  saveArea: {
    marginTop: 8,
  },
});
