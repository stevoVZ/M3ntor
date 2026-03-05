import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  Platform, ActivityIndicator, KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  SlideInDown, SlideOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { T, S, F } from '../../constants/theme';
import { ITEM_AREAS } from '../../constants/config';
import type { Priority, Effort } from '../../types';
import { suggestArea, inferType } from '../../utils/nlp';
import { getItemHint, generateGoal, generateProjectTasks } from '../../lib/ai';
import { createItem, createStep } from '../../utils/items';
import { useStore } from '../../lib/store';
import { getCountryByCode } from '../../constants/countries';
import { AreaPicker } from './AreaPicker';

interface Props {
  onProject:  (text: string) => void;
  onClose:    () => void;
}

const TYPE_GROUPS = [
  {
    label: 'Quick',
    items: [
      { id: 'action',  label: 'Action',  sub: 'Just do it',        icon: 'check'  as const, color: T.green  },
      { id: 'habit',   label: 'Habit',   sub: 'Build a routine',   icon: 'repeat' as const, color: T.orange },
    ],
  },
  {
    label: 'Planned',
    items: [
      { id: 'goal',    label: 'Goal',    sub: 'Set a target',      icon: 'target' as const, color: '#9B59B6' },
      { id: 'project', label: 'Project', sub: 'Break it down',     icon: 'layers' as const, color: T.brand  },
    ],
  },
] as const;

const ALL_TYPES = TYPE_GROUPS.flatMap(g => g.items);

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

const EFFORT_CONFIG: Record<string, { icon: 'zap' | 'clock'; label: string; color: string }> = {
  quick:  { icon: 'zap',   label: 'Quick win',      color: T.green  },
  medium: { icon: 'clock', label: 'Medium effort',   color: T.orange },
  deep:   { icon: 'zap',   label: 'Deep work',       color: T.brand  },
};

export function FabActionSheet({ onProject, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { userId, addItem, profile } = useStore();
  const effectiveUserId = userId ?? 'guest';
  const countryName = profile?.country ? getCountryByCode(profile.country)?.name : undefined;

  const [text, setText]                 = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [area, setArea]                 = useState<string | null>(null);
  const [tod, setTod]                   = useState<string | null>(null);
  const [priority, setPriority]         = useState<Priority>('normal');
  const [effort, setEffort]             = useState<Effort>('medium');
  const [deadline, setDeadline]         = useState('');
  const [showExtras, setShowExtras]     = useState(false);
  const [aiHint, setAiHint]             = useState<{ why?: string; firstStep?: string; tip?: string; effort?: string; suggestedType?: string; typeReason?: string } | null>(null);
  const [aiLoading, setAiLoading]       = useState(false);
  const [saved, setSaved]               = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [goalSuggestion, setGoalSuggestion] = useState<{ why?: string; journeyHints?: string[]; firstSteps?: string[] } | null>(null);
  const [goalEnrichLoading, setGoalEnrichLoading] = useState(false);
  const [breakdownSteps, setBreakdownSteps] = useState<{ id: string; text: string }[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [pinnedAiType, setPinnedAiType] = useState<string | null>(null);
  const [showOtherApproaches, setShowOtherApproaches] = useState(false);

  const inputRef    = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCompact = screenWidth < 380;
  const horizontalPad = isCompact ? 14 : 18;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const inferredType = useMemo(() => inferType(text), [text]);
  const validTypes = new Set(['action', 'habit', 'goal', 'project']);
  const safePinnedType = pinnedAiType && validTypes.has(pinnedAiType) ? pinnedAiType : null;
  const activeType   = selectedType ?? (safePinnedType && text.trim() ? safePinnedType : (text.trim() ? inferredType : null));
  const typeConf     = activeType ? ALL_TYPES.find(t => t.id === activeType) : null;

  useEffect(() => {
    if (activeType === 'goal') return;
    const s = suggestArea(text);
    if (s && !area) setArea(s);
  }, [text]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim() || text.trim().length < 5) { setAiHint(null); setShowOtherApproaches(false); return; }

    debounceRef.current = setTimeout(async () => {
      setAiLoading(true);
      const hint = await getItemHint(text, activeType ?? 'action', countryName);
      setAiHint(hint);
      if (hint.suggestedType && !selectedType) {
        setPinnedAiType(hint.suggestedType);
        setShowOtherApproaches(false);
        if (hint.suggestedType === 'project' && breakdownSteps.length === 0) {
          setBreakdownLoading(true);
          const result = await generateProjectTasks(text, [], countryName);
          if (result.tasks.length > 0) {
            setBreakdownSteps(result.tasks.map(t => ({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              text: t,
            })));
          }
          setBreakdownLoading(false);
        }
      }
      setAiLoading(false);
    }, 900);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [text, selectedType]);

  const areaConf = area ? ITEM_AREAS[area] : null;
  const canSave  = text.trim().length > 0 && (activeType !== 'goal' || !!area);

  function handleTypeSelect(id: string) {
    const newVal = selectedType === id ? null : id;
    setSelectedType(newVal);
    if (newVal === 'project' && text.trim() && breakdownSteps.length === 0) {
      setBreakdownLoading(true);
      generateProjectTasks(text, [], countryName).then(result => {
        if (result.tasks.length > 0) {
          setBreakdownSteps(result.tasks.map(t => ({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            text: t,
          })));
        }
        setBreakdownLoading(false);
      });
    }
  }

  async function handleSave() {
    if (!canSave) return;
    const type = activeType ?? 'action';

    let enrichedEmoji = type === 'habit' ? '🔄' : type === 'goal' ? '🎯' : type === 'project' ? '📁' : '✓';
    let enrichedArea = area ?? suggestArea(text) ?? 'life';
    let description: string | undefined;
    let linkedJourneys: string[] | undefined;

    if (type === 'goal') {
      setGoalEnrichLoading(true);
      try {
        const suggestion = await generateGoal(text.trim(), countryName);
        if (suggestion.emoji) enrichedEmoji = suggestion.emoji;
        if (suggestion.area) enrichedArea = suggestion.area;
        if (suggestion.why) description = suggestion.why;
        if (suggestion.journeyHints?.length) linkedJourneys = suggestion.journeyHints;
        setGoalSuggestion({
          why: suggestion.why,
          journeyHints: suggestion.journeyHints,
          firstSteps: suggestion.firstSteps,
        });
      } catch {}
      setGoalEnrichLoading(false);
    }

    const itemId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const filteredSteps = breakdownSteps.filter(s => s.text.trim());
    const steps = type === 'project' && filteredSteps.length > 0
      ? filteredSteps.map((s, idx) => createStep(itemId, { title: s.text.trim(), sort_order: idx }))
      : undefined;

    const item = createItem(effectiveUserId, {
      id:                itemId,
      title:             text.trim(),
      area:              enrichedArea,
      status:            type === 'goal' ? 'someday' : 'active',
      emoji:             enrichedEmoji,
      description,
      habit_time_of_day: (tod as 'morning' | 'afternoon' | 'evening') ?? undefined,
      recurrence:        type === 'habit' ? { type: 'daily' } : undefined,
      priority,
      effort,
      deadline:          deadline.trim() || undefined,
      linked_journeys:   linkedJourneys,
      steps,
    });

    addItem(item);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 850);
  }

  const validStepCount = breakdownSteps.filter(s => s.text.trim()).length;
  const saveBtnLabel = !text.trim()                     ? 'Type something to start'
    : activeType === 'goal' && !area                    ? 'Pick a life area first'
    : activeType === 'project' && validStepCount > 0    ? `Create project with ${validStepCount} steps`
    : activeType === 'project'                          ? 'Create project'
    : activeType === 'habit'                            ? 'Start this habit'
    : activeType === 'goal'                             ? 'Save to goals'
    :                                                     'Add it';

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
          entering={SlideInDown.springify().damping(32).stiffness(360)}
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
              <View style={[styles.savedIcon, { backgroundColor: (typeConf?.color ?? T.green) + '14' }]}>
                <Feather name="check" size={26} color={typeConf?.color ?? T.green} />
              </View>
              <Text style={styles.savedTitle}>Added!</Text>
              <Text style={styles.savedSub}>"{text}"</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, isCompact && { fontSize: 18 }]}>What's next?</Text>
                  <Text style={styles.subtitle}>Type your idea — M3NTOR shapes it as you write</Text>
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
                    <Feather name={typeConf.icon} size={12} color={typeConf.color} />
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
                    <View style={{ flex: 1 }}>
                      <Text style={styles.thinkingLine1}>M3NTOR is thinking…</Text>
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

              <View style={styles.approachSection}>
                <Text style={styles.approachLabel}>Pick your approach</Text>

                {aiLoading && text.trim().length >= 5 ? (
                  <View style={styles.analyzingRow}>
                    <ActivityIndicator size="small" color={T.brand} />
                    <Text style={styles.analyzingText}>M3NTOR is analyzing…</Text>
                  </View>
                ) : safePinnedType && aiHint?.typeReason ? (
                  <View>
                    {(() => {
                      const rec = ALL_TYPES.find(t => t.id === safePinnedType)!;
                      const isRecActive = activeType === rec.id;
                      const userOverrode = !!selectedType && selectedType !== safePinnedType;
                      return (
                        <>
                          <Pressable
                            style={[styles.recCard, {
                              backgroundColor: isRecActive ? rec.color + '10' : 'rgba(0,0,0,0.025)',
                              borderColor: isRecActive ? rec.color + '40' : 'rgba(0,0,0,0.07)',
                            }]}
                            onPress={() => handleTypeSelect(rec.id)}
                          >
                            <View style={[styles.recIconBox, { backgroundColor: rec.color + '14' }]}>
                              <Feather name={rec.icon} size={18} color={rec.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={styles.recTitleRow}>
                                <Text style={[styles.recLabel, isRecActive && { color: rec.color }]}>
                                  {rec.label}
                                </Text>
                                {userOverrode && (
                                  <View style={styles.m3ntorBadge}>
                                    <Feather name="cpu" size={9} color={T.brand} />
                                    <Text style={styles.m3ntorBadgeText}>M3NTOR pick</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[styles.recReason, isRecActive && { color: rec.color + 'CC' }]}>
                                {aiHint.typeReason}
                              </Text>
                            </View>
                            {isRecActive && <Feather name="check-circle" size={16} color={rec.color} />}
                          </Pressable>

                          <Pressable
                            style={styles.otherToggle}
                            onPress={() => setShowOtherApproaches(p => !p)}
                          >
                            <Text style={styles.otherToggleText}>Other approaches</Text>
                            <Feather
                              name={showOtherApproaches ? 'chevron-up' : 'chevron-down'}
                              size={14}
                              color={T.t3}
                            />
                          </Pressable>

                          {showOtherApproaches && (
                            <View style={styles.otherCards}>
                              {ALL_TYPES.filter(t => t.id !== safePinnedType).map(t => {
                                const on = activeType === t.id;
                                return (
                                  <Pressable key={t.id} style={[styles.typeCard, on && {
                                    backgroundColor: t.color + '10',
                                    borderColor: t.color + '40',
                                  }]} onPress={() => handleTypeSelect(t.id)}>
                                    <Feather name={t.icon} size={16} color={on ? t.color : T.t3} />
                                    <View>
                                      <Text style={[styles.typeCardLabel, on && { color: t.color }]}>
                                        {t.label}
                                      </Text>
                                      <Text style={[styles.typeCardSub, on && { color: t.color + 'AA' }]}>
                                        {t.sub}
                                      </Text>
                                    </View>
                                  </Pressable>
                                );
                              })}
                            </View>
                          )}
                        </>
                      );
                    })()}
                  </View>
                ) : (
                  <>
                    {TYPE_GROUPS.map(group => (
                      <View key={group.label} style={styles.typeGroupRow}>
                        <Text style={styles.typeGroupLabel}>{group.label}</Text>
                        <View style={styles.typeGroupCards}>
                          {group.items.map(t => {
                            const on = activeType === t.id && !!text.trim();
                            return (
                              <Pressable key={t.id} style={[styles.typeCard, on && {
                                backgroundColor: t.color + '10',
                                borderColor:     t.color + '40',
                              }]} onPress={() => handleTypeSelect(t.id)}>
                                <Feather name={t.icon} size={16} color={on ? t.color : T.t3} />
                                <View>
                                  <Text style={[styles.typeCardLabel, on && { color: t.color }]}>
                                    {t.label}
                                  </Text>
                                  <Text style={[styles.typeCardSub, on && { color: t.color + 'AA' }]}>
                                    {t.sub}
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </View>

              {activeType === 'project' && (breakdownSteps.length > 0 || breakdownLoading) && (
                <View style={styles.breakdownSection}>
                  <View style={styles.breakdownHeader}>
                    <Feather name="list" size={13} color={T.brand} />
                    <Text style={styles.breakdownTitle}>Steps</Text>
                    {breakdownLoading && <ActivityIndicator size="small" color={T.brand} />}
                  </View>
                  {breakdownSteps.map((step) => (
                    <View key={step.id} style={styles.breakdownRow}>
                      <View style={styles.breakdownDot} />
                      {editingStepId === step.id ? (
                        <TextInput
                          style={styles.breakdownStepInput}
                          value={step.text}
                          autoFocus
                          onChangeText={(v) => setBreakdownSteps(prev =>
                            prev.map(s => s.id === step.id ? { ...s, text: v } : s)
                          )}
                          onBlur={() => setEditingStepId(null)}
                          onSubmitEditing={() => setEditingStepId(null)}
                          returnKeyType="done"
                        />
                      ) : (
                        <Pressable style={{ flex: 1 }} onPress={() => setEditingStepId(step.id)}>
                          <Text style={styles.breakdownStepText} numberOfLines={2}>{step.text}</Text>
                        </Pressable>
                      )}
                      <Pressable
                        hitSlop={8}
                        onPress={() => setBreakdownSteps(prev => prev.filter(s => s.id !== step.id))}
                      >
                        <Feather name="x" size={13} color={T.t3} />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable
                    style={styles.addStepRow}
                    onPress={() => {
                      const newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                      setBreakdownSteps(prev => [...prev, { id: newId, text: '' }]);
                      setEditingStepId(newId);
                    }}
                  >
                    <Feather name="plus" size={13} color={T.brand} />
                    <Text style={styles.addStepText}>Add step</Text>
                  </Pressable>
                </View>
              )}

              {text.trim() && activeType !== 'project' && (
                <>
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

                    <Pressable
                      style={[styles.extraChip, showExtras && {
                        backgroundColor: T.brand + '10',
                        borderColor: T.brand + '30',
                      }]}
                      onPress={() => setShowExtras(!showExtras)}>
                      <Feather name="sliders" size={12} color={showExtras ? T.brand : T.t3} />
                      <Text style={[styles.extraChipLabel, showExtras && { color: T.brand, fontWeight: '700' as const }]}>
                        More
                      </Text>
                    </Pressable>
                  </View>

                  {showExtras && (
                    <View style={styles.moreSection}>
                      <Text style={styles.moreSectionLabel}>PRIORITY</Text>
                      <View style={styles.optionRow}>
                        {PRIORITY_OPTIONS.map(p => {
                          const on = priority === p.id;
                          return (
                            <Pressable key={p.id} style={[styles.optionChip, on && {
                              backgroundColor: p.color + '12',
                              borderColor: p.color + '40',
                            }]} onPress={() => setPriority(p.id as Priority)}>
                              <Feather name={p.icon} size={11} color={on ? p.color : T.t3} />
                              <Text style={[styles.optionChipLabel, on && { color: p.color, fontWeight: '700' as const }]}>
                                {p.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      <Text style={[styles.moreSectionLabel, { marginTop: 10 }]}>EFFORT</Text>
                      <View style={styles.optionRow}>
                        {EFFORT_OPTIONS.map(e => {
                          const on = effort === e.id;
                          return (
                            <Pressable key={e.id} style={[styles.optionChip, on && {
                              backgroundColor: e.color + '12',
                              borderColor: e.color + '40',
                            }]} onPress={() => setEffort(e.id as Effort)}>
                              <Feather name={e.icon} size={11} color={on ? e.color : T.t3} />
                              <Text style={[styles.optionChipLabel, on && { color: e.color, fontWeight: '700' as const }]}>
                                {e.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      <Text style={[styles.moreSectionLabel, { marginTop: 10 }]}>DEADLINE</Text>
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
                </>
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
    </View>
  );
}

const styles = StyleSheet.create({
  fullOverlay:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 },
  overlay:        { flex: 1, justifyContent: 'flex-end' },
  backdrop:       { flex: 1, backgroundColor: 'rgba(10,8,22,0.52)' },
  sheet:          { backgroundColor: 'rgba(253,252,255,0.98)', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 0, maxHeight: '92%' },
  handleRow:      { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle:         { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.08)' },

  savedState:     { alignItems: 'center', paddingVertical: 32, gap: 10 },
  savedIcon:      { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  savedTitle:     { fontSize: F.lg, fontWeight: '800', color: T.text },
  savedSub:       { fontSize: F.sm, color: T.t3, textAlign: 'center' },

  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 10, marginBottom: 14, gap: 8 },
  title:          { fontSize: 20, fontWeight: '800', color: T.text, letterSpacing: -0.6 },
  subtitle:       { fontSize: 12, color: T.t3, marginTop: 2 },
  closeBtn:       { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  inputWrap:      { borderRadius: 18, borderWidth: 2, marginBottom: 10, overflow: 'hidden' },
  input:          { fontSize: 16, color: T.text, padding: 14, fontWeight: '400' },
  typeBadge:      { position: 'absolute', right: 12, top: '50%', marginTop: -14, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
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

  approachSection:{ marginBottom: 8 },
  approachLabel:  { fontSize: 11, fontWeight: '700' as const, color: T.t3, letterSpacing: 0.4, marginBottom: 8, textTransform: 'uppercase' as const },
  typeGroupRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  typeGroupLabel: { fontSize: 10, fontWeight: '600' as const, color: T.t3, width: 48, textAlign: 'right' as const },
  typeGroupCards: { flexDirection: 'row', flex: 1, gap: 8 },
  typeCard:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'rgba(0,0,0,0.025)' },
  typeCardLabel:  { fontSize: 13, fontWeight: '700' as const, color: T.t2 },
  typeCardSub:    { fontSize: 10, color: T.t3 },

  analyzingRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 4 },
  analyzingText:  { fontSize: 13, fontWeight: '600' as const, color: T.brand },

  recCard:        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 6 },
  recIconBox:     { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recTitleRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recLabel:       { fontSize: 15, fontWeight: '700' as const, color: T.t2 },
  recReason:      { fontSize: 12, color: T.t3, marginTop: 2, lineHeight: 16 },
  m3ntorBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: T.brand + '0C', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  m3ntorBadgeText:{ fontSize: 9, fontWeight: '700' as const, color: T.brand, letterSpacing: 0.3 },

  otherToggle:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, marginBottom: 4 },
  otherToggleText:{ fontSize: 12, fontWeight: '600' as const, color: T.t3 },
  otherCards:     { gap: 8, marginBottom: 4 },

  breakdownSection: { backgroundColor: T.brand + '06', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: T.brand + '14' },
  breakdownHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  breakdownTitle:   { fontSize: 13, fontWeight: '700', color: T.brand, flex: 1 },
  breakdownRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  breakdownDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: T.brand + '40' },
  breakdownStepText:{ fontSize: 13, color: T.text, flex: 1, lineHeight: 18 },
  breakdownStepInput:{ fontSize: 13, color: T.text, flex: 1, lineHeight: 18, padding: 0, borderBottomWidth: 1, borderBottomColor: T.brand + '40' },
  addStepRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, marginTop: 4 },
  addStepText:      { fontSize: 12, color: T.brand, fontWeight: '600' },

  extrasRow:      { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14, flexWrap: 'wrap' },
  extraChip:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.09)' },
  extraChipLabel: { fontSize: 12, color: T.t3 },
  extraChipEmpty: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  extraChipEmptyText: { fontSize: 12, color: T.t3 },

  moreSection:    { backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  moreSectionLabel: { fontSize: 10, fontWeight: '700', color: T.t3, letterSpacing: 0.5, marginBottom: 6 },
  optionRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  optionChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'rgba(0,0,0,0.03)' },
  optionChipLabel:{ fontSize: 12, fontWeight: '500', color: T.t3 },
  deadlineInput:  { padding: 10, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(0,0,0,0.09)', fontSize: 14, color: T.text, marginTop: 2 },

  saveBtn:        { borderRadius: 20, padding: 17, alignItems: 'center', justifyContent: 'center' },
  saveBtnInner:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  saveBtnText:    { fontSize: 16, fontWeight: '700', color: 'white', letterSpacing: -0.3 },
  cancelBtn:      { padding: 12, alignItems: 'center', marginTop: 6 },
  cancelText:     { fontSize: 14, fontWeight: '600', color: T.t3 },
});
