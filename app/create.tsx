import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  Platform, ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, cancelAnimation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { T, S, F } from '@/constants/theme';
import { ITEM_AREAS } from '@/constants/config';
import type { Priority, Effort } from '@/types';
import { suggestArea, inferType } from '@/utils/nlp';
import { getItemHint, generateGoal, generateProjectTasks, assessProjectComplexity, generateHabitPlan, generateActionPlan } from '@/lib/ai';
import type { AiHabitPlan, AiActionPlan } from '@/lib/ai';
import { createItem, createStep } from '@/utils/items';
import { useStore } from '@/lib/store';
import { getCountryByCode } from '@/constants/countries';
import { AreaPicker } from '@/components/add/AreaPicker';

const TYPE_GROUPS = [
  {
    label: 'Quick',
    items: [
      { id: 'action',  label: 'Action',  sub: 'A one-off task',            detail: 'Do it once and tick it off. Great for errands, calls, or quick wins.',  icon: 'check'  as const, color: T.green  },
      { id: 'habit',   label: 'Habit',   sub: 'A recurring routine',       detail: 'Something you want to do regularly — daily, weekly, or on specific days.', icon: 'repeat' as const, color: T.orange },
    ],
  },
  {
    label: 'Planned',
    items: [
      { id: 'goal',    label: 'Goal',    sub: 'A bigger ambition',         detail: 'A target you\'re working toward. Link projects and habits to track progress.', icon: 'target' as const, color: '#9B59B6' },
      { id: 'project', label: 'Project', sub: 'Multiple steps',            detail: 'Something with several tasks. M3NTOR breaks it down into a step-by-step plan.', icon: 'layers' as const, color: T.brand  },
    ],
  },
] as const;

const ALL_TYPES = TYPE_GROUPS.flatMap(g => g.items);

const PROMOS = [
  { text: 'Call Mum this week',      type: 'action',  hint: 'Action' },
  { text: 'Meditate every morning',  type: 'habit',   hint: 'Habit'  },
  { text: 'Run a 5K by June',        type: 'goal',    hint: 'Goal'   },
  { text: 'Redesign the website',    type: 'project', hint: 'Project'},
  { text: 'Read 12 books this year', type: 'goal',    hint: 'Goal'   },
  { text: 'Build a sleep routine',   type: 'habit',   hint: 'Habit'  },
];

const TOD_OPTIONS = [
  { id: 'morning',   label: 'Morning',   icon: 'sun'     as const },
  { id: 'afternoon', label: 'Afternoon', icon: 'sunrise' as const },
  { id: 'evening',   label: 'Evening',   icon: 'moon'    as const },
];

const PRIORITY_OPTIONS = [
  { id: 'urgent', label: 'Urgent', icon: 'alert-triangle' as const, color: '#E53E3E' },
  { id: 'high',   label: 'High',   icon: 'arrow-up' as const,       color: '#DD6B20' },
  { id: 'normal', label: 'Normal', icon: 'minus' as const,          color: T.t3      },
  { id: 'low',    label: 'Low',    icon: 'arrow-down' as const,     color: '#718096'  },
] as const;

const EFFORT_OPTIONS = [
  { id: 'quick',  label: 'Quick',  sub: '< 15 min',  icon: 'zap' as const,   color: T.green  },
  { id: 'medium', label: 'Medium', sub: '~1\u20132 hrs', icon: 'clock' as const,  color: T.orange },
  { id: 'deep',   label: 'Deep',   sub: 'Half day+',  icon: 'layers' as const, color: T.brand  },
] as const;

const EFFORT_CONFIG: Record<string, { icon: 'zap' | 'clock'; label: string; sub: string; color: string }> = {
  quick:  { icon: 'zap',   label: 'Quick win',      sub: '< 15 min',  color: T.green  },
  medium: { icon: 'clock', label: 'Medium effort',   sub: '~1\u20132 hrs', color: T.orange },
  deep:   { icon: 'zap',   label: 'Deep work',       sub: 'Half day+',  color: T.brand  },
};

type CreationMode = 'ai' | 'manual' | null;

const RECURRENCE_OPTIONS = [
  { id: 'daily',    label: 'Every day',     icon: 'sun'      as const },
  { id: 'weekdays', label: 'Weekdays',      icon: 'briefcase' as const },
  { id: 'weekly',   label: 'Once a week',   icon: 'calendar' as const },
  { id: 'custom',   label: '3x per week',   icon: 'repeat'   as const },
] as const;

interface FollowUpQuestion {
  id: string;
  label: string;
  type: 'chips' | 'text';
  options?: { id: string; label: string; icon?: string }[];
  placeholder?: string;
}

const FOLLOWUP_BY_TYPE: Record<string, FollowUpQuestion[]> = {
  action: [
    { id: 'when', label: 'When do you want to do this?', type: 'chips', options: [
      { id: 'today', label: 'Today' }, { id: 'tomorrow', label: 'Tomorrow' },
      { id: 'this_week', label: 'This week' }, { id: 'no_rush', label: 'No rush' },
    ]},
    { id: 'duration', label: 'How long will it take?', type: 'chips', options: [
      { id: 'quick', label: '< 15 min' }, { id: 'medium', label: '~1\u20132 hrs' }, { id: 'deep', label: 'Half day+' },
    ]},
  ],
  habit: [
    { id: 'frequency', label: 'How often?', type: 'chips', options: [
      { id: 'daily', label: 'Every day' }, { id: 'weekdays', label: 'Weekdays' },
      { id: 'weekly', label: 'Once a week' }, { id: '3x', label: '3x per week' },
    ]},
    { id: 'time', label: 'Best time of day?', type: 'chips', options: [
      { id: 'morning', label: 'Morning', icon: 'sun' }, { id: 'afternoon', label: 'Afternoon', icon: 'sunrise' },
      { id: 'evening', label: 'Evening', icon: 'moon' }, { id: 'anytime', label: 'Anytime', icon: 'clock' },
    ]},
    { id: 'experience', label: 'Your experience with this?', type: 'chips', options: [
      { id: 'new', label: 'Brand new' }, { id: 'tried', label: 'Tried before' }, { id: 'restarting', label: 'Getting back to it' },
    ]},
  ],
  goal: [
    { id: 'timeline', label: 'When do you want to achieve this?', type: 'chips', options: [
      { id: '1month', label: '1 month' }, { id: '3months', label: '3 months' },
      { id: '6months', label: '6 months' }, { id: '1year', label: '1 year' },
    ]},
    { id: 'success', label: 'What does success look like?', type: 'text', placeholder: 'e.g. Complete my first marathon' },
  ],
  project: [],
};

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const { userId, addItem, updateItem: storeUpdateItem, items: allItems, profile } = useStore();
  const effectiveUserId = userId ?? 'guest';
  const countryName = profile?.country ? getCountryByCode(profile.country)?.name : undefined;

  const params = useLocalSearchParams<{ linkToGoal?: string; suggestType?: string }>();
  const linkToGoalId = params.linkToGoal ?? null;
  const suggestType = params.suggestType ?? null;
  const linkGoal = linkToGoalId ? allItems.find(i => i.id === linkToGoalId) : null;

  const [text, setText]                 = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [area, setArea]                 = useState<string | null>(null);
  const [tod, setTod]                   = useState<string | null>(null);
  const [priority, setPriority]         = useState<Priority>('normal');
  const [effort, setEffort]             = useState<Effort>('medium');
  const [deadline, setDeadline]         = useState('');
  const [aiHint, setAiHint]             = useState<{ why?: string; firstStep?: string; tip?: string; effort?: string; suggestedType?: string; typeReason?: string } | null>(null);
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiPending, setAiPending]       = useState(false);
  const [saved, setSaved]               = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [goalSuggestion, setGoalSuggestion] = useState<{ why?: string; journeyHints?: string[]; firstSteps?: string[] } | null>(null);
  const [goalEnrichLoading, setGoalEnrichLoading] = useState(false);
  const [breakdownSteps, setBreakdownSteps] = useState<{ id: string; text: string; effort?: string }[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [pinnedAiType, setPinnedAiType] = useState<string | null>(null);
  const [clarifyQuestions, setClarifyQuestions] = useState<string[]>([]);
  const [clarifyAnswers, setClarifyAnswers] = useState<Record<number, string>>({});
  const [clarifyLoading, setClarifyLoading] = useState(false);
  const [showClarify, setShowClarify] = useState(false);
  const [creationMode, setCreationMode] = useState<CreationMode>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [aiGenResult, setAiGenResult] = useState<{ habitPlan?: AiHabitPlan; actionPlan?: AiActionPlan } | null>(null);
  const [aiGenLoading, setAiGenLoading] = useState(false);
  const [manualRecurrence, setManualRecurrence] = useState('daily');
  const [manualDescription, setManualDescription] = useState('');

  const inputRef    = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pulseOpacity = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  useEffect(() => {
    if (aiPending && !aiHint) {
      pulseOpacity.value = withRepeat(
        withTiming(0.45, { duration: 800 }),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [aiPending, aiHint]);

  const isCompact = screenWidth < 380;
  const horizontalPad = isCompact ? 14 : 18;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
    if (suggestType && ['action', 'habit', 'goal', 'project'].includes(suggestType)) {
      setSelectedType(suggestType);
    }
    if (linkGoal?.area && !area) {
      setArea(linkGoal.area);
    }
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
    if (!text.trim() || text.trim().length < 5) {
      setAiHint(null);
      setAiPending(false);
      setAiLoading(false);
      return;
    }

    setAiPending(true);
    setShowClarify(false);
    setClarifyQuestions([]);
    setClarifyAnswers({});
    setClarifyLoading(false);

    debounceRef.current = setTimeout(async () => {
      setAiLoading(true);
      const hint = await getItemHint(text, undefined, countryName);
      if (!hint.suggestedType) {
        hint.suggestedType = inferType(text);
        if (!hint.typeReason) hint.typeReason = 'Based on what you typed';
      }
      setAiHint(hint);
      if (hint.suggestedType && !selectedType) {
        setPinnedAiType(hint.suggestedType);
      }
      setAiLoading(false);
      setAiPending(false);
    }, 900);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [text]);

  const areaConf = area ? ITEM_AREAS[area] : null;
  const canSave  = text.trim().length > 0 && (activeType !== 'goal' || !!area);
  const hasFollowUps = activeType ? (FOLLOWUP_BY_TYPE[activeType]?.length ?? 0) > 0 : false;
  const followUpsAnswered = hasFollowUps && Object.keys(followUpAnswers).length > 0;
  const needsFollowUp = creationMode === 'ai' && hasFollowUps && !followUpsAnswered && !aiGenResult && activeType !== 'project';
  const canSaveFinal = canSave && !!creationMode && !needsFollowUp;

  function handleTypeSelect(id: string) {
    const newVal = selectedType === id ? null : id;
    setSelectedType(newVal);
    setCreationMode(null);
    setFollowUpAnswers({});
    setAiGenResult(null);
    setAiGenLoading(false);
    if (newVal !== 'project') {
      setShowClarify(false);
      setClarifyQuestions([]);
      setClarifyAnswers({});
      setBreakdownSteps([]);
    }
  }

  function handleModeSelect(mode: CreationMode) {
    setCreationMode(mode);
    setFollowUpAnswers({});
    setAiGenResult(null);
    if (mode === 'ai' && activeType === 'project' && text.trim() && breakdownSteps.length === 0 && !showClarify) {
      setClarifyLoading(true);
      assessProjectComplexity(text, countryName).then(complexity => {
        if (complexity.complex && complexity.questions.length > 0) {
          setClarifyQuestions(complexity.questions);
          setClarifyAnswers({});
          setShowClarify(true);
          setClarifyLoading(false);
        } else {
          setClarifyLoading(false);
          setBreakdownLoading(true);
          generateProjectTasks(text, [], countryName).then(result => {
            if (result.tasks.length > 0) {
              setBreakdownSteps(result.tasks.map(t => ({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                text: t.title,
                effort: t.effort,
              })));
            }
            setBreakdownLoading(false);
          });
        }
      });
    }
  }

  async function handleFollowUpGenerate() {
    if (!activeType || !text.trim()) return;
    const contextParts = Object.entries(followUpAnswers)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    setAiGenLoading(true);
    if (activeType === 'habit') {
      const plan = await generateHabitPlan(text.trim(), contextParts, countryName);
      setAiGenResult({ habitPlan: plan });
      if (plan.area && !area) setArea(plan.area);
      const freqAnswer = followUpAnswers['frequency'];
      if (freqAnswer === 'daily') setManualRecurrence('daily');
      else if (freqAnswer === 'weekdays') setManualRecurrence('weekdays');
      else if (freqAnswer === 'weekly') setManualRecurrence('weekly');
      else if (freqAnswer === '3x') setManualRecurrence('custom');
      const timeAnswer = followUpAnswers['time'];
      if (timeAnswer && timeAnswer !== 'anytime') setTod(timeAnswer);
    } else if (activeType === 'action') {
      const plan = await generateActionPlan(text.trim(), contextParts, countryName);
      setAiGenResult({ actionPlan: plan });
      if (plan.area && !area) setArea(plan.area);
      if (plan.bestTime) setTod(plan.bestTime);
      const durAnswer = followUpAnswers['duration'];
      if (durAnswer === 'quick') setEffort('quick');
      else if (durAnswer === 'medium') setEffort('medium');
      else if (durAnswer === 'deep') setEffort('deep');
    } else if (activeType === 'goal') {
      const timelineAnswer = followUpAnswers['timeline'];
      if (timelineAnswer) {
        const now = new Date();
        if (timelineAnswer === '1month') now.setMonth(now.getMonth() + 1);
        else if (timelineAnswer === '3months') now.setMonth(now.getMonth() + 3);
        else if (timelineAnswer === '6months') now.setMonth(now.getMonth() + 6);
        else if (timelineAnswer === '1year') now.setFullYear(now.getFullYear() + 1);
        setDeadline(now.toISOString().slice(0, 10));
      }
    }
    setAiGenLoading(false);
  }

  async function handleClarifyGenerate() {
    const contextParts = clarifyQuestions.map((q, i) =>
      `Q: ${q}\nA: ${clarifyAnswers[i] || '(not answered)'}`
    ).join('\n');
    setShowClarify(false);
    setBreakdownLoading(true);
    const result = await generateProjectTasks(text, [], countryName, contextParts);
    if (result.tasks.length > 0) {
      setBreakdownSteps(result.tasks.map(t => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        text: t.title,
        effort: t.effort,
      })));
    }
    setBreakdownLoading(false);
  }

  async function handleSave() {
    if (!canSaveFinal) return;
    const type = activeType ?? 'action';

    let enrichedEmoji = type === 'habit' ? '🔄' : type === 'goal' ? '🎯' : type === 'project' ? '📁' : '✓';
    let enrichedArea = area ?? suggestArea(text) ?? 'life';
    let description: string | undefined;
    let linkedJourneys: string[] | undefined;

    if (aiGenResult?.habitPlan?.emoji) enrichedEmoji = aiGenResult.habitPlan.emoji;
    if (aiGenResult?.actionPlan?.emoji) enrichedEmoji = aiGenResult.actionPlan.emoji;
    if (aiGenResult?.habitPlan?.why) description = aiGenResult.habitPlan.why;
    if (manualDescription.trim()) description = manualDescription.trim();

    if (type === 'goal') {
      setGoalEnrichLoading(true);
      try {
        const successCtx = followUpAnswers['success'] ? `\nSuccess looks like: ${followUpAnswers['success']}` : '';
        const suggestion = await generateGoal(text.trim() + successCtx, countryName);
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
      ? filteredSteps.map((s, idx) => createStep(itemId, {
          title: s.text.trim(),
          sort_order: idx,
          effort: (s.effort as 'quick' | 'medium' | 'deep') || undefined,
        }))
      : undefined;

    let recurrence: { type: string } | undefined;
    if (type === 'habit') {
      if (creationMode === 'manual') {
        recurrence = { type: manualRecurrence };
      } else {
        const freq = followUpAnswers['frequency'];
        if (freq === 'weekdays') recurrence = { type: 'weekdays' };
        else if (freq === 'weekly') recurrence = { type: 'weekly' };
        else if (freq === '3x') recurrence = { type: 'custom' };
        else recurrence = { type: 'daily' };
      }
    }

    const item = createItem(effectiveUserId, {
      id:                itemId,
      title:             text.trim(),
      area:              enrichedArea,
      status:            type === 'goal' ? 'someday' : 'active',
      emoji:             enrichedEmoji,
      description,
      habit_time_of_day: (tod as 'morning' | 'afternoon' | 'evening') ?? undefined,
      recurrence:        recurrence as any,
      priority,
      effort,
      deadline:          deadline.trim() || undefined,
      linked_journeys:   linkedJourneys,
      steps,
    });

    addItem(item);

    if (linkToGoalId && linkGoal) {
      const existingLinked = linkGoal.linked_items || [];
      if (!existingLinked.includes(itemId)) {
        storeUpdateItem(linkToGoalId, { linked_items: [...existingLinked, itemId] });
      }
    }

    setSaved(true);
    setTimeout(() => { setSaved(false); router.back(); }, 850);
  }

  const validStepCount = breakdownSteps.filter(s => s.text.trim()).length;
  const saveBtnLabel = !text.trim()                     ? 'Type something to start'
    : !activeType                                        ? 'Pick a type'
    : !creationMode                                      ? 'Choose how to create'
    : activeType === 'goal' && !area                     ? 'Pick a life area first'
    : needsFollowUp                                      ? 'Answer the questions above'
    : activeType === 'project' && validStepCount > 0     ? `Create project with ${validStepCount} steps`
    : activeType === 'project'                           ? 'Create project'
    : activeType === 'habit'                             ? 'Start this habit'
    : activeType === 'goal'                              ? 'Save to goals'
    :                                                      'Add it';

  const content = saved ? (
    <View style={styles.savedState}>
      <View style={[styles.savedIcon, { backgroundColor: (typeConf?.color ?? T.green) + '14' }]}>
        <Feather name="check" size={26} color={typeConf?.color ?? T.green} />
      </View>
      <Text style={styles.savedTitle}>Added!</Text>
      <Text style={styles.savedSub}>"{text}"</Text>
    </View>
  ) : (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={true}
      contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: horizontalPad }}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, isCompact && { fontSize: 17 }]}>What's next?</Text>
        <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={8}>
          <Feather name="x" size={14} color={T.t3} />
        </Pressable>
      </View>

      {linkGoal && (
        <View style={styles.linkGoalBanner}>
          <Feather name="link" size={12} color={T.brand} />
          <Text style={styles.linkGoalText} numberOfLines={1}>
            Linking to: {linkGoal.emoji} {linkGoal.title}
          </Text>
        </View>
      )}

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
        {(aiPending || aiLoading) && !aiHint && (
          <View style={styles.thinkingRow}>
            <View style={styles.thinkingIconBox}>
              <ActivityIndicator size="small" color={T.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.thinkingLine1}>M3NTOR is analyzing…</Text>
            </View>
          </View>
        )}
        {aiHint && (aiHint.why || aiHint.firstStep || aiHint.tip || aiHint.effort) && (
          <View style={[styles.hintCard, {
            backgroundColor: (typeConf?.color ?? T.brand) + '09',
            borderColor:     (typeConf?.color ?? T.brand) + '1A',
          }]}>
            <View style={styles.hintIconBox}>
              <Feather name="zap" size={13} color={typeConf?.color ?? T.brand} />
            </View>
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
                    {EFFORT_CONFIG[aiHint.effort].label} · {EFFORT_CONFIG[aiHint.effort].sub}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        {!aiPending && !aiLoading && !aiHint && !text.trim() && (
          <View style={styles.promoSection}>
            <Text style={styles.promoLabel}>Try one of these to get started</Text>
            <View style={styles.promoRow}>
              {PROMOS.map(p => {
                const tc = ALL_TYPES.find(t => t.id === p.type);
                return (
                  <Pressable key={p.text} style={styles.promoChip}
                    onPress={() => { setText(p.text); setSelectedType(p.type); }}>
                    <Text style={styles.promoChipText}>{p.text}</Text>
                    {tc && (
                      <View style={[styles.promoChipBadge, { backgroundColor: tc.color + '14' }]}>
                        <Feather name={tc.icon} size={9} color={tc.color} />
                        <Text style={[styles.promoChipBadgeText, { color: tc.color }]}>{p.hint}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {!!text.trim() && (
        <View style={styles.approachSection}>
          <Text style={styles.approachLabel}>How would you like to approach this?</Text>
          <Animated.View style={[styles.typeGrid, aiPending && !aiHint ? pulseStyle : undefined]}>
            {ALL_TYPES.map(t => {
              const on = activeType === t.id;
              return (
                <Pressable key={t.id} style={[styles.typeCard, on && {
                  backgroundColor: t.color + '10',
                  borderColor: t.color + '40',
                }]} onPress={() => handleTypeSelect(t.id)}>
                  <View style={[styles.typeIconWrap, { backgroundColor: (on ? t.color : T.t3) + '12' }]}>
                    <Feather name={t.icon} size={14} color={on ? t.color : T.t3} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.typeCardLabel, on && { color: t.color }]}>
                      {t.label}
                    </Text>
                    <Text style={[styles.typeCardSub, on && { color: t.color + 'AA' }]}>
                      {t.sub}
                    </Text>
                  </View>
                  {on && <Feather name="check" size={14} color={t.color} />}
                </Pressable>
              );
            })}
          </Animated.View>
          {activeType && (
            <View style={[styles.typeDetailCard, { backgroundColor: (typeConf?.color ?? T.brand) + '08', borderColor: (typeConf?.color ?? T.brand) + '18' }]}>
              <Feather name="info" size={12} color={(typeConf?.color ?? T.brand) + 'AA'} />
              <Text style={[styles.typeDetailText, { color: (typeConf?.color ?? T.brand) + 'CC' }]}>
                {ALL_TYPES.find(t => t.id === activeType)?.detail}
              </Text>
            </View>
          )}
        </View>
      )}

      {activeType && text.trim() && (
        <View style={styles.modeSection}>
          <Text style={styles.modeSectionLabel}>How would you like to set this up?</Text>
          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeCard, creationMode === 'ai' && {
                backgroundColor: T.brand + '10', borderColor: T.brand + '40',
              }]}
              onPress={() => handleModeSelect('ai')}
            >
              <View style={[styles.modeIconWrap, { backgroundColor: (creationMode === 'ai' ? T.brand : T.t3) + '12' }]}>
                <Feather name="zap" size={14} color={creationMode === 'ai' ? T.brand : T.t3} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeCardLabel, creationMode === 'ai' && { color: T.brand }]}>M3NTOR plans it</Text>
                <Text style={[styles.modeCardSub, creationMode === 'ai' && { color: T.brand + 'AA' }]}>Answer a few questions, get a tailored plan</Text>
              </View>
              {creationMode === 'ai' && <Feather name="check" size={14} color={T.brand} />}
            </Pressable>
            <Pressable
              style={[styles.modeCard, creationMode === 'manual' && {
                backgroundColor: T.green + '10', borderColor: T.green + '40',
              }]}
              onPress={() => handleModeSelect('manual')}
            >
              <View style={[styles.modeIconWrap, { backgroundColor: (creationMode === 'manual' ? T.green : T.t3) + '12' }]}>
                <Feather name="edit-2" size={14} color={creationMode === 'manual' ? T.green : T.t3} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeCardLabel, creationMode === 'manual' && { color: T.green }]}>I'll set it up</Text>
                <Text style={[styles.modeCardSub, creationMode === 'manual' && { color: T.green + 'AA' }]}>Configure everything yourself</Text>
              </View>
              {creationMode === 'manual' && <Feather name="check" size={14} color={T.green} />}
            </Pressable>
          </View>
        </View>
      )}

      {creationMode === 'ai' && activeType && activeType !== 'project' && !aiGenResult && !aiGenLoading && (
        <View style={styles.followUpSection}>
          <View style={styles.followUpHeader}>
            <Feather name="help-circle" size={13} color={T.brand} />
            <Text style={styles.followUpTitle}>A few quick questions</Text>
          </View>
          <Text style={styles.followUpSubtext}>Help M3NTOR create a better plan for you</Text>
          {(FOLLOWUP_BY_TYPE[activeType] ?? []).map((q) => (
            <View key={q.id} style={styles.followUpQRow}>
              <Text style={styles.followUpQ}>{q.label}</Text>
              {q.type === 'chips' && q.options && (
                <View style={styles.followUpChipRow}>
                  {q.options.map(opt => {
                    const selected = followUpAnswers[q.id] === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        style={[styles.followUpChip, selected && {
                          backgroundColor: (typeConf?.color ?? T.brand) + '14',
                          borderColor: (typeConf?.color ?? T.brand) + '40',
                        }]}
                        onPress={() => setFollowUpAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                      >
                        {opt.icon && <Feather name={opt.icon as any} size={11} color={selected ? (typeConf?.color ?? T.brand) : T.t3} />}
                        <Text style={[styles.followUpChipLabel, selected && { color: typeConf?.color ?? T.brand, fontWeight: '700' as const }]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {q.type === 'text' && (
                <TextInput
                  style={styles.followUpInput}
                  placeholder={q.placeholder}
                  placeholderTextColor={T.t3}
                  value={followUpAnswers[q.id] || ''}
                  onChangeText={(v) => setFollowUpAnswers(prev => ({ ...prev, [q.id]: v }))}
                  returnKeyType="done"
                />
              )}
            </View>
          ))}
          {Object.keys(followUpAnswers).length > 0 && (
            <Pressable style={styles.followUpGenBtn} onPress={handleFollowUpGenerate}>
              <Feather name="zap" size={13} color="white" />
              <Text style={styles.followUpGenText}>Generate plan</Text>
            </Pressable>
          )}
        </View>
      )}

      {creationMode === 'ai' && aiGenLoading && (
        <View style={styles.followUpSection}>
          <View style={styles.followUpHeader}>
            <ActivityIndicator size="small" color={T.brand} />
            <Text style={styles.followUpTitle}>M3NTOR is planning...</Text>
          </View>
        </View>
      )}

      {creationMode === 'ai' && aiGenResult?.habitPlan && (
        <View style={[styles.aiResultCard, { backgroundColor: T.orange + '08', borderColor: T.orange + '18' }]}>
          <View style={styles.aiResultHeader}>
            <Feather name="zap" size={13} color={T.orange} />
            <Text style={[styles.aiResultTitle, { color: T.orange }]}>M3NTOR's plan</Text>
          </View>
          {aiGenResult.habitPlan.schedule && (
            <View style={styles.aiResultRow}>
              <Feather name="calendar" size={11} color={T.t2} />
              <Text style={styles.aiResultText}>{aiGenResult.habitPlan.schedule}</Text>
            </View>
          )}
          {aiGenResult.habitPlan.tip && (
            <View style={styles.aiResultRow}>
              <Feather name="star" size={11} color={T.t2} />
              <Text style={styles.aiResultText}>{aiGenResult.habitPlan.tip}</Text>
            </View>
          )}
          {aiGenResult.habitPlan.why && (
            <View style={styles.aiResultRow}>
              <Feather name="heart" size={11} color={T.t2} />
              <Text style={[styles.aiResultText, { fontStyle: 'italic' }]}>{aiGenResult.habitPlan.why}</Text>
            </View>
          )}
        </View>
      )}

      {creationMode === 'ai' && aiGenResult?.actionPlan && (
        <View style={[styles.aiResultCard, { backgroundColor: T.green + '08', borderColor: T.green + '18' }]}>
          <View style={styles.aiResultHeader}>
            <Feather name="zap" size={13} color={T.green} />
            <Text style={[styles.aiResultTitle, { color: T.green }]}>M3NTOR's plan</Text>
          </View>
          {aiGenResult.actionPlan.tip && (
            <View style={styles.aiResultRow}>
              <Feather name="star" size={11} color={T.t2} />
              <Text style={styles.aiResultText}>{aiGenResult.actionPlan.tip}</Text>
            </View>
          )}
        </View>
      )}

      {creationMode === 'manual' && activeType === 'habit' && (
        <View style={styles.manualSection}>
          <Text style={styles.manualSectionTitle}>Habit settings</Text>
          <Text style={styles.moreSectionLabel}>HOW OFTEN</Text>
          <View style={styles.optionRow}>
            {RECURRENCE_OPTIONS.map(r => {
              const on = manualRecurrence === r.id;
              return (
                <Pressable key={r.id} style={[styles.optionChip, on && {
                  backgroundColor: T.orange + '12', borderColor: T.orange + '40',
                }]} onPress={() => setManualRecurrence(r.id)}>
                  <Feather name={r.icon} size={11} color={on ? T.orange : T.t3} />
                  <Text style={[styles.optionChipLabel, on && { color: T.orange, fontWeight: '700' as const }]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.moreSectionLabel, { marginTop: 10 }]}>BEST TIME</Text>
          <View style={styles.optionRow}>
            {TOD_OPTIONS.map(o => {
              const on = tod === o.id;
              return (
                <Pressable key={o.id} style={[styles.optionChip, on && {
                  backgroundColor: T.orange + '12', borderColor: T.orange + '40',
                }]} onPress={() => setTod(prev => prev === o.id ? null : o.id)}>
                  <Feather name={o.icon} size={11} color={on ? T.orange : T.t3} />
                  <Text style={[styles.optionChipLabel, on && { color: T.orange, fontWeight: '700' as const }]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {creationMode === 'manual' && activeType === 'project' && (
        <View style={styles.manualSection}>
          <Text style={styles.manualSectionTitle}>Project steps</Text>
          <Text style={styles.manualSectionSub}>Add your steps one by one</Text>
          {breakdownSteps.map((step, stepIdx) => (
            <View key={step.id} style={styles.breakdownRow}>
              <View style={styles.breakdownDot} />
              <View style={{ flex: 1 }}>
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
                  <Pressable onPress={() => setEditingStepId(step.id)}>
                    <Text style={styles.breakdownStepText} numberOfLines={2}>
                      {step.text || 'Tap to edit...'}
                    </Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.breakdownActions}>
                <Pressable hitSlop={4} disabled={stepIdx === 0}
                  onPress={() => {
                    setBreakdownSteps(prev => {
                      const arr = [...prev];
                      [arr[stepIdx - 1], arr[stepIdx]] = [arr[stepIdx], arr[stepIdx - 1]];
                      return arr;
                    });
                  }}
                  style={{ opacity: stepIdx === 0 ? 0.25 : 1 }}
                >
                  <Feather name="chevron-up" size={13} color={T.t3} />
                </Pressable>
                <Pressable hitSlop={4} disabled={stepIdx === breakdownSteps.length - 1}
                  onPress={() => {
                    setBreakdownSteps(prev => {
                      const arr = [...prev];
                      [arr[stepIdx], arr[stepIdx + 1]] = [arr[stepIdx + 1], arr[stepIdx]];
                      return arr;
                    });
                  }}
                  style={{ opacity: stepIdx === breakdownSteps.length - 1 ? 0.25 : 1 }}
                >
                  <Feather name="chevron-down" size={13} color={T.t3} />
                </Pressable>
              </View>
              <Pressable hitSlop={8} onPress={() => setBreakdownSteps(prev => prev.filter(s => s.id !== step.id))}>
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

      {creationMode === 'manual' && activeType === 'goal' && (
        <View style={styles.manualSection}>
          <Text style={styles.manualSectionTitle}>Goal details</Text>
          <Text style={styles.moreSectionLabel}>TARGET DATE</Text>
          <TextInput
            value={deadline}
            onChangeText={setDeadline}
            placeholder="e.g. 2026-06-01"
            placeholderTextColor={T.t3}
            style={styles.deadlineInput}
            returnKeyType="done"
          />
          <Text style={[styles.moreSectionLabel, { marginTop: 10 }]}>DESCRIPTION</Text>
          <TextInput
            value={manualDescription}
            onChangeText={setManualDescription}
            placeholder="What does achieving this goal look like?"
            placeholderTextColor={T.t3}
            style={[styles.deadlineInput, { minHeight: 60, textAlignVertical: 'top' }]}
            multiline
            returnKeyType="done"
          />
        </View>
      )}

      {creationMode === 'ai' && activeType === 'project' && showClarify && clarifyQuestions.length > 0 && (
        <View style={styles.clarifySection}>
          <View style={styles.clarifyHeader}>
            <Feather name="help-circle" size={13} color={T.brand} />
            <Text style={styles.clarifyTitle}>A few questions first</Text>
          </View>
          <Text style={styles.clarifySubtext}>This looks like a complex project. Answering these helps M3NTOR create a better breakdown.</Text>
          {clarifyQuestions.map((q, idx) => (
            <View key={idx} style={styles.clarifyQRow}>
              <Text style={styles.clarifyQ}>{q}</Text>
              <TextInput
                style={styles.clarifyInput}
                placeholder="Your answer..."
                placeholderTextColor={T.t3}
                value={clarifyAnswers[idx] || ''}
                onChangeText={(v) => setClarifyAnswers(prev => ({ ...prev, [idx]: v }))}
                returnKeyType="done"
              />
            </View>
          ))}
          <View style={styles.clarifyActions}>
            <Pressable style={styles.clarifyGenBtn} onPress={handleClarifyGenerate}>
              <Feather name="zap" size={13} color="white" />
              <Text style={styles.clarifyGenText}>Generate breakdown</Text>
            </Pressable>
            <Pressable style={styles.clarifySkipBtn} onPress={() => {
              setShowClarify(false);
              setBreakdownLoading(true);
              generateProjectTasks(text, [], countryName).then(result => {
                if (result.tasks.length > 0) {
                  setBreakdownSteps(result.tasks.map(t => ({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    text: t.title,
                    effort: t.effort,
                  })));
                }
                setBreakdownLoading(false);
              });
            }}>
              <Text style={styles.clarifySkipText}>Skip</Text>
            </Pressable>
          </View>
        </View>
      )}

      {creationMode === 'ai' && activeType === 'project' && clarifyLoading && !showClarify && breakdownSteps.length === 0 && !breakdownLoading && (
        <View style={styles.breakdownSection}>
          <View style={styles.breakdownHeader}>
            <ActivityIndicator size="small" color={T.brand} />
            <Text style={styles.breakdownTitle}>Analyzing complexity...</Text>
          </View>
        </View>
      )}

      {creationMode === 'ai' && activeType === 'project' && (breakdownSteps.length > 0 || breakdownLoading) && (
        <View style={styles.breakdownSection}>
          <View style={styles.breakdownHeader}>
            <Feather name="list" size={13} color={T.brand} />
            <Text style={styles.breakdownTitle}>Steps</Text>
            {breakdownLoading && <ActivityIndicator size="small" color={T.brand} />}
          </View>
          {breakdownSteps.map((step, stepIdx) => {
            const efConf = step.effort ? EFFORT_CONFIG[step.effort] : null;
            return (
              <View key={step.id} style={styles.breakdownRow}>
                <View style={styles.breakdownDot} />
                <View style={{ flex: 1 }}>
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
                    <Pressable onPress={() => setEditingStepId(step.id)}>
                      <Text style={styles.breakdownStepText} numberOfLines={2}>{step.text}</Text>
                    </Pressable>
                  )}
                  {efConf && (
                    <View style={[styles.breakdownEffort, { backgroundColor: efConf.color + '10' }]}>
                      <Feather name={efConf.icon} size={9} color={efConf.color} />
                      <Text style={[styles.breakdownEffortText, { color: efConf.color }]}>{efConf.sub}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.breakdownActions}>
                  <Pressable
                    hitSlop={4}
                    disabled={stepIdx === 0}
                    onPress={() => {
                      setBreakdownSteps(prev => {
                        const arr = [...prev];
                        [arr[stepIdx - 1], arr[stepIdx]] = [arr[stepIdx], arr[stepIdx - 1]];
                        return arr;
                      });
                    }}
                    style={{ opacity: stepIdx === 0 ? 0.25 : 1 }}
                  >
                    <Feather name="chevron-up" size={13} color={T.t3} />
                  </Pressable>
                  <Pressable
                    hitSlop={4}
                    disabled={stepIdx === breakdownSteps.length - 1}
                    onPress={() => {
                      setBreakdownSteps(prev => {
                        const arr = [...prev];
                        [arr[stepIdx], arr[stepIdx + 1]] = [arr[stepIdx + 1], arr[stepIdx]];
                        return arr;
                      });
                    }}
                    style={{ opacity: stepIdx === breakdownSteps.length - 1 ? 0.25 : 1 }}
                  >
                    <Feather name="chevron-down" size={13} color={T.t3} />
                  </Pressable>
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={() => setBreakdownSteps(prev => prev.filter(s => s.id !== step.id))}
                >
                  <Feather name="x" size={13} color={T.t3} />
                </Pressable>
              </View>
            );
          })}
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

      {creationMode === 'manual' && activeType === 'action' && text.trim() && (
        <View style={styles.manualSection}>
          <Text style={styles.manualSectionTitle}>Action details</Text>
          <Text style={styles.moreSectionLabel}>BEST TIME</Text>
          <View style={styles.optionRow}>
            {TOD_OPTIONS.map(o => {
              const on = tod === o.id;
              return (
                <Pressable key={o.id} style={[styles.optionChip, on && {
                  backgroundColor: T.green + '12', borderColor: T.green + '40',
                }]} onPress={() => setTod(prev => prev === o.id ? null : o.id)}>
                  <Feather name={o.icon} size={11} color={on ? T.green : T.t3} />
                  <Text style={[styles.optionChipLabel, on && { color: T.green, fontWeight: '700' as const }]}>{o.label}</Text>
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
                  backgroundColor: e.color + '12', borderColor: e.color + '40',
                }]} onPress={() => setEffort(e.id as Effort)}>
                  <Feather name={e.icon} size={11} color={on ? e.color : T.t3} />
                  <Text style={[styles.optionChipLabel, on && { color: e.color, fontWeight: '700' as const }]}>{e.label}</Text>
                  <Text style={[styles.optionChipSub, on && { color: e.color + 'AA' }]}>{e.sub}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.moreSectionLabel, { marginTop: 10 }]}>PRIORITY</Text>
          <View style={styles.optionRow}>
            {PRIORITY_OPTIONS.map(p => {
              const on = priority === p.id;
              return (
                <Pressable key={p.id} style={[styles.optionChip, on && {
                  backgroundColor: p.color + '12', borderColor: p.color + '40',
                }]} onPress={() => setPriority(p.id as Priority)}>
                  <Feather name={p.icon} size={11} color={on ? p.color : T.t3} />
                  <Text style={[styles.optionChipLabel, on && { color: p.color, fontWeight: '700' as const }]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {creationMode && text.trim() && activeType !== 'goal' && (
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
              <Feather name="grid" size={11} color={T.t3} />
              <Text style={styles.extraChipEmptyText}>Life area</Text>
            </Pressable>
          )}
        </View>
      )}

      {showAreaPicker && (
        <AreaPicker
          selected={area}
          onSelect={(id) => { setArea(id); setShowAreaPicker(false); }}
        />
      )}

      {activeType === 'goal' && !area && text.trim() && creationMode && (
        <AreaPicker
          selected={area}
          onSelect={setArea}
          label="Which area of your life?"
          required
        />
      )}

      <Pressable onPress={handleSave} disabled={!canSaveFinal} style={{ marginTop: S.md }}>
        <LinearGradient
          colors={canSaveFinal ? (typeConf ? [typeConf.color, typeConf.color + 'BB'] : T.gradColors) : [T.sep, T.sep]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.saveBtn}>
          <View style={styles.saveBtnInner}>
            {canSaveFinal && <Feather name="chevron-right" size={16} color="white" />}
            <Text style={[styles.saveBtnText, !canSaveFinal && { color: T.t3 }]}>{saveBtnLabel}</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );

  return (
    <View style={[styles.container, {
      backgroundColor: 'rgba(253,252,255,0.98)',
      paddingTop: webTopInset || insets.top,
      paddingBottom: webBottomInset || Math.max(insets.bottom, 16),
    }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },

  savedState:     { alignItems: 'center', paddingVertical: 32, gap: 10 },
  savedIcon:      { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  savedTitle:     { fontSize: F.lg, fontWeight: '800', color: T.text },
  savedSub:       { fontSize: F.sm, color: T.t3, textAlign: 'center' },

  linkGoalBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#5856D6' + '0A', borderWidth: 1, borderColor: '#5856D6' + '18', marginBottom: 10 },
  linkGoalText:   { fontSize: 12, fontWeight: '600' as const, color: '#5856D6', flex: 1 },

  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, marginBottom: 12, gap: 8 },
  title:          { fontSize: 19, fontWeight: '800', color: T.text, letterSpacing: -0.5 },
  closeBtn:       { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  inputWrap:      { borderRadius: 18, borderWidth: 2, marginBottom: 10, overflow: 'hidden' },
  input:          { fontSize: 16, color: T.text, padding: 14, fontWeight: '400' },
  typeBadge:      { position: 'absolute', right: 12, top: '50%', marginTop: -14, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  typeBadgeLabel: { fontSize: 11, fontWeight: '700' },

  hintArea:       { minHeight: 32, marginBottom: 10 },
  thinkingRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: T.brand + '0A', borderWidth: 1, borderColor: T.brand + '18' },
  thinkingIconBox:{ width: 26, height: 26, borderRadius: 8, backgroundColor: T.brand + '12', alignItems: 'center', justifyContent: 'center' },
  thinkingLine1:  { fontSize: 12, fontWeight: '600', color: T.brand },
  hintCard:       { flexDirection: 'row', gap: 7, padding: 10, borderRadius: 12, borderWidth: 1 },
  hintIconBox:    { width: 24, height: 24, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  hintWhy:        { fontSize: 12, color: T.t2, lineHeight: 17, fontStyle: 'italic', marginBottom: 4 },
  hintDetail:     { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.72)', padding: 5, borderRadius: 8 },
  hintDetailLabel:{ fontSize: 10, fontWeight: '700' },
  hintDetailText: { fontSize: 11, color: T.text, flex: 1, lineHeight: 15 },
  promoSection:   { marginBottom: 4 },
  promoLabel:     { fontSize: 11, fontWeight: '600' as const, color: T.t3, marginBottom: 8, letterSpacing: 0.2 },
  promoRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  promoChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 13, paddingRight: 5, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(108,92,231,0.06)', borderWidth: 1, borderColor: 'rgba(108,92,231,0.13)' },
  promoChipText:  { fontSize: 12, color: T.t2 },
  promoChipBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  promoChipBadgeText: { fontSize: 9, fontWeight: '700' as const },

  approachSection:{ marginBottom: 8 },
  approachLabel:  { fontSize: 11, fontWeight: '600' as const, color: T.t3, marginBottom: 8, letterSpacing: 0.2 },
  typeGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard:       { flexBasis: '47%' as any, flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'rgba(0,0,0,0.025)' },
  typeIconWrap:   { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  typeCardLabel:  { fontSize: 13, fontWeight: '700' as const, color: T.t2 },
  typeCardSub:    { fontSize: 10, color: T.t3 },
  typeDetailCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  typeDetailText: { fontSize: 12, lineHeight: 17, flex: 1 },

  modeSection:      { marginBottom: 10 },
  modeSectionLabel: { fontSize: 11, fontWeight: '600' as const, color: T.t3, marginBottom: 8, letterSpacing: 0.2 },
  modeRow:          { flexDirection: 'row', gap: 8 },
  modeCard:         { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'rgba(0,0,0,0.025)' },
  modeIconWrap:     { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modeCardLabel:    { fontSize: 13, fontWeight: '700' as const, color: T.t2 },
  modeCardSub:      { fontSize: 10, color: T.t3, lineHeight: 14 },

  followUpSection:  { backgroundColor: T.brand + '08', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: T.brand + '18' },
  followUpHeader:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  followUpTitle:    { fontSize: 14, fontWeight: '700', color: T.brand },
  followUpSubtext:  { fontSize: 12, color: T.t3, marginBottom: 10, lineHeight: 17 },
  followUpQRow:     { marginBottom: 10 },
  followUpQ:        { fontSize: 13, fontWeight: '600', color: T.text, marginBottom: 6 },
  followUpChipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  followUpChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'rgba(0,0,0,0.03)' },
  followUpChipLabel:{ fontSize: 12, fontWeight: '500', color: T.t3 },
  followUpInput:    { fontSize: 13, color: T.text, padding: 10, borderRadius: 10, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  followUpGenBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' as const, backgroundColor: T.brand, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, marginTop: 4 },
  followUpGenText:  { fontSize: 13, fontWeight: '700', color: 'white' },

  aiResultCard:     { borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1 },
  aiResultHeader:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  aiResultTitle:    { fontSize: 13, fontWeight: '700' },
  aiResultRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  aiResultText:     { fontSize: 12, color: T.t2, lineHeight: 17, flex: 1 },

  manualSection:    { backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  manualSectionTitle: { fontSize: 13, fontWeight: '700', color: T.text, marginBottom: 8 },
  manualSectionSub: { fontSize: 12, color: T.t3, marginBottom: 10 },

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
  extraChipEmpty: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  extraChipEmptyText: { fontSize: 12, color: T.t3 },

  moreSection:    { backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  moreSectionLabel: { fontSize: 10, fontWeight: '700', color: T.t3, letterSpacing: 0.5, marginBottom: 6 },
  optionRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  optionChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'rgba(0,0,0,0.03)' },
  optionChipLabel:{ fontSize: 12, fontWeight: '500', color: T.t3 },
  optionChipSub:  { fontSize: 10, color: T.t3, opacity: 0.7 },
  deadlineInput:  { padding: 10, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(0,0,0,0.09)', fontSize: 14, color: T.text, marginTop: 2 },

  clarifySection:   { backgroundColor: T.brand + '08', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: T.brand + '18' },
  clarifyHeader:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  clarifyTitle:     { fontSize: 14, fontWeight: '700', color: T.brand },
  clarifySubtext:   { fontSize: 12, color: T.t3, marginBottom: 10, lineHeight: 17 },
  clarifyQRow:      { marginBottom: 10 },
  clarifyQ:         { fontSize: 13, fontWeight: '600', color: T.text, marginBottom: 4 },
  clarifyInput:     { fontSize: 13, color: T.text, padding: 10, borderRadius: 10, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  clarifyActions:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  clarifyGenBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.brand, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  clarifyGenText:   { fontSize: 13, fontWeight: '700', color: 'white' },
  clarifySkipBtn:   { paddingHorizontal: 12, paddingVertical: 9 },
  clarifySkipText:  { fontSize: 13, fontWeight: '600', color: T.t3 },

  breakdownEffort:  { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' as const },
  breakdownEffortText: { fontSize: 10, fontWeight: '600' },
  breakdownActions: { flexDirection: 'column', gap: 0, marginRight: 4 },

  saveBtn:        { borderRadius: 20, padding: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnInner:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  saveBtnText:    { fontSize: 16, fontWeight: '700', color: 'white', letterSpacing: -0.3 },
});
