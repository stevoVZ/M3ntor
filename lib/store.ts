import { create } from 'zustand';
import type { Item, Step, Subtask, JourneyProgress, Profile, CompletionLog, MoodEntry, MoodValue } from '../types';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured, fetchItems, fetchJourneyProgress, upsertItem, deleteItem, upsertStep, upsertCompletionLog, fetchCompletionLogs, upsertMoodEntry, fetchMoodEntries } from './supabase';
import { SAMPLE_ITEMS, SAMPLE_COMMITTED } from '../constants/sample-data';
import type { SampleItem, SampleStep, SampleSubtask, CommittedEntry } from '../constants/sample-data';

function convertSubtask(st: SampleSubtask, stepId: string, idx: number): Subtask {
  return {
    id: st.id,
    step_id: stepId,
    title: st.title,
    done: st.done,
    assignees: st.assignees,
    sort_order: idx,
  };
}

function convertStep(s: SampleStep, itemId: string, idx: number): Step {
  return {
    id: s.id,
    item_id: itemId,
    title: s.title,
    description: s.description,
    done: s.done,
    status: (s.status as Step['status']) ?? 'todo',
    priority: (s.priority as Step['priority']) ?? 'normal',
    effort: (s.effort as Step['effort']) ?? 'medium',
    today: s.today ?? false,
    blocked_by: s.blockedBy ?? [],
    assignees: s.assignees,
    sort_order: idx,
    subtasks: s.subtasks?.map((st, si) => convertSubtask(st, s.id, si)),
  };
}

function convertSampleItem(si: SampleItem): Item {
  const now = new Date().toISOString();
  return {
    id: si.id,
    user_id: 'guest',
    title: si.title,
    emoji: si.emoji,
    description: si.description,
    area: si.area,
    secondary_areas: si.secondaryAreas,
    status: si.status as Item['status'],
    source: si.source as Item['source'],
    priority: 'normal',
    effort: 'medium',
    deadline: si.deadline,
    steps: si.steps?.map((s, idx) => convertStep(s, si.id, idx)),
    linked_items: si.linkedItems,
    linked_journeys: si.linkedJourneys,
    created_at: now,
    updated_at: now,
  };
}

function convertCommittedToJourney(c: CommittedEntry): JourneyProgress {
  return {
    id: Crypto.randomUUID(),
    user_id: 'guest',
    journey_id: c.id,
    status: c.status === 'completed' ? 'done' : c.status === 'active' ? 'active' : 'paused',
    current_week: c.week,
    current_day: c.day,
    streak: c.status === 'active' ? c.day : 0,
    enrolled_at: new Date().toISOString(),
  };
}

const COMPLETION_LOG_KEY = 'm3ntor_completion_log';
const MOOD_LOG_KEY = 'm3ntor_mood_log';
const COUNTRY_KEY = 'm3ntor_country';

async function saveCompletionLogToStorage(log: CompletionLog) {
  try {
    await AsyncStorage.setItem(COMPLETION_LOG_KEY, JSON.stringify(log));
  } catch (e) {
    console.error('Failed to save completionLog:', e);
  }
}

async function saveMoodLogToStorage(log: MoodEntry[]) {
  try {
    await AsyncStorage.setItem(MOOD_LOG_KEY, JSON.stringify(log));
  } catch (e) {
    console.error('Failed to save moodLog:', e);
  }
}

async function loadCompletionLogFromStorage(): Promise<CompletionLog> {
  try {
    const raw = await AsyncStorage.getItem(COMPLETION_LOG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function loadMoodLogFromStorage(): Promise<MoodEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(MOOD_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

interface AppState {
  items:         Item[];
  journeys:      JourneyProgress[];
  profile:       Profile | null;
  userId:        string | null;
  loading:       boolean;
  error:         string | null;
  completionLog: CompletionLog;
  moodLog:       MoodEntry[];

  setUserId:       (id: string | null) => void;
  setProfile:      (p: Profile | null) => void;
  setCountry:      (country: string | null) => void;
  loadAll:         (userId: string) => Promise<void>;

  addItem:         (item: Item) => void;
  updateItem:      (id: string, patch: Partial<Item>) => void;
  removeItem:      (id: string) => void;
  pauseItem:       (id: string) => void;
  resumeItem:      (id: string) => void;
  completeItem:    (id: string) => void;
  activateDream:   (id: string, asType?: 'habit' | 'project' | 'action') => void;

  toggleStep:      (itemId: string, stepId: string, done: boolean) => void;
  markStepToday:   (itemId: string, stepId: string, today: boolean) => void;
  addStep:         (itemId: string, step: Step) => void;
  removeStep:      (itemId: string, stepId: string) => void;
  updateStep:      (itemId: string, stepId: string, patch: Partial<Step>) => void;
  updateStepStatus:(itemId: string, stepId: string, status: string) => void;

  toggleSubtask:   (itemId: string, stepId: string, subtaskId: string) => void;
  addSubtask:      (itemId: string, stepId: string, subtask: Subtask) => void;
  removeSubtask:   (itemId: string, stepId: string, subtaskId: string) => void;

  enrollJourney:   (journeyId: string) => void;
  recordCompletion:(actionId: string, status: 'done' | 'skipped') => void;
  recordMood:      (mood: MoodValue) => void;

  streak:          () => number;
  weeklyData:      () => { label: string; date: string; done: number; total: number; isToday: boolean }[];
  activeItems:     () => Item[];
  pausedItems:     () => Item[];
  somedayItems:    () => Item[];
  doneItems:       () => Item[];
  projectItems:    () => Item[];
  habitItems:      () => Item[];
  actionItems:     () => Item[];
  itemsByArea:     (area: string) => Item[];
  getItem:         (id: string) => Item | undefined;
}

function syncItem(item: Item | undefined) {
  if (item && item.user_id !== 'guest') {
    upsertItem(item as unknown as Record<string, unknown>).catch(console.error);
  }
}

export const useStore = create<AppState>((set, get) => ({
  items:         [],
  journeys:      [],
  profile:       null,
  userId:        null,
  loading:       false,
  error:         null,
  completionLog: {},
  moodLog:       [],

  setUserId:  (id) => set({ userId: id }),
  setProfile: (p)  => set({ profile: p }),
  setCountry: (country) => {
    set(s => ({
      profile: s.profile ? { ...s.profile, country: country ?? undefined } : null,
    }));
    AsyncStorage.setItem(COUNTRY_KEY, country ?? '').catch(console.error);
    const uid = get().userId;
    if (uid && uid !== 'guest' && isSupabaseConfigured && supabase) {
      supabase.from('profiles').update({ country }).eq('id', uid).then(({ error }) => {
        if (error) console.error('Failed to save country:', error);
      });
    }
  },

  loadAll: async (userId) => {
    set({ loading: true, error: null });
    try {
      const effectiveUserId = userId ?? 'guest';
      const isGuest = effectiveUserId === 'guest';

      const [localCompletionLog, localMoodLog, savedCountry] = await Promise.all([
        loadCompletionLogFromStorage(),
        loadMoodLogFromStorage(),
        AsyncStorage.getItem(COUNTRY_KEY).catch(() => null),
      ]);

      if (isGuest) {
        const sampleItems = SAMPLE_ITEMS.map(convertSampleItem);
        const sampleJourneys = SAMPLE_COMMITTED
          .filter(c => c.status !== 'queued')
          .map(convertCommittedToJourney);
        set({
          items: sampleItems,
          journeys: sampleJourneys,
          profile: { id: 'guest', created_at: new Date().toISOString(), country: savedCountry || undefined },
          completionLog: localCompletionLog,
          moodLog: localMoodLog,
          loading: false,
        });
        return;
      }

      const [items, journeys] = await Promise.all([
        fetchItems(effectiveUserId),
        fetchJourneyProgress(effectiveUserId),
      ]);

      let completionLog = localCompletionLog;
      let moodLog = localMoodLog;

      if (isSupabaseConfigured && supabase) {
        const [remoteLogs, remoteMoods] = await Promise.all([
          fetchCompletionLogs(effectiveUserId),
          fetchMoodEntries(effectiveUserId),
        ]);

        if (remoteLogs && remoteLogs.length > 0) {
          for (const row of remoteLogs) {
            const key = (row as { date: string }).date;
            const remote = row as { done: number; skipped: number; total: number };
            const local = completionLog[key];
            if (!local || remote.total > local.total) {
              completionLog[key] = { done: remote.done, skipped: remote.skipped, total: remote.total };
            }
          }
          saveCompletionLogToStorage(completionLog);
        }

        if (remoteMoods && remoteMoods.length > 0) {
          const localDates = new Set(moodLog.map(m => m.date));
          for (const row of remoteMoods) {
            const entry = row as { timestamp: string; value: string | number };
            if (!localDates.has(entry.timestamp)) {
              const moodVal = (typeof entry.value === 'number' ? entry.value : parseInt(entry.value, 10) || 3) as MoodValue;
              moodLog.push({ date: entry.timestamp, mood: moodVal });
            }
          }
          moodLog.sort((a, b) => a.date.localeCompare(b.date));
          saveMoodLogToStorage(moodLog);
        }
      }

      set({
        items: (items ?? []) as Item[],
        journeys: journeys ?? [],
        completionLog,
        moodLog,
        loading: false,
      });

      if (isSupabaseConfigured && supabase) {
        supabase
          .channel('items_changes')
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'items', filter: `user_id=eq.${effectiveUserId}` },
            () => fetchItems(effectiveUserId).then(fresh => set({ items: (fresh ?? []) as Item[] }))
          )
          .subscribe();
      }
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  addItem: (item) => {
    set(s => ({ items: [item, ...s.items] }));
    if (item.user_id && item.user_id !== 'guest') {
      upsertItem(item as unknown as Record<string, unknown>)
        .then(() => {
          if (item.steps?.length) {
            const stepsWithItemId = item.steps.map(s => ({ ...s, item_id: item.id }));
            return Promise.all(
              stepsWithItemId.map(s => upsertStep(s as unknown as Record<string, unknown>))
            );
          }
        })
        .catch(console.error);
    }
  },

  updateItem: (id, patch) => {
    set(s => ({
      items: s.items.map(i =>
        i.id === id ? { ...i, ...patch, updated_at: new Date().toISOString() } : i
      ),
    }));
    syncItem(get().items.find(i => i.id === id));
  },

  removeItem: (id) => {
    const item = get().items.find(i => i.id === id);
    set(s => ({ items: s.items.filter(i => i.id !== id) }));
    if (item?.user_id !== 'guest') {
      deleteItem(id).catch(console.error);
    }
  },

  pauseItem: (id) => {
    set(s => ({
      items: s.items.map(i =>
        i.id === id ? { ...i, status: 'paused' as const, paused_at: new Date().toISOString(), updated_at: new Date().toISOString() } : i
      ),
    }));
    syncItem(get().items.find(i => i.id === id));
  },

  resumeItem: (id) => {
    set(s => ({
      items: s.items.map(i =>
        i.id === id ? { ...i, status: 'active' as const, paused_at: undefined, updated_at: new Date().toISOString() } : i
      ),
    }));
    syncItem(get().items.find(i => i.id === id));
  },

  completeItem: (id) => {
    set(s => ({
      items: s.items.map(i =>
        i.id === id ? { ...i, status: 'done' as const, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() } : i
      ),
    }));
    syncItem(get().items.find(i => i.id === id));
  },

  activateDream: (id, asType) => {
    set(s => ({
      items: s.items.map(i => {
        if (i.id !== id) return i;
        const now = new Date().toISOString();
        if (asType === 'habit') {
          return { ...i, status: 'active' as const, recurrence: { type: 'daily' as const }, habit_duration: 15, habit_time_of_day: 'morning' as const, updated_at: now };
        }
        if (asType === 'project') {
          return {
            ...i,
            status: 'active' as const,
            steps: [
              { id: Crypto.randomUUID(), item_id: i.id, title: 'Plan first step', done: false, status: 'todo' as const, priority: 'normal' as const, effort: 'quick' as const, today: false, blocked_by: [], assignees: [], sort_order: 0 },
              { id: Crypto.randomUUID(), item_id: i.id, title: 'Get started', done: false, status: 'todo' as const, priority: 'normal' as const, effort: 'medium' as const, today: false, blocked_by: [], assignees: [], sort_order: 1 },
              { id: Crypto.randomUUID(), item_id: i.id, title: 'Complete', done: false, status: 'todo' as const, priority: 'normal' as const, effort: 'medium' as const, today: false, blocked_by: [], assignees: [], sort_order: 2 },
            ],
            updated_at: now,
          };
        }
        return { ...i, status: 'active' as const, updated_at: now };
      }),
    }));
    syncItem(get().items.find(i => i.id === id));
  },

  toggleStep: (itemId, stepId, done) => {
    set(s => ({
      items: s.items.map(item => {
        if (item.id !== itemId) return item;
        const steps = (item.steps ?? []).map(step => {
          if (step.id !== stepId) return step;
          const newSubtasks = done && step.subtasks
            ? step.subtasks.map(st => ({ ...st, done: true }))
            : step.subtasks;
          return { ...step, done, status: (done ? 'done' : 'todo') as Step['status'], subtasks: newSubtasks };
        });
        return { ...item, steps };
      }),
    }));
    if (isSupabaseConfigured && supabase) {
      supabase.from('steps').update({ done, status: done ? 'done' : 'todo' })
        .eq('id', stepId).then(({ error }) => { if (error) console.error(error); });
    }
  },

  markStepToday: (itemId, stepId, today) => {
    set(s => ({
      items: s.items.map(item => {
        if (item.id !== itemId) return item;
        const steps = (item.steps ?? []).map(step =>
          step.id === stepId ? { ...step, today } : step
        );
        return { ...item, steps };
      }),
    }));
    if (isSupabaseConfigured && supabase) {
      supabase.from('steps').update({ today }).eq('id', stepId)
        .then(({ error }) => { if (error) console.error(error); });
    }
  },

  addStep: (itemId, step) => {
    set(s => ({
      items: s.items.map(item => {
        if (item.id !== itemId) return item;
        return { ...item, steps: [...(item.steps || []), step], updated_at: new Date().toISOString() };
      }),
    }));
    if (isSupabaseConfigured && supabase) {
      upsertStep(step as unknown as Record<string, unknown>).catch(console.error);
    }
  },

  removeStep: (itemId, stepId) => {
    set(s => ({
      items: s.items.map(item => {
        if (item.id !== itemId || !item.steps) return item;
        return { ...item, steps: item.steps.filter(s => s.id !== stepId), updated_at: new Date().toISOString() };
      }),
    }));
    if (isSupabaseConfigured && supabase) {
      supabase.from('steps').delete().eq('id', stepId)
        .then(({ error }) => { if (error) console.error(error); });
    }
  },

  updateStep: (itemId, stepId, patch) => {
    set(s => ({
      items: s.items.map(item => {
        if (item.id !== itemId || !item.steps) return item;
        return {
          ...item,
          steps: item.steps.map(s => s.id === stepId ? { ...s, ...patch } : s),
          updated_at: new Date().toISOString(),
        };
      }),
    }));
    if (isSupabaseConfigured && supabase) {
      supabase.from('steps').update(patch).eq('id', stepId)
        .then(({ error }) => { if (error) console.error(error); });
    }
  },

  updateStepStatus: (itemId, stepId, status) => {
    const done = status === 'done';
    set(s => ({
      items: s.items.map(item => {
        if (item.id !== itemId || !item.steps) return item;
        return {
          ...item,
          steps: item.steps.map(s => s.id === stepId ? { ...s, status: status as Step['status'], done } : s),
        };
      }),
    }));
    if (isSupabaseConfigured && supabase) {
      supabase.from('steps').update({ status, done }).eq('id', stepId)
        .then(({ error }) => { if (error) console.error(error); });
    }
  },

  toggleSubtask: (itemId, stepId, subtaskId) => {
    set(s => ({
      items: s.items.map(item => {
        if (item.id !== itemId || !item.steps) return item;
        const newSteps = item.steps.map(step => {
          if (step.id !== stepId || !step.subtasks) return step;
          const newSubtasks = step.subtasks.map(st =>
            st.id === subtaskId ? { ...st, done: !st.done } : st
          );
          const allDone = newSubtasks.every(st => st.done);
          return {
            ...step,
            subtasks: newSubtasks,
            done: allDone,
            status: (allDone ? 'done' : step.status === 'done' ? 'doing' : step.status) as Step['status'],
          };
        });
        return { ...item, steps: newSteps };
      }),
    }));
  },

  addSubtask: (itemId, stepId, subtask) => {
    set(s => ({
      items: s.items.map(item => {
        if (item.id !== itemId || !item.steps) return item;
        return {
          ...item,
          steps: item.steps.map(step => {
            if (step.id !== stepId) return step;
            return { ...step, subtasks: [...(step.subtasks || []), subtask] };
          }),
        };
      }),
    }));
  },

  removeSubtask: (itemId, stepId, subtaskId) => {
    set(s => ({
      items: s.items.map(item => {
        if (item.id !== itemId || !item.steps) return item;
        return {
          ...item,
          steps: item.steps.map(step => {
            if (step.id !== stepId || !step.subtasks) return step;
            return { ...step, subtasks: step.subtasks.filter(st => st.id !== subtaskId) };
          }),
        };
      }),
    }));
  },

  enrollJourney: (journeyId) => {
    const uid = get().userId ?? 'guest';
    const entry: JourneyProgress = {
      id: Crypto.randomUUID(), user_id: uid, journey_id: journeyId,
      status: 'active', current_week: 1, current_day: 1, streak: 0,
      enrolled_at: new Date().toISOString(),
    };
    set(s => ({ journeys: [...s.journeys, entry] }));
    if (uid !== 'guest' && isSupabaseConfigured && supabase) {
      supabase.from('journey_progress').upsert({
        user_id: uid, journey_id: journeyId,
        status: 'active', current_week: 1, current_day: 1, streak: 0,
      }).then(({ error }) => { if (error) console.error(error); });
    }
  },

  recordCompletion: (_actionId, status) => {
    const todayKey = new Date().toISOString().slice(0, 10);
    set(s => {
      const entry = s.completionLog[todayKey] || { done: 0, skipped: 0, total: 0 };
      const newLog = {
        ...s.completionLog,
        [todayKey]: {
          done: entry.done + (status === 'done' ? 1 : 0),
          skipped: entry.skipped + (status === 'skipped' ? 1 : 0),
          total: entry.total + 1,
        },
      };
      saveCompletionLogToStorage(newLog);
      const uid = s.userId ?? 'guest';
      if (uid !== 'guest' && isSupabaseConfigured) {
        upsertCompletionLog(uid, todayKey, newLog[todayKey]).catch(console.error);
      }
      return { completionLog: newLog };
    });
  },

  recordMood: (mood) => {
    const now = new Date().toISOString();
    set(s => {
      const newEntry: MoodEntry = { date: now, mood };
      const newLog = [...s.moodLog, newEntry];
      saveMoodLogToStorage(newLog);
      const uid = s.userId ?? 'guest';
      if (uid !== 'guest' && isSupabaseConfigured) {
        upsertMoodEntry(uid, mood, now).catch(console.error);
      }
      return { moodLog: newLog };
    });
  },

  streak: () => {
    const log = get().completionLog;
    let count = 0;
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const startOffset = (log[todayKey]?.done ?? 0) > 0 ? 0 : 1;
    for (let d = startOffset; d < 365; d++) {
      const dt = new Date();
      dt.setDate(dt.getDate() - d);
      const key = dt.toISOString().slice(0, 10);
      if ((log[key]?.done ?? 0) > 0) count++;
      else break;
    }
    return count;
  },

  weeklyData: () => {
    const log = get().completionLog;
    const days = [];
    for (let d = 6; d >= 0; d--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - d);
      const key = dt.toISOString().slice(0, 10);
      const entry = log[key];
      days.push({
        label: dt.toLocaleDateString('en-AU', { weekday: 'short' }).slice(0, 2),
        date: key,
        done: entry?.done || 0,
        total: entry?.total || 0,
        isToday: d === 0,
      });
    }
    return days;
  },

  activeItems:  () => get().items.filter(i => i.status === 'active'),
  pausedItems:  () => get().items.filter(i => i.status === 'paused'),
  somedayItems: () => get().items.filter(i => i.status === 'someday'),
  doneItems:    () => get().items.filter(i => i.status === 'done'),
  projectItems: () => get().items.filter(i => i.status === 'active' && (i.steps?.length ?? 0) > 0),
  habitItems:   () => get().items.filter(i => i.status === 'active' && !!i.recurrence),
  actionItems:  () => get().items.filter(i => i.status === 'active' && !i.steps?.length && !i.recurrence),
  itemsByArea:  (area) => get().items.filter(i =>
    (i.status === 'active' || i.status === 'paused') &&
    (i.area === area || (i.secondary_areas ?? []).includes(area))
  ),
  getItem: (id) => get().items.find(i => i.id === id),
}));
