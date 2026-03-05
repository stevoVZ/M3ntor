import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import Animated, {
  SlideInDown, SlideOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { T, S, F } from '../../constants/theme';
import { ITEM_AREAS } from '../../constants/config';
import { suggestArea, inferType } from '../../utils/nlp';
import { getItemHint } from '../../lib/ai';
import { createItem } from '../../utils/items';
import { useStore } from '../../lib/store';
import { AreaPicker } from './AreaPicker';

interface Props {
  onProject:  (text: string) => void;
  onJourney?: () => void;
  onClose:    () => void;
}

const TYPE_OPTIONS = [
  { id: 'action',  label: 'Action',  emoji: '✓',  color: T.green   },
  { id: 'habit',   label: 'Habit',   emoji: '🔄', color: T.orange  },
  { id: 'goal',    label: 'Goal',    emoji: '🎯', color: '#9B59B6' },
  { id: 'project', label: 'Project', emoji: '📁', color: T.brand   },
  { id: 'journey', label: 'Journey', emoji: '🧭', color: '#007AFF' },
] as const;

const PROMOS = [
  { text: 'Meditate every morning',  type: 'habit'   },
  { text: 'Run a 5K by June',        type: 'goal'    },
  { text: 'Redesign the website',    type: 'project' },
  { text: 'Call Mum this week',      type: 'action'  },
  { text: 'Read 12 books this year', type: 'goal'    },
  { text: 'Build a sleep routine',   type: 'habit'   },
];

const TOD_OPTIONS = [
  { id: 'morning',   label: 'AM',  icon: 'sun'   as const },
  { id: 'afternoon', label: 'PM',  icon: 'cloud' as const },
  { id: 'evening',   label: 'Eve', icon: 'moon'  as const },
];

const EFFORT_CONFIG: Record<string, { icon: 'zap' | 'clock'; label: string; color: string }> = {
  quick:  { icon: 'zap',   label: 'Quick win',      color: T.green  },
  medium: { icon: 'clock', label: 'Medium effort',   color: T.orange },
  deep:   { icon: 'zap',   label: 'Deep work',       color: T.brand  },
};

export function FabActionSheet({ onProject, onJourney, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { userId, addItem } = useStore();

  const [text, setText]                 = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [area, setArea]                 = useState<string | null>(null);
  const [tod, setTod]                   = useState<string | null>(null);
  const [aiHint, setAiHint]             = useState<{ why?: string; firstStep?: string; tip?: string; effort?: string } | null>(null);
  const [aiLoading, setAiLoading]       = useState(false);
  const [saved, setSaved]               = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  const inputRef    = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const inferredType = useMemo(() => inferType(text), [text]);
  const activeType   = selectedType ?? (text.trim() ? inferredType : null);
  const typeConf     = activeType ? TYPE_OPTIONS.find(t => t.id === activeType) : null;

  useEffect(() => {
    if (activeType === 'goal') return;
    const s = suggestArea(text);
    if (s && !area) setArea(s);
  }, [text]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim() || text.trim().length < 5) { setAiHint(null); return; }

    debounceRef.current = setTimeout(async () => {
      setAiLoading(true);
      const hint = await getItemHint(text, activeType ?? 'action');
      setAiHint(hint);
      setAiLoading(false);
    }, 900);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [text, selectedType]);

  const areaConf = area ? ITEM_AREAS[area] : null;
  const canSave  = text.trim().length > 0 && (activeType !== 'goal' || !!area);

  function handleTypeSelect(id: string) {
    if (id === 'journey')                    { onJourney?.(); return; }
    if (id === 'project' && text.trim())     { onProject(text); return; }
    setSelectedType(prev => prev === id ? null : id);
    setAiHint(null);
  }

  function handleSave() {
    if (!canSave || !userId) return;
    const type = activeType ?? 'action';
    if (type === 'project') { onProject(text); return; }
    if (type === 'journey') { onJourney?.(); return; }

    const item = createItem(userId, {
      title:             text.trim(),
      area:              area ?? suggestArea(text) ?? 'life',
      status:            type === 'goal' ? 'someday' : 'active',
      emoji:             type === 'habit' ? '🔄' : type === 'goal' ? '🎯' : '✓',
      habit_time_of_day: (tod as 'morning' | 'afternoon' | 'evening') ?? undefined,
      recurrence:        type === 'habit' ? { type: 'daily' } : undefined,
    });

    addItem(item);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 850);
  }

  const saveBtnLabel = !text.trim()                     ? 'Type something to start'
    : activeType === 'goal' && !area                    ? 'Pick a life area first'
    : activeType === 'project'                          ? 'Set up project'
    : activeType === 'habit'                            ? 'Start this habit'
    : activeType === 'goal'                             ? 'Save to goals'
    :                                                     'Add it';

  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={styles.backdrop} />
        </Pressable>

        <Animated.View
          entering={SlideInDown.springify().damping(32).stiffness(360)}
          exiting={SlideOutDown.springify().damping(28)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, Platform.OS === 'web' ? 34 : 28) }]}>

          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {saved ? (
            <View style={styles.savedState}>
              <View style={[styles.savedIcon, { backgroundColor: (typeConf?.color ?? T.green) + '14' }]}>
                <Feather name="check" size={26} color={typeConf?.color ?? T.green} />
              </View>
              <Text style={styles.savedTitle}>Added!</Text>
              <Text style={styles.savedSub}>"{text}"</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.title}>What's next?</Text>
                  <Text style={styles.subtitle}>Type your idea — AI shapes it as you write</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
                  <Feather name="x" size={14} color={T.t3} />
                </Pressable>
              </View>

              <View style={[styles.inputWrap, {
                borderColor: typeConf ? typeConf.color + '35' : 'rgba(0,0,0,0.09)',
                backgroundColor: typeConf ? typeConf.color + '04' : 'white',
              }]}>
                <TextInput
                  ref={inputRef}
                  value={text}
                  onChangeText={(v) => { setText(v); setAiHint(null); }}
                  onSubmitEditing={handleSave}
                  placeholder="e.g. Meditate every morning…"
                  placeholderTextColor={T.t3}
                  style={[styles.input, { paddingRight: typeConf ? 96 : 14 }]}
                  returnKeyType="done"
                />
                {typeConf && (
                  <View style={[styles.typeBadge, { backgroundColor: typeConf.color + '14' }]}>
                    <Text style={styles.typeBadgeEmoji}>{typeConf.emoji}</Text>
                    <Text style={[styles.typeBadgeLabel, { color: typeConf.color }]}>{typeConf.label}</Text>
                  </View>
                )}
              </View>

              <View style={styles.hintArea}>
                {aiLoading && (
                  <View style={styles.thinkingRow}>
                    <View style={styles.thinkingIconBox}>
                      <ActivityIndicator size="small" color={T.brand} />
                    </View>
                    <View>
                      <Text style={styles.thinkingLine1}>AI is thinking…</Text>
                      <Text style={styles.thinkingLine2}>Getting a personalised insight</Text>
                    </View>
                  </View>
                )}
                {!aiLoading && aiHint && (aiHint.why || aiHint.firstStep || aiHint.tip || aiHint.effort) && (
                  <View style={[styles.hintCard, {
                    backgroundColor: (typeConf?.color ?? T.brand) + '09',
                    borderColor:     (typeConf?.color ?? T.brand) + '1A',
                  }]}>
                    <Text style={styles.hintStar}>✨</Text>
                    <View style={{ flex: 1 }}>
                      {aiHint.why && (
                        <Text style={styles.hintWhy}>{aiHint.why}</Text>
                      )}
                      {(aiHint.firstStep || aiHint.tip) && (
                        <View style={styles.hintDetail}>
                          <Text style={[styles.hintDetailLabel, { color: typeConf?.color ?? T.brand }]}>
                            {aiHint.firstStep ? 'Start →' : 'Tip:'}
                          </Text>
                          <Text style={styles.hintDetailText}>
                            {aiHint.firstStep ?? aiHint.tip}
                          </Text>
                        </View>
                      )}
                      {aiHint.effort && EFFORT_CONFIG[aiHint.effort] && (
                        <View style={[styles.hintDetail, { marginTop: 4 }]}>
                          <Feather
                            name={EFFORT_CONFIG[aiHint.effort].icon}
                            size={11}
                            color={EFFORT_CONFIG[aiHint.effort].color}
                          />
                          <Text style={[styles.hintDetailLabel, { color: EFFORT_CONFIG[aiHint.effort].color }]}>
                            {EFFORT_CONFIG[aiHint.effort].label}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
                {!aiLoading && !aiHint && !text.trim() && (
                  <View style={styles.promoRow}>
                    {PROMOS.map(p => (
                      <Pressable key={p.text} style={styles.promoChip}
                        onPress={() => { setText(p.text); setSelectedType(p.type); }}>
                        <Text style={styles.promoChipText}>{p.text}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.typeRow}>
                {TYPE_OPTIONS.map(t => {
                  const on = selectedType === t.id || (!selectedType && inferredType === t.id && !!text.trim());
                  return (
                    <Pressable key={t.id} style={[styles.typeChip, on && {
                      backgroundColor: t.color + '12',
                      borderColor:     t.color + '40',
                    }]} onPress={() => handleTypeSelect(t.id)}>
                      <Text style={styles.typeChipEmoji}>{t.emoji}</Text>
                      <Text style={[styles.typeChipLabel, on && { color: t.color, fontWeight: '700' as const }]}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {text.trim() && activeType !== 'project' && activeType !== 'journey' && (
                <View style={styles.extrasRow}>
                  {areaConf ? (
                    <Pressable style={[styles.extraChip, { backgroundColor: areaConf.c + '10', borderColor: areaConf.c + '28' }]}
                      onPress={() => setShowAreaPicker(!showAreaPicker)}>
                      <Text>{areaConf.e}</Text>
                      <Text style={[styles.extraChipLabel, { color: areaConf.c }]}>{areaConf.n.split(' ')[0]}</Text>
                      <Feather name="chevron-down" size={10} color={areaConf.c} />
                    </Pressable>
                  ) : (
                    <Pressable style={styles.extraChipEmpty} onPress={() => setShowAreaPicker(true)}>
                      <Text style={styles.extraChipEmptyText}>＋ area</Text>
                    </Pressable>
                  )}
                  {activeType !== 'goal' && TOD_OPTIONS.map(o => {
                    const on = tod === o.id;
                    return (
                      <Pressable key={o.id} style={[styles.extraChip, on && {
                        backgroundColor: (typeConf?.color ?? T.brand) + '10',
                        borderColor:     (typeConf?.color ?? T.brand) + '30',
                      }]} onPress={() => setTod(prev => prev === o.id ? null : o.id)}>
                        <Feather name={o.icon} size={12} color={on ? (typeConf?.color ?? T.brand) : T.t3} />
                        <Text style={[styles.extraChipLabel, on && { color: typeConf?.color ?? T.brand, fontWeight: '700' as const }]}>
                          {o.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {showAreaPicker && (
                <AreaPicker
                  selected={area}
                  onSelect={(id) => { setArea(id); setShowAreaPicker(false); }}
                />
              )}

              {activeType === 'goal' && !area && text.trim() && (
                <AreaPicker
                  selected={area}
                  onSelect={setArea}
                  label="Which area of your life?"
                  required
                />
              )}

              <Pressable onPress={handleSave} disabled={!canSave} style={{ marginTop: S.md }}>
                <LinearGradient
                  colors={canSave ? (typeConf ? [typeConf.color, typeConf.color + 'BB'] : T.gradColors) : [T.sep, T.sep]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.saveBtn}>
                  <View style={styles.saveBtnInner}>
                    {canSave && <Feather name="chevron-right" size={16} color="white" />}
                    <Text style={[styles.saveBtnText, !canSave && { color: T.t3 }]}>{saveBtnLabel}</Text>
                  </View>
                </LinearGradient>
              </Pressable>

              <Pressable onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:        { flex: 1, justifyContent: 'flex-end' },
  backdrop:       { flex: 1, backgroundColor: 'rgba(10,8,22,0.52)' },
  sheet:          { backgroundColor: 'rgba(253,252,255,0.98)', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 0, maxHeight: '92%' },
  handleRow:      { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle:         { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.08)' },

  savedState:     { alignItems: 'center', paddingVertical: 32, gap: 10 },
  savedIcon:      { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  savedTitle:     { fontSize: F.lg, fontWeight: '800', color: T.text },
  savedSub:       { fontSize: F.sm, color: T.t3, textAlign: 'center' },

  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 10, marginBottom: 14 },
  title:          { fontSize: 20, fontWeight: '800', color: T.text, letterSpacing: -0.6 },
  subtitle:       { fontSize: 12, color: T.t3, marginTop: 2 },
  closeBtn:       { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },

  inputWrap:      { borderRadius: 18, borderWidth: 2, marginBottom: 10, overflow: 'hidden' },
  input:          { fontSize: 16, color: T.text, padding: 14, fontWeight: '400' },
  typeBadge:      { position: 'absolute', right: 12, top: '50%', marginTop: -14, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  typeBadgeEmoji: { fontSize: 13 },
  typeBadgeLabel: { fontSize: 11, fontWeight: '700' },

  hintArea:       { minHeight: 40, marginBottom: 12 },
  thinkingRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, paddingHorizontal: 14, borderRadius: 14, backgroundColor: T.brand + '0A', borderWidth: 1, borderColor: T.brand + '18' },
  thinkingIconBox:{ width: 28, height: 28, borderRadius: 9, backgroundColor: T.brand + '12', alignItems: 'center', justifyContent: 'center' },
  thinkingLine1:  { fontSize: 13, fontWeight: '600', color: T.brand },
  thinkingLine2:  { fontSize: 11, color: T.t3, marginTop: 1 },
  hintCard:       { flexDirection: 'row', gap: 8, padding: 11, borderRadius: 14, borderWidth: 1 },
  hintStar:       { fontSize: 14, marginTop: 1 },
  hintWhy:        { fontSize: 13, color: T.t2, lineHeight: 19, fontStyle: 'italic', marginBottom: 6 },
  hintDetail:     { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.72)', padding: 6, borderRadius: 9 },
  hintDetailLabel:{ fontSize: 11, fontWeight: '700' },
  hintDetailText: { fontSize: 12, color: T.text, flex: 1, lineHeight: 16 },
  promoRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  promoChip:      { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(108,92,231,0.06)', borderWidth: 1, borderColor: 'rgba(108,92,231,0.13)' },
  promoChipText:  { fontSize: 12, color: T.t2 },

  typeRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 12 },
  typeChip:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'rgba(0,0,0,0.03)' },
  typeChipEmoji:  { fontSize: 14 },
  typeChipLabel:  { fontSize: 12, fontWeight: '500', color: T.t3 },

  extrasRow:      { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14, flexWrap: 'wrap' },
  extraChip:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  extraChipLabel: { fontSize: 12, color: T.t3 },
  extraChipEmpty: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  extraChipEmptyText: { fontSize: 12, color: T.t3 },

  saveBtn:        { borderRadius: 20, padding: 17, alignItems: 'center', justifyContent: 'center' },
  saveBtnInner:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  saveBtnText:    { fontSize: 16, fontWeight: '700', color: 'white', letterSpacing: -0.3 },
  cancelBtn:      { padding: 12, alignItems: 'center', marginTop: 6 },
  cancelText:     { fontSize: 14, fontWeight: '600', color: T.t3 },
});
