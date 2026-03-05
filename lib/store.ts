import { create } from 'zustand';
import type { Item, JourneyProgress, Profile } from '../types';
import * as Crypto from 'expo-crypto';
import { supabase, isSupabaseConfigured, fetchItems, fetchJourneyProgress, upsertItem, deleteItem, upsertStep } from './supabase';

interface AppState {
  items:     Item[];
  journeys:  JourneyProgress[];
  profile:   Profile | null;
  userId:    string | null;
  loading:   boolean;
  error:     string | null;

  setUserId:  (id: string | null) => void;
  setProfile: (p: Profile | null) => void;
  loadAll:    (userId: string) => Promise<void>;
  addItem:    (item: Item) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  removeItem: (id: string) => void;
  toggleStep: (itemId: string, stepId: string, done: boolean) => void;
  markStepToday: (itemId: string, stepId: string, today: boolean) => void;
  enrollJourney: (journeyId: string) => void;

  activeItems:  () => Item[];
  pausedItems:  () => Item[];
  somedayItems: () => Item[];
  projectItems: () => Item[];
  habitItems:   () => Item[];
  actionItems:  () => Item[];
  itemsByArea:  (area: string) => Item[];
  getItem:      (id: string) => Item | undefined;
}

export const useStore = create<AppState>((set, get) => ({
  items:    [],
  journeys: [],
  profile:  null,
  userId:   null,
  loading:  false,
  error:    null,

  setUserId:  (id) => set({ userId: id }),
  setProfile: (p)  => set({ profile: p }),

  loadAll: async (userId) => {
    set({ loading: true, error: null });
    try {
      const [items, journeys] = await Promise.all([
        fetchItems(userId),
        fetchJourneyProgress(userId),
      ]);
      set({ items: (items ?? []) as Item[], journeys: journeys ?? [], loading: false });

      if (isSupabaseConfigured && supabase) {
        supabase
          .channel('items_changes')
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'items', filter: `user_id=eq.${userId}` },
            () => fetchItems(userId).then(fresh => set({ items: (fresh ?? []) as Item[] }))
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
    const updated = get().items.find(i => i.id === id);
    if (updated && updated.user_id !== 'guest') {
      upsertItem(updated as unknown as Record<string, unknown>).catch(console.error);
    }
  },

  removeItem: (id) => {
    const item = get().items.find(i => i.id === id);
    set(s => ({ items: s.items.filter(i => i.id !== id) }));
    if (item?.user_id !== 'guest') {
      deleteItem(id).catch(console.error);
    }
  },

  toggleStep: (itemId, stepId, done) => {
    set(s => ({
      items: s.items.map(item => {
        if (item.id !== itemId) return item;
        const steps = (item.steps ?? []).map(step =>
          step.id === stepId
            ? { ...step, done, status: done ? 'done' : 'todo' as any }
            : step
        );
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

  enrollJourney: (journeyId) => {
    const uid = get().userId;
    if (!uid) return;
    const entry: JourneyProgress = {
      id: Crypto.randomUUID(), user_id: uid, journey_id: journeyId,
      status: 'active', current_week: 1, streak: 0,
      enrolled_at: new Date().toISOString(),
    };
    set(s => ({ journeys: [...s.journeys, entry] }));
    if (isSupabaseConfigured && supabase) {
      supabase.from('journey_progress').upsert({
        user_id: uid, journey_id: journeyId,
        status: 'active', current_week: 1, streak: 0,
      }).then(({ error }) => { if (error) console.error(error); });
    }
  },

  // ── Selectors ────────────────────────────────────────────
  activeItems:  () => get().items.filter(i => i.status === 'active'),
  pausedItems:  () => get().items.filter(i => i.status === 'paused'),
  somedayItems: () => get().items.filter(i => i.status === 'someday'),
  projectItems: () => get().items.filter(i => i.status === 'active' && (i.steps?.length ?? 0) > 0),
  habitItems:   () => get().items.filter(i => i.status === 'active' && !!i.recurrence),
  actionItems:  () => get().items.filter(i => i.status === 'active' && !i.steps?.length && !i.recurrence),
  itemsByArea:  (area) => get().items.filter(i =>
    (i.status === 'active' || i.status === 'paused') &&
    (i.area === area || (i.secondary_areas ?? []).includes(area))
  ),
  getItem: (id) => get().items.find(i => i.id === id),
}));
