import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { T, S, F, R, shadow } from '../../constants/theme';
import { ITEM_AREAS } from '../../constants/config';
import { suggestArea } from '../../utils/nlp';
import { generateProjectTasks } from '../../lib/ai';
import { createItem, createStep } from '../../utils/items';
import { useStore } from '../../lib/store';
import { upsertStep } from '../../lib/supabase';

const EMOJIS = ['📁','🏗️','💡','🎯','🚀','📊','🔧','🎨','📝','🏃','💪','🌱','🏠','✈️','💰','📚'];

interface Props {
  prefillText?: string;
  onClose: () => void;
}

export function ProjectAddSheet({ prefillText = '', onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { userId, addItem } = useStore();

  const [title, setTitle]           = useState(prefillText);
  const [emoji, setEmoji]           = useState('📁');
  const [area, setArea]             = useState<string | null>(null);
  const [areaConfirmed, setAreaConfirmed] = useState(false);
  const [expandArea, setExpandArea] = useState(false);
  const [steps, setSteps]           = useState<Array<{ id: string; title: string }>>([]);
  const [newStep, setNewStep]       = useState('');
  const [aiLoading, setAiLoading]   = useState(false);
  const [autoRan, setAutoRan]       = useState(false);
  const [saved, setSaved]           = useState(false);

  const inputRef = useRef<TextInput>(null);
  const stepRef  = useRef<TextInput>(null);

  // NLP area from title
  useEffect(() => {
    if (title.length >= 3 && !areaConfirmed) {
      const s = suggestArea(title);
      if (s) setArea(s);
    }
  }, [title]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  // Auto-generate if opened with prefill
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
    if (!canSave || !userId) return;

    const item = createItem(userId, {
      title: title.trim(),
      area:  area!,
      emoji,
      status: 'active',
    });

    // Attach steps to item (for local state)
    const fullSteps = steps.map((s, i) => createStep(item.id, {
      title:      s.title,
      sort_order: i,
    }));
    item.steps = fullSteps;

    addItem(item);

    // Persist steps to Supabase in background
    fullSteps.forEach(step => {
      upsertStep(step as unknown as Record<string, unknown>).catch(console.error);
    });

    setSaved(true);
    setTimeout(() => onClose(), 1100);
  }

  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={styles.backdrop} />
        </Pressable>

        <Animated.View
          entering={SlideInDown.springify().damping(30).stiffness(320)}
          exiting={SlideOutDown.springify().damping(28)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>

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
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.sheetTitle}>New Project</Text>
                  <Text style={styles.sheetSub}>A plan with steps and a finish line</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={onClose}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </Pressable>
              </View>

              {/* Emoji + title */}
              <View style={styles.titleRow}>
                <View style={[styles.emojiBox, areaConf && { backgroundColor: areaConf.c + '12', borderColor: areaConf.c + '20' }]}>
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
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

              {/* Emoji picker */}
              <View style={styles.emojiPicker}>
                {EMOJIS.map(e => (
                  <Pressable key={e} style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                    onPress={() => setEmoji(e)}>
                    <Text style={{ fontSize: 18 }}>{e}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Area */}
              <View style={styles.areaSection}>
                {area && !expandArea ? (
                  <View style={styles.areaRow}>
                    <View style={[styles.areaSelected, { backgroundColor: areaConf?.c + '10', borderColor: areaConf?.c + '25' }]}>
                      <Text style={{ fontSize: 20 }}>{areaConf?.e}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.areaSelectedName, { color: areaConf?.c }]}>{areaConf?.n}</Text>
                        <Text style={styles.areaSelectedHint}>Suggested from title</Text>
                      </View>
                    </View>
                    <Pressable style={styles.areaChangeBtn} onPress={() => setExpandArea(true)}>
                      <Text style={styles.areaChangeBtnText}>Change</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.areaPicker}>
                    {Object.entries(ITEM_AREAS).map(([id, a]) => (
                      <Pressable key={id}
                        style={[styles.areaPickerBtn, area === id && { backgroundColor: a.c + '12', borderColor: a.c }]}
                        onPress={() => { setArea(id); setAreaConfirmed(true); setExpandArea(false); }}>
                        <Text style={{ fontSize: 18 }}>{a.e}</Text>
                        <Text style={[styles.areaPickerLabel, area === id && { color: a.c, fontWeight: '700' }]}>
                          {a.n.split(' ')[0]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* AI Generate button */}
              <Pressable
                onPress={() => runGenerate()}
                disabled={!title.trim() || aiLoading}
                style={[styles.aiBtn, !title.trim() && styles.aiBtnDisabled]}>
                <View style={[styles.aiBtnIcon, title.trim() ? styles.aiBtnIconActive : {}]}>
                  {aiLoading
                    ? <ActivityIndicator size="small" color="white" />
                    : <Text style={{ fontSize: 14 }}>⭐</Text>
                  }
                </View>
                <View>
                  <Text style={[styles.aiBtnTitle, { color: title.trim() ? T.brand : T.t3 }]}>
                    {aiLoading ? 'Generating tasks…' : steps.length ? '✨ Regenerate with AI' : '✨ Generate tasks with AI'}
                  </Text>
                  <Text style={styles.aiBtnSub}>
                    {aiLoading ? 'Claude is building your plan' : 'Claude suggests 5–7 concrete steps'}
                  </Text>
                </View>
              </Pressable>

              {/* Steps list */}
              <View style={styles.stepsSection}>
                <Text style={styles.stepsSectionTitle}>
                  Tasks {steps.length > 0 && <Text style={{ fontWeight: '400', color: T.t3 }}>({steps.length})</Text>}
                </Text>

                {steps.map((s, i) => (
                  <View key={s.id} style={styles.stepRow}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepTitle} numberOfLines={2}>{s.title}</Text>
                    <Pressable style={styles.stepRemove} onPress={() => removeStep(s.id)}>
                      <Text style={{ color: T.red, fontSize: 14 }}>✕</Text>
                    </Pressable>
                  </View>
                ))}

                {/* Manual add */}
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
                    style={[styles.addStepBtn, newStep.trim() && styles.addStepBtnActive]}
                    onPress={addStep}>
                    <Text style={[styles.addStepBtnText, newStep.trim() && { color: 'white' }]}>+</Text>
                  </Pressable>
                </View>
              </View>

              {/* Save */}
              <Pressable onPress={handleSave} disabled={!canSave} style={{ marginTop: S.sm }}>
                <LinearGradient
                  colors={canSave
                    ? (areaConf ? [areaConf.c, areaConf.c + 'BB'] : T.gradColors)
                    : ['#E8E4F4', '#E8E4F4']}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: 'flex-end' },
  backdrop:  { flex: 1, backgroundColor: 'rgba(10,8,22,0.44)' },
  sheet:     { backgroundColor: 'rgba(253,252,255,0.98)', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, maxHeight: '93%' },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.08)' },

  savedState:   { alignItems: 'center', paddingVertical: 28, gap: 12 },
  savedIconBox: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  savedTitle:   { fontSize: F.lg, fontWeight: '800', color: T.text },
  savedSub:     { fontSize: F.sm, color: T.t3 },

  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: T.text, letterSpacing: -0.6 },
  sheetSub:   { fontSize: 12, color: T.t3, marginTop: 2 },
  closeBtn:   { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 13, color: T.t3 },

  titleRow:    { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
  emojiBox:    { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.05)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  titleInput:  { flex: 1, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'white', paddingHorizontal: 14, fontSize: 16, fontWeight: '600', color: T.text },

  emojiPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  emojiBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)', alignItems: 'center', justifyContent: 'center' },
  emojiBtnActive: { borderWidth: 2, borderColor: T.brand + '50', backgroundColor: T.brand + '08' },

  areaSection:      { marginBottom: 14 },
  areaRow:          { flexDirection: 'row', gap: 8, alignItems: 'center' },
  areaSelected:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, borderWidth: 1.5 },
  areaSelectedName: { fontSize: 13, fontWeight: '700' },
  areaSelectedHint: { fontSize: 10, color: T.t3 },
  areaChangeBtn:    { padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.09)', backgroundColor: 'white' },
  areaChangeBtnText:{ fontSize: 12, fontWeight: '600', color: T.t2 },
  areaPicker:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  areaPickerBtn:    { width: '22%', alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: T.sep, backgroundColor: 'white', gap: 4 },
  areaPickerLabel:  { fontSize: 9, color: T.t3, textAlign: 'center' },

  aiBtn:         { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 16, backgroundColor: T.brand + '0C', borderWidth: 1.5, borderColor: T.brand + '22', marginBottom: 14 },
  aiBtnDisabled: { opacity: 0.5 },
  aiBtnIcon:     { width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  aiBtnIconActive: { backgroundColor: T.brand, ...shadow.sm },
  aiBtnTitle:    { fontSize: 13, fontWeight: '700' },
  aiBtnSub:      { fontSize: 11, color: T.t3, marginTop: 1 },

  stepsSection:      { marginBottom: 18 },
  stepsSectionTitle: { fontSize: 12, fontWeight: '700', color: T.t2, marginBottom: 10 },
  stepRow:           { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: T.brand + '05', borderWidth: 0.5, borderColor: T.brand + '12', marginBottom: 4 },
  stepNum:           { width: 22, height: 22, borderRadius: 7, backgroundColor: T.brand + '12', alignItems: 'center', justifyContent: 'center' },
  stepNumText:       { fontSize: 10, fontWeight: '700', color: T.brand },
  stepTitle:         { flex: 1, fontSize: 13, color: T.text },
  stepRemove:        { width: 22, height: 22, borderRadius: 11, backgroundColor: T.red + '10', alignItems: 'center', justifyContent: 'center' },

  addStepRow:    { flexDirection: 'row', gap: 8, marginTop: 4 },
  addStepInput:  { flex: 1, padding: 11, borderRadius: 14, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(0,0,0,0.09)', fontSize: 14, color: T.text },
  addStepBtn:    { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  addStepBtnActive: { backgroundColor: T.brand },
  addStepBtnText:{ fontSize: 20, color: T.t3, fontWeight: '300' },

  saveBtn:     { borderRadius: 20, padding: 17, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: 'white', letterSpacing: -0.3 },
});
