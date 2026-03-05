import { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Modal, Platform, KeyboardAvoidingView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { T, S, R, shadow } from '@/constants/theme';
import { ITEM_AREAS, KIND_CONFIG, PRIORITY, EFFORT } from '@/constants/config';
import { itemKind } from '@/utils/items';
import { AreaPicker } from '@/components/add/AreaPicker';
import type { Item, Priority, Effort, TimeOfDay, Recurrence } from '@/types';

interface Props {
  item: Item;
  onSave: (patch: Partial<Item>) => void;
  onClose: () => void;
}

const RECURRENCE_OPTIONS: { id: Recurrence['type']; label: string }[] = [
  { id: 'daily', label: 'Every day' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'specific_days', label: 'Specific days' },
  { id: 'interval', label: 'Every X days' },
  { id: 'monthly', label: 'Monthly' },
];

const TIME_OPTIONS: { id: TimeOfDay; label: string; icon: string }[] = [
  { id: 'morning', label: 'Morning', icon: 'sunrise' },
  { id: 'afternoon', label: 'Afternoon', icon: 'sun' },
  { id: 'evening', label: 'Evening', icon: 'moon' },
  { id: 'anytime', label: 'Anytime', icon: 'clock' },
];

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function ItemEditSheet({ item, onSave, onClose }: Props) {
  const [title, setTitle] = useState(item.title || '');
  const [description, setDescription] = useState(item.description || '');
  const [primaryArea, setPrimaryArea] = useState<string | null>(item.area || null);
  const [priority, setPriority] = useState<Priority>(item.priority || 'normal');
  const [effort, setEffort] = useState<Effort>(item.effort || 'medium');
  const [deadline, setDeadline] = useState(item.deadline || '');
  const [recurrenceType, setRecurrenceType] = useState<Recurrence['type'] | null>(item.recurrence?.type || null);
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>(item.recurrence?.days || []);
  const [recurrenceInterval, setRecurrenceInterval] = useState(item.recurrence?.interval || 7);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(item.habit_time_of_day || 'anytime');
  const [habitDuration, setHabitDuration] = useState(item.habit_duration || 15);

  const inputRef = useRef<TextInput>(null);
  const kind = itemKind(item);
  const kindLabel = KIND_CONFIG[kind]?.label || 'Item';
  const kindColor = KIND_CONFIG[kind]?.color || T.brand;
  const areaData = primaryArea ? ITEM_AREAS[primaryArea] : null;
  const canSave = title.trim().length > 0 && primaryArea;
  const isHabit = kind === 'habit' || !!item.recurrence;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  function handleSave() {
    if (!canSave) return;
    const patch: Partial<Item> = {
      title: title.trim(),
      description: description.trim() || undefined,
      area: primaryArea!,
      priority,
      effort,
      deadline: deadline || undefined,
    };

    if (isHabit) {
      patch.habit_time_of_day = timeOfDay;
      patch.habit_duration = habitDuration;
      if (recurrenceType) {
        const rec: Recurrence = { type: recurrenceType };
        if (recurrenceType === 'specific_days') rec.days = recurrenceDays;
        if (recurrenceType === 'interval') rec.interval = recurrenceInterval;
        patch.recurrence = rec;
      }
    }

    onSave(patch);
    onClose();
  }

  function toggleDay(day: string) {
    setRecurrenceDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Edit {kindLabel}</Text>
              <Text style={styles.headerSub}>Changes apply immediately</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={14} color={T.t3} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>NAME</Text>
              <TextInput
                ref={inputRef}
                value={title}
                onChangeText={setTitle}
                placeholder="Item name..."
                placeholderTextColor={T.t3}
                style={styles.titleInput}
                returnKeyType="done"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DESCRIPTION</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Add a description..."
                placeholderTextColor={T.t3}
                style={[styles.titleInput, { minHeight: 64, textAlignVertical: 'top' as const }]}
                multiline
              />
            </View>

            <View style={styles.section}>
              <AreaPicker
                selected={primaryArea}
                onSelect={setPrimaryArea}
                label="Main area"
                required
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PRIORITY</Text>
              <View style={styles.optionRow}>
                {(Object.entries(PRIORITY) as [Priority, typeof PRIORITY[Priority]][]).map(([id, cfg]) => {
                  const on = priority === id;
                  return (
                    <Pressable
                      key={id}
                      style={[styles.optionChip, on && { backgroundColor: cfg.color + '14', borderColor: cfg.color + '40' }]}
                      onPress={() => setPriority(id)}
                    >
                      <Text style={[styles.optionChipText, on && { color: cfg.color, fontWeight: '700' as const }]}>
                        {cfg.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>EFFORT</Text>
              <View style={styles.optionRow}>
                {(Object.entries(EFFORT) as [Effort, typeof EFFORT[Effort]][]).map(([id, cfg]) => {
                  const on = effort === id;
                  return (
                    <Pressable
                      key={id}
                      style={[styles.optionChip, on && { backgroundColor: cfg.color + '14', borderColor: cfg.color + '40' }]}
                      onPress={() => setEffort(id)}
                    >
                      <View style={{ alignItems: 'center' }}>
                        <Text style={[styles.optionChipText, on && { color: cfg.color, fontWeight: '700' as const }]}>
                          {cfg.label}
                        </Text>
                        <Text style={[styles.optionChipSub, on && { color: cfg.color }]}>{cfg.sub}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {(kind === 'project' || kind === 'action') && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>DEADLINE <Text style={styles.optionalLabel}>optional</Text></Text>
                <TextInput
                  value={deadline}
                  onChangeText={setDeadline}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={T.t3}
                  style={styles.titleInput}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            )}

            {isHabit && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>TIME OF DAY</Text>
                  <View style={styles.optionRow}>
                    {TIME_OPTIONS.map(opt => {
                      const on = timeOfDay === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          style={[styles.optionChip, on && { backgroundColor: T.brand + '14', borderColor: T.brand + '40' }]}
                          onPress={() => setTimeOfDay(opt.id)}
                        >
                          <Feather name={opt.icon as any} size={13} color={on ? T.brand : T.t3} />
                          <Text style={[styles.optionChipText, on && { color: T.brand, fontWeight: '700' as const }]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>DURATION</Text>
                  <View style={styles.stepperRow}>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => setHabitDuration(Math.max(5, habitDuration - 5))}
                    >
                      <Feather name="minus" size={14} color={T.t2} />
                    </Pressable>
                    <Text style={styles.stepperValue}>{habitDuration} min</Text>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => setHabitDuration(Math.min(120, habitDuration + 5))}
                    >
                      <Feather name="plus" size={14} color={T.t2} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>RECURRENCE</Text>
                  <View style={styles.optionRow}>
                    {RECURRENCE_OPTIONS.map(opt => {
                      const on = recurrenceType === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          style={[styles.optionChip, on && { backgroundColor: T.orange + '14', borderColor: T.orange + '40' }]}
                          onPress={() => setRecurrenceType(opt.id)}
                        >
                          <Text style={[styles.optionChipText, on && { color: T.orange, fontWeight: '700' as const }]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {recurrenceType === 'specific_days' && (
                    <View style={[styles.optionRow, { marginTop: 10 }]}>
                      {DAY_NAMES.map((d, i) => {
                        const on = recurrenceDays.includes(d);
                        return (
                          <Pressable
                            key={d}
                            style={[styles.dayChip, on && { backgroundColor: T.orange, borderColor: T.orange }]}
                            onPress={() => toggleDay(d)}
                          >
                            <Text style={[styles.dayChipText, on && { color: 'white' }]}>{DAY_LABELS[i]}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  {recurrenceType === 'interval' && (
                    <View style={[styles.stepperRow, { marginTop: 10 }]}>
                      <Pressable
                        style={styles.stepperBtn}
                        onPress={() => setRecurrenceInterval(Math.max(2, recurrenceInterval - 1))}
                      >
                        <Feather name="minus" size={14} color={T.t2} />
                      </Pressable>
                      <Text style={styles.stepperValue}>Every {recurrenceInterval} days</Text>
                      <Pressable
                        style={styles.stepperBtn}
                        onPress={() => setRecurrenceInterval(Math.min(30, recurrenceInterval + 1))}
                      >
                        <Feather name="plus" size={14} color={T.t2} />
                      </Pressable>
                    </View>
                  )}
                </View>
              </>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          <Pressable
            style={[styles.saveBtn, canSave && { backgroundColor: areaData?.c || T.brand }]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={[styles.saveBtnText, canSave && { color: 'white' }]}>Save changes</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.14, shadowRadius: 32 },
      android: { elevation: 24 },
      default: {},
    }),
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#DDD', alignSelf: 'center', marginTop: 10,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: T.text },
  headerSub: { fontSize: 12, color: T.t3, marginTop: 1 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: T.fill, alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: 20 },

  section: { marginBottom: 18 },
  sectionLabel: {
    fontSize: 11, fontWeight: '600' as const, color: T.t3,
    letterSpacing: 0.3, marginBottom: 8,
  },
  optionalLabel: {
    fontWeight: '400' as const, fontSize: 10, letterSpacing: 0,
  },
  titleInput: {
    padding: 13, paddingHorizontal: 14, borderRadius: 14,
    backgroundColor: T.glass, borderWidth: 1, borderColor: T.sep,
    fontSize: 15, color: T.text,
  },

  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  optionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: T.fill, borderWidth: 1.5, borderColor: 'transparent',
  },
  optionChipText: { fontSize: 12, fontWeight: '600' as const, color: T.t2 },
  optionChipSub: { fontSize: 9, color: T.t3, marginTop: 1 },

  dayChip: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.fill, borderWidth: 1.5, borderColor: 'transparent',
  },
  dayChipText: { fontSize: 12, fontWeight: '700' as const, color: T.t2 },

  stepperRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  stepperBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: T.fill, alignItems: 'center', justifyContent: 'center',
  },
  stepperValue: { fontSize: 15, fontWeight: '600' as const, color: T.text },

  saveBtn: {
    marginHorizontal: 20, padding: 15, borderRadius: 16,
    backgroundColor: T.fill, alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700' as const, color: T.t3, letterSpacing: -0.2 },
});
