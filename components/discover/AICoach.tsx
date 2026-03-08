import { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { T, S, F, R, shadow } from '../../constants/theme';
import { ITEM_AREAS, PRG, AREAS } from '../../constants/config';
import { useStore } from '../../lib/store';
import { apiRequest } from '../../lib/query-client';
import type { Journey } from '../../types';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface AiResult {
  intro: string;
  programs: { id: string; reason: string }[];
}

function RecommendedCard({ journey, reason }: { journey: Journey; reason: string }) {
  const area = ITEM_AREAS[journey.a] ?? ITEM_AREAS.learning;
  const enrollJourney = useStore(s => s.enrollJourney);
  const journeys = useStore(s => s.journeys);
  const enrolled = journeys.some(j => j.journey_id === journey.id);

  return (
    <View style={[recStyles.card, shadow.sm]}>
      <View style={recStyles.top}>
        <View style={[recStyles.icon, { backgroundColor: area.c + '18' }]}>
          <Text style={{ fontSize: 18 }}>{area.e}</Text>
        </View>
        <View style={recStyles.info}>
          <Text style={recStyles.title}>{journey.t}</Text>
          <Text style={recStyles.meta}>{journey.e} · {journey.w} weeks · {journey.m} min/day</Text>
        </View>
        <Feather name="chevron-right" size={16} color={T.t3} />
      </View>
      <View style={recStyles.reasonRow}>
        <View style={recStyles.sparkle}>
          <Ionicons name="sparkles" size={10} color="white" />
        </View>
        <Text style={recStyles.reasonText}>{reason}</Text>
      </View>
      <Pressable
        style={[recStyles.enrollBtn, { backgroundColor: enrolled ? T.green : area.c }]}
        onPress={() => !enrolled && enrollJourney(journey.id)}
        disabled={enrolled}
      >
        {enrolled ? (
          <Feather name="check" size={14} color="white" />
        ) : (
          <Text style={recStyles.enrollText}>Enrol</Text>
        )}
      </Pressable>
    </View>
  );
}

const recStyles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: R.lg, marginBottom: S.sm, padding: S.md, borderWidth: 0.5, borderColor: T.sep },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { fontSize: F.md, fontWeight: '700' as const, color: T.text, lineHeight: 20 },
  meta: { fontSize: 11, color: T.t3, marginTop: 2 },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  sparkle: { width: 18, height: 18, borderRadius: 5, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  reasonText: { flex: 1, fontSize: 13, color: T.t2, lineHeight: 19 },
  enrollBtn: { borderRadius: 10, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  enrollText: { fontSize: 13, fontWeight: '700' as const, color: 'white' },
});

interface AICoachProps {
  onClose: () => void;
}

export default function AICoach({ onClose }: AICoachProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AiResult | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const country = useStore(s => s.profile?.country);

  const visiblePRG = PRG.filter(p =>
    p.scope !== 'regional' || !country || (p.regions ?? []).includes(country)
  );

  const programCatalog = visiblePRG.map(p => {
    const regional = p.scope === 'regional' ? ' [Regional]' : '';
    return `${p.id}: "${p.t}" (${ITEM_AREAS[p.a]?.n ?? p.a}) - ${p.ds}${regional}`;
  }).join('\n');

  const areasWithPrograms = AREAS.filter(a => PRG.some(p => p.a === a.id));

  const suggestions = [
    'I want to find a new job',
    'Help me sleep better',
    'I want to build better habits',
    'How do I manage my money',
  ];

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  function handleFilterArea(areaId: string) {
    const areaName = ITEM_AREAS[areaId]?.n ?? areaId;
    const matched = PRG.filter(p => p.a === areaId);
    setResults({
      intro: `Here are the ${areaName.toLowerCase()} journeys available.`,
      programs: matched.map(p => ({ id: p.id, reason: p.ds })),
    });
    setMessages([
      { role: 'user', text: `Show me ${areaName.toLowerCase()} journeys` },
      { role: 'assistant', text: `Here are the ${areaName.toLowerCase()} journeys available.` },
    ]);
    scrollToEnd();
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    setResults(null);
    scrollToEnd();

    try {
      const countryCtx = country ? `\nThe user is based in a country with code "${country}". Prefer global journeys but also include region-specific ones if they match. When giving reasons, mention local relevance for regional programs.` : '';
      const prompt = `You are an AI helping users find the right self-improvement journeys. Here is the full journey catalog:\n\n${programCatalog}${countryCtx}\n\nThe user will describe a goal, problem, or aspiration. Respond with:\n1. A brief 1-2 sentence empathetic acknowledgement of their goal\n2. 2-4 recommended journey IDs from the catalog that best match, with a short reason for each\n\nRespond ONLY with valid JSON, no markdown backticks:\n{"intro":"your acknowledgement","programs":[{"id":"program_id","reason":"why this helps"}]}\n\nUser message: ${userMsg}`;

      const res = await apiRequest('POST', '/api/ai/assist', { prompt });
      const raw = await res.text();
      const text = raw.replace(/^"|"$/g, '').replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/```json|```/g, '').trim();
      const parsed: AiResult = JSON.parse(text);
      setResults(parsed);
      setMessages(prev => [...prev, { role: 'assistant', text: parsed.intro }]);
    } catch {
      const lower = userMsg.toLowerCase();
      const matched = visiblePRG.filter(p =>
        p.t.toLowerCase().includes(lower) || p.ds.toLowerCase().includes(lower) ||
        (ITEM_AREAS[p.a]?.n ?? '').toLowerCase().includes(lower)
      ).slice(0, 3);
      const fallback: AiResult = {
        intro: matched.length > 0
          ? 'Here are some journeys that could help with what you are looking for.'
          : 'I could not find an exact match, but here are some popular journeys to explore.',
        programs: (matched.length > 0 ? matched : visiblePRG.filter(p => p.f)).map(p => ({
          id: p.id, reason: p.scope === 'regional' ? `${p.ds} (Recommended in your region)` : p.ds,
        })),
      };
      setResults(fallback);
      setMessages(prev => [...prev, { role: 'assistant', text: fallback.intro }]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onClose}>
          <Feather name="chevron-left" size={20} color={T.text} />
        </Pressable>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>M3</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Ask M3NTOR</Text>
          <Text style={styles.headerSub}>Tell me your goals and I'll find the right journey</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.areaFilters}
        contentContainerStyle={{ gap: 6, paddingHorizontal: S.md, paddingVertical: 2 }}
      >
        <Pressable
          style={[styles.areaChip, { backgroundColor: T.brand }]}
          onPress={() => { setMessages([]); setResults(null); }}
        >
          <Text style={[styles.areaChipText, { color: 'white' }]}>All</Text>
        </Pressable>
        {areasWithPrograms.map(a => {
          const count = PRG.filter(p => p.a === a.id).length;
          return (
            <Pressable
              key={a.id}
              style={[styles.areaChip, { backgroundColor: T.fill }]}
              onPress={() => handleFilterArea(a.id)}
            >
              <Text style={styles.areaChipText}>{a.n.split(' ')[0]}</Text>
              <Text style={styles.areaCount}>({count})</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyHeader}>
              <View style={styles.botAvatar}>
                <Text style={styles.botAvatarText}>M3</Text>
              </View>
              <Text style={styles.botName}>M3NTOR</Text>
            </View>
            <Text style={styles.emptyDesc}>
              Describe a goal, challenge, or something you want to improve. I'll recommend the best journeys for you.
            </Text>
            {!country && (
              <View style={styles.regionHint}>
                <Feather name="globe" size={12} color={T.t3} />
                <Text style={styles.regionHintText}>Set your region in Profile for local recommendations</Text>
              </View>
            )}
            <Text style={styles.suggestLabel}>TRY SOMETHING LIKE</Text>
            {suggestions.map((s, i) => (
              <Pressable
                key={i}
                style={styles.suggestion}
                onPress={() => setInput(s)}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {messages.map((m, i) => (
          <View
            key={i}
            style={[styles.bubbleRow, m.role === 'user' ? styles.bubbleRowUser : styles.bubbleRowBot]}
          >
            <View style={[
              styles.bubble,
              m.role === 'user' ? styles.bubbleUser : styles.bubbleBot,
            ]}>
              <Text style={[
                styles.bubbleText,
                m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot,
              ]}>{m.text}</Text>
            </View>
          </View>
        ))}

        {loading && (
          <View style={styles.typingRow}>
            <View style={styles.typingAvatar}>
              <Text style={styles.typingAvatarText}>M3</Text>
            </View>
            <ActivityIndicator size="small" color={T.brand} />
            <Text style={styles.typingText}>Finding the best journeys for you...</Text>
          </View>
        )}

        {results && results.programs && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsLabel}>RECOMMENDED JOURNEYS</Text>
            {results.programs.map((rec) => {
              const prog = PRG.find(p => p.id === rec.id);
              if (!prog) return null;
              return <RecommendedCard key={rec.id} journey={prog} reason={rec.reason} />;
            })}
            <Text style={styles.tryAgain}>
              Not quite right? Try describing your goal differently below.
            </Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="What do you want to work on?"
          placeholderTextColor={T.t3}
          style={styles.textInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!loading}
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: input.trim() ? T.brand : T.fill }]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          <Feather name="send" size={16} color={input.trim() ? 'white' : T.t3} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: S.md, paddingVertical: 10 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: T.fill, alignItems: 'center' as const, justifyContent: 'center' as const },
  headerAvatar: { width: 30, height: 30, borderRadius: 8, backgroundColor: T.brand, alignItems: 'center' as const, justifyContent: 'center' as const },
  headerAvatarText: { fontSize: 10, fontWeight: '800' as const, color: 'white' },
  headerTitle: { fontSize: 17, fontWeight: '700' as const, color: T.text },
  headerSub: { fontSize: 12, color: T.t3 },

  areaFilters: { flexShrink: 0, marginBottom: 4 },
  areaChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  areaChipText: { fontSize: 12, fontWeight: '600' as const, color: T.t2 },
  areaCount: { fontSize: 10, color: T.t3, opacity: 0.7 },

  chatArea: { flex: 1 },
  chatContent: { paddingHorizontal: S.md, paddingTop: S.sm },

  emptyState: {
    backgroundColor: 'white', borderRadius: 20, borderWidth: 0.5, borderColor: T.sep,
    padding: 20, marginBottom: S.md,
  },
  emptyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  botAvatar: { width: 32, height: 32, borderRadius: 10, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' },
  botAvatarText: { fontSize: 11, fontWeight: '800' as const, color: 'white' },
  botName: { fontSize: 14, fontWeight: '700' as const, color: T.text },
  emptyDesc: { fontSize: 15, color: T.t2, lineHeight: 24, marginBottom: S.md },
  regionHint: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, backgroundColor: T.fill, borderRadius: 8, padding: 10, marginBottom: 12 },
  regionHintText: { fontSize: 12, color: T.t3, flex: 1 },
  suggestLabel: { fontSize: 12, fontWeight: '600' as const, color: T.t3, letterSpacing: 0.5, marginBottom: 8 },
  suggestion: {
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: T.brand + '08', borderWidth: 0.5, borderColor: T.brand + '20',
    marginBottom: 6,
  },
  suggestionText: { fontSize: 14, color: T.brand, fontWeight: '500' as const },

  bubbleRow: { marginBottom: 10 },
  bubbleRowUser: { alignItems: 'flex-end' },
  bubbleRowBot: { alignItems: 'flex-start' },
  bubble: { maxWidth: '85%', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18 },
  bubbleUser: { backgroundColor: T.brand, borderBottomRightRadius: 6 },
  bubbleBot: { backgroundColor: 'white', borderWidth: 0.5, borderColor: T.sep, borderBottomLeftRadius: 6 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: 'white' },
  bubbleTextBot: { color: T.text },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  typingAvatar: { width: 28, height: 28, borderRadius: 8, backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' },
  typingAvatarText: { fontSize: 9, fontWeight: '800' as const, color: 'white' },
  typingText: { fontSize: 14, color: T.t3 },

  resultsSection: { marginTop: 4 },
  resultsLabel: { fontSize: 12, fontWeight: '600' as const, color: T.t3, letterSpacing: 0.5, marginBottom: 8, paddingLeft: 4 },
  tryAgain: { textAlign: 'center' as const, fontSize: 13, color: T.t3, marginTop: S.md },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: S.md, paddingTop: 8, paddingBottom: Platform.OS === 'web' ? 34 : 20,
    borderTopWidth: 0.5, borderTopColor: T.sep, backgroundColor: T.bg,
  },
  textInput: {
    flex: 1, padding: 12, paddingHorizontal: 16, borderRadius: 14,
    borderWidth: 0.5, borderColor: T.sep, backgroundColor: 'white',
    fontSize: 15, color: T.text,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
