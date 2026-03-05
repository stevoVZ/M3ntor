import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  ActivityIndicator, Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { T, S, F, R, shadow } from '../../constants/theme';
import { AREAS } from '../../constants/config';
import { useStore } from '../../lib/store';
import { apiRequest } from '../../lib/query-client';
import * as Crypto from 'expo-crypto';

type WizardStep = 'goal' | 'details' | 'generating' | 'review' | 'saved';

interface ProgramAction {
  title: string;
  duration: string;
  description: string;
}

interface ProgramWeek {
  week: number;
  focus: string;
  actions: ProgramAction[];
}

interface GeneratedProgram {
  title: string;
  area: string;
  description: string;
  weeks: number;
  minutesPerDay: number;
  weekPlan: ProgramWeek[];
}

interface ProgramBuilderProps {
  onClose: () => void;
  onSave?: (program: GeneratedProgram) => void;
}

const SUGGESTIONS = [
  'Get promoted at work',
  'Learn to meditate daily',
  'Build a side income',
  'Improve my relationship',
  'Get fit without a gym',
  'Read more books',
  'Overcome social anxiety',
  'Start journaling',
  'Fix my sleep schedule',
];

export default function ProgramBuilder({ onClose, onSave }: ProgramBuilderProps) {
  const [step, setStep] = useState<WizardStep>('goal');
  const [goal, setGoal] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [weeks, setWeeks] = useState(4);
  const [minsPerDay, setMinsPerDay] = useState(15);
  const [program, setProgram] = useState<GeneratedProgram | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const enrollJourney = useStore(s => s.enrollJourney);

  const areasCatalog = AREAS.map(a => `${a.id}: ${a.n}`).join(', ');

  async function handleGenerate() {
    if (!goal.trim()) return;
    setStep('generating');
    try {
      const prompt = `You are an AI journey designer. Create a structured self-improvement journey based on the user's goal.\n\nAvailable life areas: ${areasCatalog}\n\nUser preferences: ${area ? `Area: ${area}` : 'Auto-detect best area'}, Duration: ${weeks} weeks, Time commitment: ${minsPerDay} min/day.\n\nRespond ONLY with valid JSON, no markdown backticks:\n{\n  "title": "Journey title (concise, action-oriented)",\n  "area": "area_id from list above",\n  "description": "1-2 sentence description",\n  "weeks": ${weeks},\n  "minutesPerDay": ${minsPerDay},\n  "weekPlan": [\n    {\n      "week": 1,\n      "focus": "Week theme (2-3 words)",\n      "actions": [\n        {"title": "Action name", "duration": "X minutes", "description": "Brief how-to"}\n      ]\n    }\n  ]\n}\n\nEach week should have 3-4 daily actions. Make actions specific, actionable, and progressive. Never use em dashes.\n\nMy goal: ${goal}`;

      const res = await apiRequest('POST', '/api/ai/assist', { prompt });
      const raw = await res.text();
      const text = raw.replace(/^"|"$/g, '').replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/```json|```/g, '').trim();
      const parsed: GeneratedProgram = JSON.parse(text);
      setProgram(parsed);
      setEditTitle(parsed.title);
      setStep('review');
    } catch {
      const fallback: GeneratedProgram = {
        title: `Custom: ${goal.slice(0, 30)}`,
        area: area || 'personal',
        description: `A personalized journey to help you ${goal.toLowerCase()}.`,
        weeks,
        minutesPerDay: minsPerDay,
        weekPlan: Array.from({ length: weeks }, (_, i) => ({
          week: i + 1,
          focus: i === 0 ? 'Foundation' : i === weeks - 1 ? 'Integration' : `Week ${i + 1} Focus`,
          actions: [
            { title: 'Morning intention setting', duration: '5 minutes', description: 'Start each day by writing your specific intention for this week\'s focus.' },
            { title: 'Core practice', duration: `${Math.max(5, minsPerDay - 10)} minutes`, description: 'Dedicated time for your main activity this week.' },
            { title: 'Evening reflection', duration: '5 minutes', description: 'Review what worked, what did not, and what to adjust tomorrow.' },
          ],
        })),
      };
      setProgram(fallback);
      setEditTitle(fallback.title);
      setStep('review');
    }
  }

  function handleRemoveAction(weekIdx: number, actionIdx: number) {
    if (!program) return;
    setProgram({
      ...program,
      weekPlan: program.weekPlan.map((w, wi) =>
        wi === weekIdx ? { ...w, actions: w.actions.filter((_, ai) => ai !== actionIdx) } : w
      ),
    });
  }

  function handleSave() {
    if (!program) return;
    const saved = { ...program, title: editTitle || program.title };
    setProgram(saved);
    setStep('saved');
    if (onSave) onSave(saved);
  }

  function handleStartJourney() {
    if (program) {
      const journeyId = 'custom-' + Crypto.randomUUID();
      enrollJourney(journeyId);
    }
    onClose();
  }

  const totalActions = program ? program.weekPlan.reduce((sum, w) => sum + w.actions.length, 0) : 0;

  const areaColor = program ? (AREAS.find(a => a.id === program.area)?.c ?? T.brand) : T.brand;

  const headerTitle =
    step === 'goal' ? 'Build Your Journey' :
    step === 'details' ? 'Customize' :
    step === 'generating' ? 'Creating...' :
    step === 'review' ? 'Review Journey' : 'Journey Created';

  const headerSub =
    step === 'goal' ? 'Describe your goal' :
    step === 'details' ? 'Set your preferences' :
    step === 'generating' ? 'AI is designing your journey' :
    step === 'review' ? 'Edit anything before saving' : 'Ready to start';

  function handleBack() {
    if (step === 'review') setStep('details');
    else if (step === 'details') setStep('goal');
    else onClose();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={step === 'saved' ? onClose : handleBack}>
          <Feather name={step === 'saved' ? 'x' : 'chevron-left'} size={18} color={T.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <Text style={styles.headerSub}>{headerSub}</Text>
        </View>
      </View>

      {step === 'goal' && (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, shadow.sm]}>
            <View style={styles.cardHeader}>
              <View style={styles.goalIcon}>
                <Feather name="zap" size={16} color="white" />
              </View>
              <Text style={styles.cardLabel}>What's your goal?</Text>
            </View>
            <TextInput
              value={goal}
              onChangeText={setGoal}
              placeholder="e.g. I want to transition into a product management role, I want to run a half marathon..."
              placeholderTextColor={T.t3}
              style={styles.goalInput}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <Text style={styles.suggestLabel}>OR START FROM AN IDEA</Text>
          <View style={styles.chips}>
            {SUGGESTIONS.map((s, i) => (
              <Pressable
                key={i}
                style={[styles.chip, goal === s && styles.chipActive]}
                onPress={() => setGoal(s)}
              >
                <Text style={[styles.chipText, goal === s && styles.chipTextActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.primaryBtn, !goal.trim() && styles.primaryBtnDisabled]}
            onPress={() => goal.trim() && setStep('details')}
            disabled={!goal.trim()}
          >
            <Text style={[styles.primaryBtnText, !goal.trim() && { color: T.t3 }]}>Continue</Text>
          </Pressable>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {step === 'details' && (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.goalPreview, { borderColor: T.brand + '20' }]}>
            <Feather name="target" size={18} color={T.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.goalPreviewLabel}>Your goal</Text>
              <Text style={styles.goalPreviewText}>{goal}</Text>
            </View>
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={styles.sectionLabel}>Life area</Text>
            <Text style={styles.sectionSub}>Pick one, or leave it for AI to decide</Text>
            <View style={styles.chips}>
              <Pressable
                style={[styles.areaChip, !area && styles.areaChipActive]}
                onPress={() => setArea(null)}
              >
                <Ionicons name="sparkles" size={12} color={!area ? T.brand : T.t3} />
                <Text style={[styles.areaChipText, !area && { color: T.brand }]}>Auto-detect</Text>
              </Pressable>
              {AREAS.map(a => (
                <Pressable
                  key={a.id}
                  style={[styles.areaChip, area === a.id && { backgroundColor: a.c + '10', borderColor: a.c }]}
                  onPress={() => setArea(a.id)}
                >
                  <Text style={[styles.areaChipText, area === a.id && { color: a.c }]}>{a.n}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.card, shadow.sm, { marginBottom: 16 }]}>
            <View style={styles.stepperRow}>
              <View>
                <Text style={styles.stepperLabel}>Duration</Text>
                <Text style={styles.stepperSub}>How many weeks?</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable style={styles.stepperBtn} onPress={() => setWeeks(w => Math.max(1, w - 1))}>
                  <Feather name="minus" size={16} color={T.text} />
                </Pressable>
                <Text style={styles.stepperValue}>{weeks}</Text>
                <Pressable style={styles.stepperBtn} onPress={() => setWeeks(w => Math.min(12, w + 1))}>
                  <Feather name="plus" size={16} color={T.text} />
                </Pressable>
              </View>
            </View>
            <View style={[styles.stepperRow, { marginTop: 16 }]}>
              <View>
                <Text style={styles.stepperLabel}>Time per day</Text>
                <Text style={styles.stepperSub}>Minutes of daily commitment</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable style={styles.stepperBtn} onPress={() => setMinsPerDay(m => Math.max(5, m - 5))}>
                  <Feather name="minus" size={16} color={T.text} />
                </Pressable>
                <Text style={styles.stepperValue}>{minsPerDay}m</Text>
                <Pressable style={styles.stepperBtn} onPress={() => setMinsPerDay(m => Math.min(60, m + 5))}>
                  <Feather name="plus" size={16} color={T.text} />
                </Pressable>
              </View>
            </View>
          </View>

          <Pressable style={[styles.primaryBtn, shadow.lg]} onPress={handleGenerate}>
            <Ionicons name="sparkles" size={18} color="white" />
            <Text style={styles.primaryBtnText}>Generate My Journey</Text>
          </Pressable>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {step === 'generating' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={T.brand} style={{ marginBottom: 24 }} />
          <Text style={styles.genTitle}>Designing your journey</Text>
          <Text style={styles.genSub}>
            Building a {weeks}-week plan with daily actions
            {area ? ` focused on ${AREAS.find(a => a.id === area)?.n ?? area}` : ''}...
          </Text>
          <Text style={styles.genHint}>This usually takes a few seconds</Text>
        </View>
      )}

      {step === 'review' && program && (
        <ScrollView ref={scrollRef} style={styles.body} contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.card, shadow.sm, { marginBottom: 14 }]}>
            <View style={styles.reviewHeader}>
              <View style={[styles.reviewIcon, { backgroundColor: areaColor + '12' }]}>
                <Feather name="zap" size={22} color={areaColor} />
              </View>
              <View style={{ flex: 1 }}>
                {editingTitle ? (
                  <TextInput
                    value={editTitle}
                    onChangeText={setEditTitle}
                    onBlur={() => setEditingTitle(false)}
                    onSubmitEditing={() => setEditingTitle(false)}
                    autoFocus
                    style={styles.titleInput}
                  />
                ) : (
                  <View style={styles.titleRow}>
                    <Text style={styles.reviewTitle}>{editTitle}</Text>
                    <Pressable onPress={() => setEditingTitle(true)} hitSlop={8}>
                      <Feather name="edit-2" size={14} color={T.t3} />
                    </Pressable>
                  </View>
                )}
                <Text style={styles.reviewDesc}>{program.description}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.stat, { backgroundColor: T.brand + '08' }]}>
                <Feather name="calendar" size={14} color={T.brand} />
                <Text style={[styles.statText, { color: T.brand }]}>{program.weeks} weeks</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: T.orange + '08' }]}>
                <Feather name="clock" size={14} color={T.orange} />
                <Text style={[styles.statText, { color: T.orange }]}>{program.minutesPerDay}m/day</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: T.green + '08' }]}>
                <Feather name="list" size={14} color={T.green} />
                <Text style={[styles.statText, { color: T.green }]}>{totalActions} actions</Text>
              </View>
            </View>
          </View>

          {program.weekPlan.map((week, wi) => (
            <View key={wi} style={[styles.weekCard, shadow.xs]}>
              <View style={styles.weekHeader}>
                <View style={[styles.weekBadge, { backgroundColor: areaColor }]}>
                  <Text style={styles.weekBadgeText}>{week.week}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weekTitle}>Week {week.week}</Text>
                  <Text style={styles.weekFocus}>{week.focus}</Text>
                </View>
                <Text style={styles.weekCount}>{week.actions.length} actions</Text>
              </View>
              {week.actions.map((action, ai) => (
                <View key={ai} style={[styles.actionRow, ai < week.actions.length - 1 && styles.actionRowBorder]}>
                  <View style={[styles.actionDot, { backgroundColor: areaColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionDuration}>{action.duration}</Text>
                  </View>
                  <Pressable onPress={() => handleRemoveAction(wi, ai)} hitSlop={8}>
                    <Feather name="trash-2" size={14} color={T.t3} />
                  </Pressable>
                </View>
              ))}
            </View>
          ))}

          <View style={styles.aiAttribution}>
            <View style={styles.aiAvatar}>
              <Text style={styles.aiAvatarText}>M3</Text>
            </View>
            <Text style={styles.aiNote}>AI-generated program. Remove actions you don't need.</Text>
          </View>

          <Pressable style={[styles.primaryBtn, shadow.lg]} onPress={handleSave}>
            <Feather name="check" size={18} color="white" />
            <Text style={styles.primaryBtnText}>Save Journey</Text>
          </Pressable>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {step === 'saved' && program && (
        <View style={styles.centered}>
          <View style={styles.successCircle}>
            <Feather name="check" size={36} color={T.green} />
          </View>
          <Text style={styles.savedTitle}>Journey Created</Text>
          <Text style={styles.savedName}>{editTitle || program.title}</Text>
          <Text style={styles.savedMeta}>
            {program.weeks} weeks  ·  {program.minutesPerDay}m/day  ·  {totalActions} actions
          </Text>
          <View style={styles.savedActions}>
            <Pressable style={[styles.primaryBtn, shadow.lg]} onPress={handleStartJourney}>
              <Text style={styles.primaryBtnText}>Start Journey</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>Back to Programs</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: S.md, paddingVertical: 10,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: T.fill,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: T.text },
  headerSub: { fontSize: 12, color: T.t3 },

  body: { flex: 1 },
  bodyContent: { paddingHorizontal: S.md, paddingTop: 8 },

  card: {
    backgroundColor: 'white', borderRadius: 20,
    borderWidth: 0.5, borderColor: T.sep, padding: 20, marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  goalIcon: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: T.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { fontSize: 14, fontWeight: '700' as const, color: T.text },

  goalInput: {
    padding: 14, paddingHorizontal: 16, borderRadius: 14,
    borderWidth: 0.5, borderColor: T.sep, backgroundColor: T.fill,
    fontSize: 15, color: T.text, lineHeight: 22, minHeight: 100,
  },

  suggestLabel: {
    fontSize: 12, fontWeight: '600' as const, color: T.t3,
    letterSpacing: 0.5, marginBottom: 8, paddingLeft: 4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
    borderWidth: 0.5, borderColor: T.sep, backgroundColor: 'white',
  },
  chipActive: { backgroundColor: T.brand + '08', borderColor: T.brand },
  chipText: { fontSize: 13, color: T.t2, fontWeight: '500' as const },
  chipTextActive: { color: T.brand },

  primaryBtn: {
    borderRadius: 14, paddingVertical: 15, backgroundColor: T.brand,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  primaryBtnDisabled: { backgroundColor: T.fill },
  primaryBtnText: { fontSize: 16, fontWeight: '700' as const, color: 'white' },

  goalPreview: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: T.brand + '06', borderRadius: 14, padding: 12,
    paddingHorizontal: 16, borderWidth: 0.5, marginBottom: 20,
  },
  goalPreviewLabel: { fontSize: 12, fontWeight: '600' as const, color: T.brand, marginBottom: 2 },
  goalPreviewText: { fontSize: 14, color: T.text, lineHeight: 20 },

  sectionLabel: { fontSize: 14, fontWeight: '700' as const, color: T.text, marginBottom: 4 },
  sectionSub: { fontSize: 12, color: T.t3, marginBottom: 10 },

  areaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10,
    borderWidth: 0.5, borderColor: T.sep, backgroundColor: 'white',
  },
  areaChipActive: { backgroundColor: T.brand + '08', borderColor: T.brand },
  areaChipText: { fontSize: 12.5, fontWeight: '600' as const, color: T.t2 },

  stepperRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  stepperLabel: { fontSize: 14, fontWeight: '700' as const, color: T.text },
  stepperSub: { fontSize: 12, color: T.t3 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: {
    width: 32, height: 32, borderRadius: 10, borderWidth: 0.5, borderColor: T.sep,
    backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 22, fontWeight: '700' as const, color: T.text, minWidth: 40, textAlign: 'center' as const,
  },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  genTitle: { fontSize: 18, fontWeight: '700' as const, color: T.text, marginBottom: 8, textAlign: 'center' as const },
  genSub: { fontSize: 14, color: T.t3, textAlign: 'center' as const, lineHeight: 21 },
  genHint: { marginTop: 20, fontSize: 13, color: T.t3, opacity: 0.6 },

  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  reviewIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewTitle: { fontSize: 18, fontWeight: '700' as const, color: T.text, lineHeight: 24, flex: 1 },
  titleInput: {
    fontSize: 18, fontWeight: '700' as const, color: T.text,
    borderBottomWidth: 2, borderBottomColor: T.brand, paddingVertical: 2,
  },
  reviewDesc: { fontSize: 13, color: T.t3, marginTop: 4, lineHeight: 19 },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  stat: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10,
  },
  statText: { fontSize: 12, fontWeight: '600' as const },

  weekCard: {
    backgroundColor: 'white', borderRadius: 18, borderWidth: 0.5,
    borderColor: T.sep, overflow: 'hidden', marginBottom: 10,
  },
  weekHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, paddingHorizontal: 16,
    borderBottomWidth: 0.5, borderBottomColor: T.sep,
  },
  weekBadge: {
    width: 28, height: 28, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  weekBadgeText: { fontSize: 12, fontWeight: '800' as const, color: 'white' },
  weekTitle: { fontSize: 14, fontWeight: '700' as const, color: T.text },
  weekFocus: { fontSize: 12, color: T.t3 },
  weekCount: { fontSize: 11, color: T.t3 },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  actionRowBorder: { borderBottomWidth: 0.5, borderBottomColor: T.sep },
  actionDot: { width: 6, height: 6, borderRadius: 3 },
  actionTitle: { fontSize: 13.5, fontWeight: '600' as const, color: T.text },
  actionDuration: { fontSize: 12, color: T.t3 },

  aiAttribution: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, justifyContent: 'center', marginBottom: 16,
  },
  aiAvatar: {
    width: 20, height: 20, borderRadius: 6, backgroundColor: T.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  aiAvatarText: { fontSize: 7, fontWeight: '800' as const, color: 'white' },
  aiNote: { fontSize: 12, color: T.t3 },

  successCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: T.green + '12',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  savedTitle: { fontSize: 24, fontWeight: '700' as const, color: T.text, marginBottom: 8, textAlign: 'center' as const },
  savedName: { fontSize: 15, color: T.t3, marginBottom: 8, textAlign: 'center' as const, lineHeight: 22 },
  savedMeta: { fontSize: 14, color: T.t3, marginBottom: 32, textAlign: 'center' as const },
  savedActions: { width: '100%', gap: 10 },

  secondaryBtn: {
    borderRadius: 14, paddingVertical: 13, borderWidth: 0.5,
    borderColor: T.sep, backgroundColor: 'white', alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' as const, color: T.t2 },
});
