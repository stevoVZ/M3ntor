import { create } from 'zustand';
import type { Item, Step, Subtask, JourneyProgress, Profile, CompletionLog, MoodEntry, MoodValue, ScoreSnapshot } from '../types';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured, fetchItems, fetchDeletedItems, fetchJourneyProgress, upsertItem, deleteItem, softDeleteItem, restoreDeletedItem, upsertStep, upsertSubtask, upsertCompletionLog, fetchCompletionLogs, upsertMoodEntry, fetchMoodEntries, upsertJourneyProgress } from './supabase';
import { PRG } from '../constants/config';
import { WA } from '../constants/weekly-actions';

const COMPLETION_LOG_KEY = 'm3ntor_completion_log';
const MOOD_LOG_KEY = 'm3ntor_mood_log';
const COUNTRY_KEY = 'm3ntor_country';
const SELF_SCORES_KEY = 'm3ntor_self_scores';
const SCORE_HISTORY_KEY = 'm3ntor_score_history';
const GUEST_ITEMS_KEY = 'm3ntor_guest_items';
const GUEST_DELETED_ITEMS_KEY = 'm3ntor_guest_deleted_items';
const GUEST_JOURNEYS_KEY = 'm3ntor_guest_journeys';
const GUEST_NAME_KEY = 'm3ntor_guest_name';

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

async function saveSelfScoresToStorage(scores: Record<string, number>) {
  try {
    await AsyncStorage.setItem(SELF_SCORES_KEY, JSON.stringify(scores));
  } catch (e) {
    console.error('Failed to save selfScores:', e);
  }
}

async function loadSelfScoresFromStorage(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(SELF_SCORES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveScoreHistoryToStorage(history: ScoreSnapshot[]) {
  try {
    await AsyncStorage.setItem(SCORE_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save scoreHistory:', e);
  }
}

async function loadScoreHistoryFromStorage(): Promise<ScoreSnapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(SCORE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveGuestItemsToStorage(items: Item[], deleted: Item[]) {
  try {
    await Promise.all([
      AsyncStorage.setItem(GUEST_ITEMS_KEY, JSON.stringify(items)),
      AsyncStorage.setItem(GUEST_DELETED_ITEMS_KEY, JSON.stringify(deleted)),
    ]);
  } catch (e) {
    console.error('Failed to save guest items:', e);
  }
}

async function loadGuestItemsFromStorage(): Promise<{ items: Item[]; deleted: Item[] }> {
  try {
    const [rawItems, rawDeleted] = await Promise.all([
      AsyncStorage.getItem(GUEST_ITEMS_KEY),
      AsyncStorage.getItem(GUEST_DELETED_ITEMS_KEY),
    ]);
    return {
      items: rawItems ? JSON.parse(rawItems) : [],
      deleted: rawDeleted ? JSON.parse(rawDeleted) : [],
    };
  } catch {
    return { items: [], deleted: [] };
  }
}

async function saveGuestJourneysToStorage(journeys: JourneyProgress[]) {
  try {
    await AsyncStorage.setItem(GUEST_JOURNEYS_KEY, JSON.stringify(journeys));
  } catch (e) {
    console.error('Failed to save guest journeys:', e);
  }
}

async function loadGuestJourneysFromStorage(): Promise<JourneyProgress[]> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_JOURNEYS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveGuestNameToStorage(name: string) {
  try {
    await AsyncStorage.setItem(GUEST_NAME_KEY, name);
  } catch (e) {
    console.error('Failed to save guest name:', e);
  }
}

async function loadGuestNameFromStorage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(GUEST_NAME_KEY);
  } catch {
    return null;
  }
}

interface AppState {
  items:         Item[];
  deletedItems:  Item[];
  journeys:      JourneyProgress[];
  profile:       Profile | null;
  userId:        string | null;
  loading:       boolean;
  error:         string | null;
  completionLog: CompletionLog;
  moodLog:       MoodEntry[];
  selfScores:    Record<string, number>;
  scoreHistory:  ScoreSnapshot[];

  setUserId:       (id: string | null) => void;
  setCountry:      (country: string | null) => void;
  loadAll:         (userId: string) => Promise<void>;

  addItem:         (item: Item) => void;
  updateItem:      (id: string, patch: Partial<Item>) => void;
  removeItem:      (id: string) => void;
  restoreItem:     (id: string) => void;
  permanentlyDeleteItem: (id: string) => void;
  pauseItem:       (id: string) => void;
  resumeItem:      (id: string) => void;
  completeItem:    (id: string) => void;
  toggleStep:      (itemId: string, stepId: string, done: boolean) => void;
  markStepToday:   (itemId: string, stepId: string, today: boolean) => void;
  addStep:         (itemId: string, step: Step) => void;
  removeStep:      (itemId: string, stepId: string) => void;
  updateStep:      (itemId: string, stepId: string, patch: Partial<Step>) => void;
  updateStepStatus:(itemId: string, stepId: string, status: string) => void;
  reorderStep:     (itemId: string, stepId: string, direction: 'up' | 'down') => void;
  reorderItem:     (itemId: string, direction: 'up' | 'down', scopeFilter?: (item: Item) => boolean) => void;

  toggleSubtask:   (itemId: string, stepId: string, subtaskId: string) => void;
  addSubtask:      (itemId: string, stepId: string, subtask: Subtask) => void;
  removeSubtask:   (itemId: string, stepId: string, subtaskId: string) => void;
  reorderSubtask:  (itemId: string, stepId: string, subtaskId: string, direction: 'up' | 'down') => void;

  enrollJourney:   (journeyId: string) => void;
  unenrollJourney: (journeyId: string) => void;
  removeJourney:   (journeyId: string) => void;
  reEnrollJourney: (journeyId: string, reset: boolean) => void;
  advanceJourneyDay: (journeyId: string) => void;
  recordCompletion:(actionId: string, status: 'done' | 'skipped') => void;
  recordMood:      (mood: MoodValue) => void;
  setSelfScore:    (areaId: string, score: number) => void;
  saveScoreSnapshot: () => void;

  setName:         (name: string) => void;
  signOut:         () => Promise<void>;

  streak:          () => number;
  getItem:         (id: string) => Item | undefined;
}

function syncItem(item: Item | undefined) {
  if (item && item.user_id !== 'guest') {
    upsertItem(item as unknown as Record<string, unknown>).catch(console.error);
  }
}

export const useStore = create<AppState>((set, get) => ({
  items:         [],
  deletedItems:  [],
  journeys:      [],
  profile:       null,
  userId:        null,
  loading:       false,
  error:         null,
  completionLog: {},
  moodLog:       [],
  selfScores:    {},
  scoreHistory:  [],

  setUserId:  (id) => set({ userId: id }),
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
      set({ userId: effectiveUserId });

      const [localCompletionLog, localMoodLog, savedCountry, localSelfScores, localScoreHistory] = await Promise.all([
        loadCompletionLogFromStorage(),
        loadMoodLogFromStorage(),
        AsyncStorage.getItem(COUNTRY_KEY).catch(() => null),
        loadSelfScoresFromStorage(),
        loadScoreHistoryFromStorage(),
      ]);

      if (isGuest) {
        const [guestData, guestJourneys, guestName] = await Promise.all([
          loadGuestItemsFromStorage(),
          loadGuestJourneysFromStorage(),
          loadGuestNameFromStorage(),
        ]);
        set({
          items: guestData.items,
          deletedItems: guestData.deleted,
          journeys: guestJourneys,
          profile: { id: 'guest', created_at: new Date().toISOString(), country: savedCountry || undefined, name: guestName || undefined },
          completionLog: localCompletionLog,
          moodLog: localMoodLog,
          selfScores: localSelfScores,
          scoreHistory: localScoreHistory,
          loading: false,
        });
        return;
      }

      const [items, journeys, deleted] = await Promise.all([
        fetchItems(effectiveUserId),
        fetchJourneyProgress(effectiveUserId),
        fetchDeletedItems(effectiveUserId),
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

      const loadedItems = (items ?? []) as Item[];
      const loadedJourneys = journeys ?? [];
      const itemIds = new Set(loadedItems.map(i => i.id));
      const syntheticJourneyItems: Item[] = [];
      for (const jp of loadedJourneys) {
        if (!itemIds.has(jp.journey_id)) {
          const prog = PRG.find(p => p.id === jp.journey_id);
          syntheticJourneyItems.push({
            id: jp.journey_id,
            user_id: effectiveUserId,
            title: prog?.t || jp.journey_id,
            emoji: '',
            area: prog?.a || 'learning',
            status: jp.status === 'done' ? 'done' : jp.status === 'paused' ? 'paused' : 'active',
            source: 'journey',
            priority: 'normal',
            effort: 'medium',
            created_at: jp.enrolled_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      set({
        items: [...loadedItems, ...syntheticJourneyItems],
        deletedItems: (deleted ?? []) as Item[],
        journeys: loadedJourneys,
        completionLog,
        moodLog,
        selfScores: localSelfScores,
        scoreHistory: localScoreHistory,
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
    const maxOrder = get().items.reduce((max, i) => Math.max(max, i.sort_order ?? 0), 0);
    const withOrder = item.sort_order != null ? item : { ...item, sort_order: maxOrder + 1 };
    set(s => ({ items: [withOrder, ...s.items] }));
    if (withOrder.user_id && withOrder.user_id !== 'guest') {
      upsertItem(withOrder as unknown as Record<string, unknown>)
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
    if (!item) return;
    const now = new Date().toISOString();
    const deletedItem = { ...item, deleted_at: now };
    set(s => ({
      items: s.items.filter(i => i.id !== id),
      deletedItems: [deletedItem, ...s.deletedItems],
    }));
    if (item.user_id !== 'guest') {
      softDeleteItem(id).catch(console.error);
    }
  },

  restoreItem: (id) => {
    const item = get().deletedItems.find(i => i.id === id);
    if (!item) return;
    const restored = { ...item, deleted_at: undefined };
    set(s => ({
      deletedItems: s.deletedItems.filter(i => i.id !== id),
      items: [restored, ...s.items],
    }));
    if (item.user_id !== 'guest') {
      restoreDeletedItem(id).catch(console.error);
    }
  },

  permanentlyDeleteItem: (id) => {
    const item = get().deletedItems.find(i => i.id === id);
    set(s => ({ deletedItems: s.deletedItems.filter(i => i.id !== id) }));
    if (item && item.user_id !== 'guest') {
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
    const now = new Date().toISOString();
    set(s => ({
      items: s.items.map(i =>
        i.id === id ? { ...i, status: 'active' as const, paused_at: undefined, started_at: i.started_at || now, updated_at: now } : i
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

  toggleStep: (itemId, stepId, done) => {
    set(s => ({
      items: s.items.map(item => {
        if (item.id !== itemId) return item;
        const steps = (item.steps ?? []).map(step => {
          if (step.id !== stepId) return step;
          const newSubtasks = done && step.subtasks
            ? step.subtasks.map(st => ({ ...st, done: true }))
            : step.subtasks;
          const now = new Date().toISOString();
          return { ...step, done, status: (done ? 'done' : 'todo') as Step['status'], subtasks: newSubtasks, updated_at: now, completed_at: done ? now : undefined };
        });
        return { ...item, steps, updated_at: new Date().toISOString() };
      }),
    }));
    if (isSupabaseConfigured && supabase) {
      const now = new Date().toISOString();
      supabase.from('steps').update({ done, status: done ? 'done' : 'todo', updated_at: now, completed_at: done ? now : null })
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

  reorderStep: (itemId, stepId, direction) => {
    set(s => ({
      items: s.items.map(item => {
        if (item.id !== itemId || !item.steps) return item;
        const sorted = [...item.steps].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const idx = sorted.findIndex(st => st.id === stepId);
        if (idx < 0) return item;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= sorted.length) return item;
        const tempOrder = sorted[idx].sort_order ?? idx;
        sorted[idx] = { ...sorted[idx], sort_order: sorted[swapIdx].sort_order ?? swapIdx };
        sorted[swapIdx] = { ...sorted[swapIdx], sort_order: tempOrder };
        return { ...item, steps: sorted, updated_at: new Date().toISOString() };
      }),
    }));
    const item = get().items.find(i => i.id === itemId);
    if (isSupabaseConfigured && supabase && item?.steps) {
      const step = item.steps.find(st => st.id === stepId);
      const sorted = [...item.steps].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const idx = sorted.findIndex(st => st.id === stepId);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      const other = sorted[swapIdx];
      if (step && other) {
        supabase.from('steps').update({ sort_order: step.sort_order }).eq('id', step.id).then(() => {});
        supabase.from('steps').update({ sort_order: other.sort_order }).eq('id', other.id).then(() => {});
      }
    }
  },

  reorderItem: (itemId, direction, scopeFilter) => {
    set(s => {
      const scope = scopeFilter ? s.items.filter(scopeFilter) : s.items;
      const sorted = [...scope].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const idx = sorted.findIndex(i => i.id === itemId);
      if (idx < 0) return s;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return s;
      const orderA = sorted[idx].sort_order ?? idx;
      const orderB = sorted[swapIdx].sort_order ?? swapIdx;
      const now = new Date().toISOString();
      return {
        items: s.items.map(item => {
          if (item.id === sorted[idx].id) return { ...item, sort_order: orderB, updated_at: now };
          if (item.id === sorted[swapIdx].id) return { ...item, sort_order: orderA, updated_at: now };
          return item;
        }),
      };
    });
    const items = get().items;
    if (isSupabaseConfigured && supabase) {
      const moved = items.find(i => i.id === itemId);
      const scope = scopeFilter ? items.filter(scopeFilter) : items;
      const sorted = [...scope].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const idx = sorted.findIndex(i => i.id === itemId);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      const other = sorted[swapIdx];
      if (moved && other) {
        supabase.from('items').update({ sort_order: moved.sort_order }).eq('id', moved.id).then(() => {});
        supabase.from('items').update({ sort_order: other.sort_order }).eq('id', other.id).then(() => {});
      }
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
    const item = get().items.find(i => i.id === itemId);
    if (item && item.user_id !== 'guest' && isSupabaseConfigured) {
      const step = item.steps?.find(s => s.id === stepId);
      const sub = step?.subtasks?.find(st => st.id === subtaskId);
      if (sub) {
        upsertSubtask({ id: sub.id, step_id: stepId, title: sub.title, done: sub.done, sort_order: sub.sort_order ?? 0 }).catch(console.error);
      }
      if (step) {
        upsertStep({ id: step.id, item_id: itemId, title: step.title, done: step.done, status: step.status, sort_order: step.sort_order ?? 0 }).catch(console.error);
      }
    }
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
    const item = get().items.find(i => i.id === itemId);
    if (item && item.user_id !== 'guest' && isSupabaseConfigured) {
      upsertSubtask({ id: subtask.id, step_id: stepId, title: subtask.title, done: subtask.done, sort_order: subtask.sort_order ?? 0 }).catch(console.error);
    }
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

  reorderSubtask: (itemId, stepId, subtaskId, direction) => {
    set(s => ({
      items: s.items.map(item => {
        if (item.id !== itemId || !item.steps) return item;
        return {
          ...item,
          steps: item.steps.map(step => {
            if (step.id !== stepId || !step.subtasks) return step;
            const sorted = [...step.subtasks].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
            const idx = sorted.findIndex(st => st.id === subtaskId);
            if (idx < 0) return step;
            const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= sorted.length) return step;
            const orderA = sorted[idx].sort_order ?? idx;
            const orderB = sorted[swapIdx].sort_order ?? swapIdx;
            sorted[idx] = { ...sorted[idx], sort_order: orderB };
            sorted[swapIdx] = { ...sorted[swapIdx], sort_order: orderA };
            return { ...step, subtasks: sorted };
          }),
          updated_at: new Date().toISOString(),
        };
      }),
    }));
  },

  enrollJourney: (journeyId) => {
    const existing = get().journeys.find(j => j.journey_id === journeyId);
    if (existing && existing.status === 'active') return;
    const uid = get().userId ?? 'guest';
    const now = new Date().toISOString();

    if (existing && existing.status === 'paused') {
      get().reEnrollJourney(journeyId, false);
      return;
    }

    const entry: JourneyProgress = {
      id: Crypto.randomUUID(), user_id: uid, journey_id: journeyId,
      status: 'active', current_week: 1, current_day: 1, streak: 0,
      enrolled_at: now,
    };
    const prog = PRG.find(p => p.id === journeyId);
    const syntheticItem: Item = {
      id: journeyId,
      user_id: uid,
      title: prog?.t || journeyId,
      emoji: '',
      area: prog?.a || 'learning',
      status: 'active',
      source: 'journey',
      priority: 'normal',
      effort: 'medium',
      created_at: now,
      updated_at: now,
    };
    set(s => {
      const alreadyExists = s.items.some(i => i.id === journeyId);
      return {
        journeys: [...s.journeys, entry],
        items: alreadyExists ? s.items : [...s.items, syntheticItem],
      };
    });
    if (uid !== 'guest' && isSupabaseConfigured && supabase) {
      supabase.from('journey_progress').upsert({
        user_id: uid, journey_id: journeyId,
        status: 'active', current_week: 1, current_day: 1, streak: 0,
      }).then(({ error }) => { if (error) console.error(error); });
    }
  },

  unenrollJourney: (journeyId) => {
    const uid = get().userId ?? 'guest';
    set(s => ({
      journeys: s.journeys.map(j =>
        j.journey_id === journeyId ? { ...j, status: 'paused' as const } : j
      ),
      items: s.items.map(i =>
        i.id === journeyId && i.source === 'journey'
          ? { ...i, status: 'paused' as const, paused_at: new Date().toISOString(), updated_at: new Date().toISOString() }
          : i
      ),
    }));
    if (uid !== 'guest' && isSupabaseConfigured && supabase) {
      supabase.from('journey_progress')
        .update({ status: 'paused' })
        .eq('journey_id', journeyId)
        .eq('user_id', uid)
        .then(({ error }) => { if (error) console.error(error); });
      upsertItem({ id: journeyId, user_id: uid, status: 'paused', paused_at: new Date().toISOString(), updated_at: new Date().toISOString() }).catch(console.error);
    }
  },

  removeJourney: (journeyId) => {
    const uid = get().userId ?? 'guest';
    set(s => ({
      journeys: s.journeys.filter(j => j.journey_id !== journeyId),
      items: s.items.filter(i => !(i.id === journeyId && i.source === 'journey')),
    }));
    if (uid !== 'guest' && isSupabaseConfigured && supabase) {
      supabase.from('journey_progress')
        .delete()
        .eq('journey_id', journeyId)
        .eq('user_id', uid)
        .then(({ error }) => { if (error) console.error(error); });
      deleteItem(journeyId).catch(console.error);
    }
  },

  reEnrollJourney: (journeyId, reset) => {
    const uid = get().userId ?? 'guest';
    const now = new Date().toISOString();
    const prog = PRG.find(p => p.id === journeyId);

    const newJp = reset
      ? { status: 'active' as const, current_week: 1, current_day: 1, streak: 0 }
      : { status: 'active' as const };

    set(s => {
      const updated = s.journeys.map(j => {
        if (j.journey_id !== journeyId) return j;
        return reset
          ? { ...j, ...newJp, last_session_at: undefined }
          : { ...j, status: 'active' as const };
      });
      const alreadyExists = s.items.some(i => i.id === journeyId);
      const syntheticItem: Item = {
        id: journeyId,
        user_id: uid,
        title: prog?.t || journeyId,
        emoji: '',
        area: prog?.a || 'learning',
        status: 'active',
        source: 'journey',
        priority: 'normal',
        effort: 'medium',
        created_at: now,
        updated_at: now,
      };
      return {
        journeys: updated,
        items: alreadyExists ? s.items.map(i => i.id === journeyId ? { ...i, status: 'active' as const, paused_at: undefined, updated_at: now } : i) : [...s.items, syntheticItem],
      };
    });

    if (uid !== 'guest' && isSupabaseConfigured && supabase) {
      const updatedJp = get().journeys.find(j => j.journey_id === journeyId);
      upsertJourneyProgress({
        user_id: uid,
        journey_id: journeyId,
        status: 'active',
        current_week: updatedJp?.current_week ?? 1,
        current_day: updatedJp?.current_day ?? 1,
        streak: updatedJp?.streak ?? 0,
      }).catch(console.error);
      upsertItem({ id: journeyId, user_id: uid, status: 'active', paused_at: null, updated_at: now }).catch(console.error);
    }
  },

  advanceJourneyDay: (journeyId) => {
    const uid = get().userId ?? 'guest';
    const prog = PRG.find(p => p.id === journeyId);
    if (!prog) return;

    let updatedJp: JourneyProgress | undefined;
    let journeyDone = false;

    set(s => {
      const updated = s.journeys.map(j => {
        if (j.journey_id !== journeyId || j.status !== 'active') return j;
        const now = new Date().toISOString();
        const currentDay = j.current_day ?? 1;
        const totalWeeks = prog.w;

        const wa = WA[journeyId];
        const weekIndex = Math.min(j.current_week - 1, (wa?.length ?? 1) - 1);
        const daysInWeek = wa?.[weekIndex]?.length ?? 7;

        let result: JourneyProgress;
        if (currentDay >= daysInWeek) {
          if (j.current_week >= totalWeeks) {
            result = { ...j, status: 'done' as const, current_day: currentDay, last_session_at: now };
            journeyDone = true;
          } else {
            result = { ...j, current_week: j.current_week + 1, current_day: 1, streak: j.streak + 1, last_session_at: now };
          }
        } else {
          result = { ...j, current_day: currentDay + 1, streak: j.streak + 1, last_session_at: now };
        }
        updatedJp = result;
        return result;
      });

      const items = journeyDone
        ? s.items.map(i => i.id === journeyId ? { ...i, status: 'done' as const, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() } : i)
        : s.items;

      return { journeys: updated, items };
    });

    if (uid !== 'guest' && isSupabaseConfigured && supabase && updatedJp) {
      upsertJourneyProgress({
        user_id: uid,
        journey_id: journeyId,
        status: updatedJp.status,
        current_week: updatedJp.current_week,
        current_day: updatedJp.current_day ?? 1,
        streak: updatedJp.streak,
      }).catch(console.error);
      if (journeyDone) {
        const item = get().items.find(i => i.id === journeyId);
        if (item) syncItem(item);
      }
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

  setSelfScore: (areaId, score) => {
    const clamped = Math.min(10, Math.max(1, Math.round(score)));
    set(s => {
      const updated = { ...s.selfScores, [areaId]: clamped };
      saveSelfScoresToStorage(updated);
      const history = s.scoreHistory;
      const now = new Date();
      const isFirstSnapshot = history.length === 0;
      const lastSnap = history.length > 0 ? history[history.length - 1] : null;
      const hoursSinceLast = lastSnap ? (now.getTime() - new Date(lastSnap.date).getTime()) / (1000 * 60 * 60) : Infinity;
      if (isFirstSnapshot || hoursSinceLast >= 24) {
        const snapshot: ScoreSnapshot = { date: now.toISOString(), scores: { ...updated } };
        const newHistory = [...history, snapshot];
        saveScoreHistoryToStorage(newHistory);
        return { selfScores: updated, scoreHistory: newHistory };
      }
      return { selfScores: updated };
    });
  },

  saveScoreSnapshot: () => {
    const { selfScores, scoreHistory } = get();
    if (Object.keys(selfScores).length === 0) return;
    const snapshot: ScoreSnapshot = { date: new Date().toISOString(), scores: { ...selfScores } };
    const newHistory = [...scoreHistory, snapshot];
    set({ scoreHistory: newHistory });
    saveScoreHistoryToStorage(newHistory);
  },

  setName: (name) => {
    set(s => ({
      profile: s.profile ? { ...s.profile, name } : null,
    }));
    const uid = get().userId;
    if (!uid || uid === 'guest') {
      saveGuestNameToStorage(name);
    } else if (isSupabaseConfigured && supabase) {
      supabase.from('profiles').update({ name }).eq('id', uid).then(({ error }) => {
        if (error) console.error('Failed to save name:', error);
      });
    }
  },

  signOut: async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut().catch(console.error);
    }
    set({
      items: [],
      deletedItems: [],
      journeys: [],
      profile: null,
      userId: null,
      loading: false,
      error: null,
      completionLog: {},
      moodLog: [],
      selfScores: {},
      scoreHistory: [],
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

  getItem: (id) => get().items.find(i => i.id === id),
}));

let _guestSaveTimer: ReturnType<typeof setTimeout> | null = null;
let _guestDirty = { items: false, journeys: false };

useStore.subscribe((state, prevState) => {
  if (state.userId !== 'guest') return;
  if (state.items !== prevState.items || state.deletedItems !== prevState.deletedItems) _guestDirty.items = true;
  if (state.journeys !== prevState.journeys) _guestDirty.journeys = true;
  if (!_guestDirty.items && !_guestDirty.journeys) return;
  if (_guestSaveTimer) clearTimeout(_guestSaveTimer);
  _guestSaveTimer = setTimeout(() => {
    const s = useStore.getState();
    if (_guestDirty.items) saveGuestItemsToStorage(s.items, s.deletedItems);
    if (_guestDirty.journeys) saveGuestJourneysToStorage(s.journeys);
    _guestDirty = { items: false, journeys: false };
  }, 150);
});
