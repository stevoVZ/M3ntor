import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  Platform, ActivityIndicator, KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { T, S, F, shadow } from '../../constants/theme';
import { ITEM_AREAS } from '../../constants/config';
import type { Priority, Effort } from '../../types';
import { suggestArea } from '../../utils/nlp';
import { generateProjectTasks } from '../../lib/ai';
import { createItem, createStep } from '../../utils/items';
import { useStore } from '../../lib/store';
import { AreaPicker } from './AreaPicker';

const EMOJIS = ['📁','🏗️','💡','🎯','🚀','📊','🔧','🎨','📝','🏃','💪','🌱','🏠','✈️','💰','📚'];

const PRIORITY_OPTIONS = [
  { id: 'urgent', label: 'Urgent', icon: 'alert-triangle' as const, color: '#E53E3E' },
  { id: 'high',   label: 'High',   icon: 'arrow-up' as const,       color: '#DD6B20' },
  { id: 'normal', label: 'Normal', icon: 'minus' as const,          color: T.t3      },
  { id: 'low',    label: 'Low',    icon: 'arrow-down' as const,     color: '#718096'  },
] as const;

const EFFORT_OPTIONS = [
  { id: 'quick',  label: 'Quick',  icon: 'zap' as const,   color: T.green  },
  { id: 'medium', label: 'Medium', icon: 'clock' as const,  color: T.orange },
  { id: 'deep',   label: 'Deep',   icon: 'layers' as const, color: T.brand  },
] as const;

interface Props {
  prefillText?: string;
  onClose: () => void;
}

export function ProjectAddSheet({ prefillText = '', onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { userId, addItem } = useStore();
  const effectiveUserId = userId ?? 'guest';

  const [title, setTitle]           = useState(prefillText);
  const [description, setDescription] = useState('');
  const [emoji, setEmoji]           = useState('📁');
  const [area, setArea]             = useState<string | null>(null);
  const [areaConfirmed, setAreaConfirmed] = useState(false);
  const [expandArea, setExpandArea] = useState(false);
  const [priority, setPriority]     = useState<Priority>('normal');
  const [effort, setEffort]         = useState<Effort>('medium');
  const [deadline, setDeadline]     = useState('');
  const [steps, setSteps]           = useState<Array<{ id: string; title: string }>>([]);
  const [newStep, setNewStep]       = useState('');
  const [aiLoading, setAiLoading]   = useState(false);
  const [autoRan, setAutoRan]       = useState(false);
  const [saved, setSaved]           = useState(false);
  const [showAttributes, setShowAttributes] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const stepRef  = useRef<TextInput>(null);

  const isCompact = screenWidth < 380;
  const horizontalPad = isCompact ? 14 : 20;

  useEffect(() => {
    if (title.length >= 3 && !areaConfirmed) {
      const s = suggestArea(title);
      if (s) setArea(s);
    }
  }, [title]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  useEffect(() => {
    if (prefillText.trim().length > 3 && !autoRan) {
      setAutoRan(true);
      setTimeout(() => runGenerate(prefillText), 700);
    }
  }, []);

  const areaConf = area ? ITEM_AREAS[area] : null;
  const canSave  = title.trim().length > 0 && !!area;

  async function runGenerate(t?: string) {
    const titleToUse = t ?? title;
    if (!titleToUse.trim() || aiLoading) return;
    setAiLoading(true);
    const result = await generateProjectTasks(titleToUse, steps.map(s => s.title));
    if (result.tasks.length) {
      setSteps(result.tasks.map((t, i) => ({ id: `s-${Date.now()}-${i}`, title: t })));
    }
    if (result.emoji) setEmoji(result.emoji);
    setAiLoading(false);
  }

  function addStep() {
    if (!newStep.trim()) return;
    setSteps(prev => [...prev, { id: `s-${Date.now()}`, title: newStep.trim() }]);
    setNewStep('');
    setTimeout(() => stepRef.current?.focus(), 40);
  }

  function removeStep(id: string) {
    setSteps(prev => prev.filter(s => s.id !== id));
  }

  function handleSave() {
    if (!canSave) return;

    const item = createItem(effectiveUserId, {
      title: title.trim(),
      description: description.trim() || undefined,
      area:  area!,
      emoji,
      status: 'active',
      priority,
      effort,
      deadline: deadline.trim() || undefined,
    });

    const fullSteps = steps.map((s, i) => createStep(item.id, {
      title:      s.title,
      sort_order: i,
    }));
    item.steps = fullSteps;

    addItem(item);

    setSaved(true);
    setTimeout(() => onClose(), 1100);
  }

  const hasAttributes = priority !== 'normal' || effort !== 'medium' || deadline.trim();
  const attributeSummary = [
    priority !== 'normal' ? PRIORITY_OPTIONS.find(p => p.id === priority)?.label : null,
    effort !== 'medium' ? EFFORT_OPTIONS.find(e => e.id === effort)?.label : null,
    deadline.trim() ? `Due: ${deadline}` : null,
  ].filter(Boolean);

  return (
    <View style={styles.fullOverlay}>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={0}
        style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={styles.backdrop} />
        </Pressable>

        <Animated.View
          entering={SlideInDown.springify().damping(30).stiffness(320)}
          exiting={SlideOutDown.springify().damping(28)}
          style={[styles.sheet, {
            paddingHorizontal: horizontalPad,
            paddingBottom: Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 16),
          }]}>

          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {saved ? (
            <View style={styles.savedState}>
              <View style={[styles.savedIconBox, { backgroundColor: T.brand + '10' }]}>
                <Text style={{ fontSize: 32 }}>{emoji}</Text>
              </View>
              <Text style={styles.savedTitle}>Project created!</Text>
              <Text style={styles.savedSub}>{title}</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetTitle, isCompact && { fontSize: 18 }]}>New Project</Text>
                  <Text style={styles.sheetSub}>A plan with steps and a finish line</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
                  <Feather name="x" size={14} color={T.t3} />
                </Pressable>
              </View>

              <View style={styles.titleRow}>
                <View style={[styles.emojiBox, areaConf && { backgroundColor: areaConf.c + '12', borderColor: areaConf.c + '20' }]}>
                  <Text style={{ fontSize: isCompact ? 22 : 26 }}>{emoji}</Text>
                </View>
                <TextInput
                  ref={inputRef}
                  value={title}
                  onChangeText={setTitle}
                  onSubmitEditing={() => stepRef.current?.focus()}
                  placeholder="Name your project…"
                  placeholderTextColor={T.t3}
                  style={[styles.titleInput, areaConf && { borderColor: areaConf.c + '30' }]}
                  returnKeyType="next"
                />
              </View>

              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Add a description (optional)…"
                placeholderTextColor={T.t3}
                style={styles.descInput}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              <View style={styles.emojiPicker}>
                {EMOJIS.map(e => (
                  <Pressable key={e} style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                    onPress={() => setEmoji(e)}>
                    <Text style={{ fontSize: isCompact ? 16 : 18 }}>{e}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.areaSection}>
                {area && !expandArea ? (
                  <View style={styles.areaRow}>
                    <View style={[styles.areaSelected, { backgroundColor: areaConf?.c + '10', borderColor: areaConf?.c + '25' }]}>
                      <Text style={{ fontSize: 20 }}>{areaConf?.e}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={styles.areaNameRow}>
                          <Text style={[styles.areaSelectedName, { color: areaConf?.c }]}>{areaConf?.n}</Text>
                          <Feather name="check" size={16} color={areaConf?.c} />
                        </View>
                        <Text style={styles.areaSelectedHint}>Suggested from title</Text>
                      </View>
                    </View>
                    <Pressable style={styles.areaChangeBtn} onPress={() => setExpandArea(true)}>
                      <Text style={styles.areaChangeBtnText}>Change</Text>
                    </Pressable>
                  </View>
                ) : (
                  <AreaPicker
                    selected={area}
                    onSelect={(id) => { setArea(id); setAreaConfirmed(true); setExpandArea(false); }}
                  />
                )}
              </View>

              <Pressable
                style={[styles.attrToggle, showAttributes && styles.attrToggleActive]}
                onPress={() => setShowAttributes(!showAttributes)}>
                <Feather name="sliders" size={14} color={showAttributes ? T.brand : T.t3} />
                <Text style={[styles.attrToggleLabel, showAttributes && { color: T.brand }]}>
                  {showAttributes ? 'Hide details' : 'Priority, effort & deadline'}
                </Text>
                {!showAttributes && hasAttributes && (
                  <View style={styles.attrBadge}>
                    <Text style={styles.attrBadgeText}>{attributeSummary.length}</Text>
                  </View>
                )}
                <Feather name={showAttributes ? 'chevron-up' : 'chevron-down'} size={14} color={showAttributes ? T.brand : T.t3} />
              </Pressable>

              {showAttributes && (
                <View style={styles.attrSection}>
                  <Text style={styles.attrLabel}>PRIORITY</Text>
                  <View style={styles.attrRow}>
                    {PRIORITY_OPTIONS.map(p => {
                      const on = priority === p.id;
                      return (
                        <Pressable key={p.id} style={[styles.attrChip, on && {
                          backgroundColor: p.color + '12',
                          borderColor: p.color + '40',
                        }]} onPress={() => setPriority(p.id as Priority)}>
                          <Feather name={p.icon} size={11} color={on ? p.color : T.t3} />
                          <Text style={[styles.attrChipLabel, on && { color: p.color, fontWeight: '700' as const }]}>
                            {p.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.attrLabel, { marginTop: 10 }]}>EFFORT</Text>
                  <View style={styles.attrRow}>
                    {EFFORT_OPTIONS.map(e => {
                      const on = effort === e.id;
                      return (
                        <Pressable key={e.id} style={[styles.attrChip, on && {
                          backgroundColor: e.color + '12',
                          borderColor: e.color + '40',
                        }]} onPress={() => setEffort(e.id as Effort)}>
                          <Feather name={e.icon} size={11} color={on ? e.color : T.t3} />
                          <Text style={[styles.attrChipLabel, on && { color: e.color, fontWeight: '700' as const }]}>
                            {e.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.attrLabel, { marginTop: 10 }]}>DEADLINE</Text>
                  <TextInput
                    value={deadline}
                    onChangeText={setDeadline}
                    placeholder="e.g. 2026-03-15"
                    placeholderTextColor={T.t3}
                    style={styles.deadlineInput}
                    returnKeyType="done"
                  />
                </View>
              )}

              <Pressable
                onPress={() => runGenerate()}
                disabled={!title.trim() || aiLoading}
                style={[styles.aiBtn, !title.trim() && styles.aiBtnDisabled]}>
                <View style={[styles.aiBtnIcon, title.trim() ? styles.aiBtnIconActive : {}]}>
                  {aiLoading
                    ? <ActivityIndicator size="small" color="white" />
                    : <Feather name="star" size={14} color={title.trim() ? 'white' : T.t3} />
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.aiBtnTitle, { color: title.trim() ? T.brand : T.t3 }]}>
                    {aiLoading ? 'Generating tasks…' : steps.length ? '✨ Regenerate with AI' : '✨ Generate tasks with AI'}
                  </Text>
                  <Text style={styles.aiBtnSub}>
                    {aiLoading ? 'Claude is building your plan' : 'Claude suggests 5–7 concrete steps'}
                  </Text>
                </View>
              </Pressable>

              <View style={styles.stepsSection}>
                <Text style={styles.stepsSectionTitle}>
                  Tasks {steps.length > 0 && <Text style={{ fontWeight: '400' as const, color: T.t3 }}>({steps.length})</Text>}
                </Text>

                {steps.map((s, i) => (
                  <View key={s.id} style={styles.stepRow}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepTitle} numberOfLines={2}>{s.title}</Text>
                    <Pressable style={styles.stepRemove} onPress={() => removeStep(s.id)} hitSlop={6}>
                      <Feather name="x" size={9} color={T.red} />
                    </Pressable>
                  </View>
                ))}

                <View style={styles.addStepRow}>
                  <TextInput
                    ref={stepRef}
                    value={newStep}
                    onChangeText={setNewStep}
                    onSubmitEditing={addStep}
                    placeholder="Add a step manually…"
                    placeholderTextColor={T.t3}
                    style={styles.addStepInput}
                    returnKeyType="done"
                  />
                  <Pressable
                    style={[styles.addStepBtn, newStep.trim() ? styles.addStepBtnActive : null]}
                    onPress={addStep}>
                    <Feather name="plus" size={14} color={newStep.trim() ? 'white' : T.t3} />
                  </Pressable>
                </View>
              </View>

              <Pressable onPress={handleSave} disabled={!canSave} style={{ marginTop: S.sm }}>
                <LinearGradient
                  colors={canSave
                    ? (areaConf ? [areaConf.c, areaConf.c + 'BB'] : T.gradColors)
                    : [T.sep, T.sep]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.saveBtn}>
                  <Text style={[styles.saveBtnText, !canSave && { color: T.t3 }]}>
                    {!title.trim()   ? 'Name your project first'
                      : !area        ? 'Pick a life area to continue'
                      : steps.length ? `Create project · ${steps.length} step${steps.length !== 1 ? 's' : ''}`
                      :                'Create project'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 },
  overlay:   { flex: 1, justifyContent: 'flex-end' },
  backdrop:  { flex: 1, backgroundColor: 'rgba(10,8,22,0.44)' },
  sheet:     { backgroundColor: 'rgba(253,252,255,0.98)', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '93%' },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.08)' },

  savedState:   { alignItems: 'center', paddingVertical: 28, gap: 12 },
  savedIconBox: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  savedTitle:   { fontSize: F.lg, fontWeight: '800', color: T.text },
  savedSub:     { fontSize: F.sm, color: T.t3 },

  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 8 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: T.text, letterSpacing: -0.6 },
  sheetSub:   { fontSize: 12, color: T.t3, marginTop: 2 },
  closeBtn:   { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  titleRow:    { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 },
  emojiBox:    { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.05)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  titleInput:  { flex: 1, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'white', paddingHorizontal: 14, fontSize: 16, fontWeight: '600', color: T.text },

  descInput:   { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.09)', backgroundColor: 'white', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 14, color: T.text, marginBottom: 12 },

  emojiPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  emojiBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)', alignItems: 'center', justifyContent: 'center' },
  emojiBtnActive: { borderWidth: 2, borderColor: T.brand + '50', backgroundColor: T.brand + '08' },

  areaSection:      { marginBottom: 14 },
  areaRow:          { flexDirection: 'row', gap: 8, alignItems: 'center' },
  areaSelected:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, borderWidth: 1.5 },
  areaNameRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  areaSelectedName: { fontSize: 13, fontWeight: '700' },
  areaSelectedHint: { fontSize: 10, color: T.t3 },
  areaChangeBtn:    { padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.09)', backgroundColor: 'white' },
  areaChangeBtnText:{ fontSize: 12, fontWeight: '600', color: T.t2 },

  attrToggle:      { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', marginBottom: 14 },
  attrToggleActive:{ backgroundColor: T.brand + '06', borderColor: T.brand + '20' },
  attrToggleLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: T.t3 },
  attrBadge:       { width: 20, height: 20, borderRadius: 10, backgroundColor: T.brand + '15', alignItems: 'center', justifyContent: 'center' },
  attrBadgeText:   { fontSize: 10, fontWeight: '700', color: T.brand },

  attrSection:     { backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  attrLabel:       { fontSize: 10, fontWeight: '700', color: T.t3, letterSpacing: 0.5, marginBottom: 6 },
  attrRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  attrChip:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'rgba(0,0,0,0.03)' },
  attrChipLabel:   { fontSize: 12, fontWeight: '500', color: T.t3 },
  deadlineInput:   { padding: 10, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(0,0,0,0.09)', fontSize: 14, color: T.text, marginTop: 2 },

  aiBtn:         { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 16, backgroundColor: T.brand + '0C', borderWidth: 1.5, borderColor: T.brand + '22', marginBottom: 14 },
  aiBtnDisabled: { opacity: 0.5 },
  aiBtnIcon:     { width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  aiBtnIconActive: { backgroundColor: T.brand, ...shadow.sm },
  aiBtnTitle:    { fontSize: 13, fontWeight: '700' },
  aiBtnSub:      { fontSize: 11, color: T.t3, marginTop: 1 },

  stepsSection:      { marginBottom: 18 },
  stepsSectionTitle: { fontSize: 12, fontWeight: '700', color: T.t2, marginBottom: 10 },
  stepRow:           { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: T.brand + '05', borderWidth: 0.5, borderColor: T.brand + '12', marginBottom: 4 },
  stepNum:           { width: 22, height: 22, borderRadius: 7, backgroundColor: T.brand + '12', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumText:       { fontSize: 10, fontWeight: '700', color: T.brand },
  stepTitle:         { flex: 1, fontSize: 13, color: T.text },
  stepRemove:        { width: 22, height: 22, borderRadius: 11, backgroundColor: T.red + '10', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  addStepRow:    { flexDirection: 'row', gap: 8, marginTop: 4 },
  addStepInput:  { flex: 1, padding: 11, borderRadius: 14, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(0,0,0,0.09)', fontSize: 14, color: T.text },
  addStepBtn:    { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  addStepBtnActive: { backgroundColor: T.brand },

  saveBtn:     { borderRadius: 20, padding: 17, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: 'white', letterSpacing: -0.3 },
});
