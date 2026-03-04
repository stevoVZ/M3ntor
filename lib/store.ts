import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { Item, itemKind, ItemKind, TimeOfDay, Profile, Step } from '@/types';
import { loadItems, saveItem as persistItem, updateItem as persistUpdate, deleteItem as persistDelete, toggleItemDone as persistToggle, addStepToItem as persistAddStep, toggleStepDone as persistToggleStep, deleteStep as persistDeleteStep } from '@/lib/storage';
import { isSupabaseConfigured, getSupabase, fetchItems as fetchSupabaseItems, upsertItem as upsertSupabaseItem, deleteItemRemote, upsertStep as upsertSupabaseStep, deleteStepRemote } from '@/lib/supabase';

interface AuthState {
  userId: string | null;
  profile: Profile | null;
}

interface ItemsContextValue {
  items: Item[];
  isLoading: boolean;
  userId: string | null;
  profile: Profile | null;
  setUserId: (id: string | null) => void;
  setProfile: (p: Profile | null) => void;
  refresh: () => Promise<void>;
  addItem: (item: Item) => Promise<void>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  toggleDone: (id: string) => Promise<void>;
  addStep: (itemId: string, step: Item['steps'] extends (infer S)[] | undefined ? S : never) => Promise<void>;
  toggleStep: (itemId: string, stepId: string) => Promise<void>;
  removeStep: (itemId: string, stepId: string) => Promise<void>;
  getItemsByArea: (area: string) => Item[];
  getItemsByKind: (kind: ItemKind) => Item[];
  getTodayItems: () => { morning: Item[]; afternoon: Item[]; evening: Item[]; actions: Item[] };
  getActiveItems: () => Item[];
  getCompletedToday: () => Item[];
  signOut: () => Promise<void>;
}

const ItemsContext = createContext<ItemsContextValue | null>(null);

export function ItemsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auth, setAuth] = useState<AuthState>({ userId: null, profile: null });

  const setUserId = useCallback((id: string | null) => {
    setAuth((prev) => ({ ...prev, userId: id }));
  }, []);

  const setProfile = useCallback((p: Profile | null) => {
    setAuth((prev) => ({ ...prev, profile: p }));
  }, []);

  const authListenerSet = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured || authListenerSet.current) return;
    authListenerSet.current = true;
    const sb = getSupabase();
    if (!sb) return;

    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuth({ userId: session.user.id, profile: null });
      }
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuth({ userId: session.user.id, profile: null });
      } else {
        setAuth({ userId: null, profile: null });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (auth.userId && isSupabaseConfigured) {
      try {
        const remote = await fetchSupabaseItems(auth.userId);
        if (remote.length > 0) {
          setItems(remote);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.error('Supabase fetch failed, falling back to local:', e);
      }
    }
    const loaded = await loadItems();
    setItems(loaded);
    setIsLoading(false);
  }, [auth.userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const syncToSupabase = useCallback(async (item: Item) => {
    if (auth.userId && isSupabaseConfigured) {
      try {
        await upsertSupabaseItem({ ...item, user_id: auth.userId });
      } catch (e) {
        console.error('Supabase sync error:', e);
      }
    }
  }, [auth.userId]);

  const addItem = useCallback(async (item: Item) => {
    const itemWithUser = auth.userId ? { ...item, user_id: auth.userId } : item;
    await persistItem(itemWithUser);
    setItems((prev) => [...prev, itemWithUser]);
    syncToSupabase(itemWithUser);
  }, [auth.userId, syncToSupabase]);

  const updateItemFn = useCallback(async (id: string, updates: Partial<Item>) => {
    const updated = await persistUpdate(id, updates);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      syncToSupabase(updated);
    }
  }, [syncToSupabase]);

  const removeItem = useCallback(async (id: string) => {
    await persistDelete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (auth.userId && isSupabaseConfigured) {
      deleteItemRemote(id).catch(console.error);
    }
  }, [auth.userId]);

  const toggleDone = useCallback(async (id: string) => {
    const updated = await persistToggle(id);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      syncToSupabase(updated);
    }
  }, [syncToSupabase]);

  const syncStepToSupabase = useCallback(async (step: Step) => {
    if (auth.userId && isSupabaseConfigured) {
      try {
        await upsertSupabaseStep(step);
      } catch (e) {
        console.error('Supabase step sync error:', e);
      }
    }
  }, [auth.userId]);

  const addStep = useCallback(async (itemId: string, step: any) => {
    const updated = await persistAddStep(itemId, step);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
      syncToSupabase(updated);
      syncStepToSupabase(step);
    }
  }, [syncToSupabase, syncStepToSupabase]);

  const toggleStep = useCallback(async (itemId: string, stepId: string) => {
    const updated = await persistToggleStep(itemId, stepId);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
      syncToSupabase(updated);
      const step = updated.steps?.find(s => s.id === stepId);
      if (step) syncStepToSupabase(step);
    }
  }, [syncToSupabase, syncStepToSupabase]);

  const removeStep = useCallback(async (itemId: string, stepId: string) => {
    const updated = await persistDeleteStep(itemId, stepId);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
      syncToSupabase(updated);
      if (auth.userId && isSupabaseConfigured) {
        deleteStepRemote(stepId).catch(console.error);
      }
    }
  }, [syncToSupabase, auth.userId]);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      const sb = getSupabase();
      if (sb) await sb.auth.signOut();
    }
    setAuth({ userId: null, profile: null });
  }, []);

  const getItemsByArea = useCallback(
    (area: string) => items.filter((i) => i.area === area && i.status !== 'done'),
    [items],
  );

  const getItemsByKind = useCallback(
    (kind: ItemKind) => items.filter((i) => itemKind(i) === kind),
    [items],
  );

  const getTodayItems = useCallback(() => {
    const active = items.filter((i) => i.status === 'active');
    const habits = active.filter((i) => i.recurrence);
    const actions = active.filter((i) => !i.recurrence && (!i.steps || i.steps.length === 0));

    return {
      morning: habits.filter((h) => h.habit_time_of_day === 'morning'),
      afternoon: habits.filter((h) => h.habit_time_of_day === 'afternoon'),
      evening: habits.filter((h) => h.habit_time_of_day === 'evening' || !h.habit_time_of_day),
      actions,
    };
  }, [items]);

  const getActiveItems = useCallback(
    () => items.filter((i) => i.status === 'active'),
    [items],
  );

  const getCompletedToday = useCallback(() => {
    const today = new Date().toDateString();
    return items.filter(
      (i) => i.completed_at && new Date(i.completed_at).toDateString() === today,
    );
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      isLoading,
      userId: auth.userId,
      profile: auth.profile,
      setUserId,
      setProfile,
      refresh,
      addItem,
      updateItem: updateItemFn,
      removeItem,
      toggleDone,
      addStep,
      toggleStep,
      removeStep,
      getItemsByArea,
      getItemsByKind,
      getTodayItems,
      getActiveItems,
      getCompletedToday,
      signOut,
    }),
    [items, isLoading, auth.userId, auth.profile, setUserId, setProfile, refresh, addItem, updateItemFn, removeItem, toggleDone, addStep, toggleStep, removeStep, getItemsByArea, getItemsByKind, getTodayItems, getActiveItems, getCompletedToday, signOut],
  );

  return React.createElement(ItemsContext.Provider, { value }, children);
}

export function useItems() {
  const context = useContext(ItemsContext);
  if (!context) {
    throw new Error('useItems must be used within an ItemsProvider');
  }
  return context;
}
