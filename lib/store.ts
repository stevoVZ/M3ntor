import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Item, itemKind, ItemKind, TimeOfDay } from '@/types';
import { loadItems, saveItem as persistItem, updateItem as persistUpdate, deleteItem as persistDelete, toggleItemDone as persistToggle, addStepToItem as persistAddStep, toggleStepDone as persistToggleStep, deleteStep as persistDeleteStep } from '@/lib/storage';

interface ItemsContextValue {
  items: Item[];
  isLoading: boolean;
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
}

const ItemsContext = createContext<ItemsContextValue | null>(null);

export function ItemsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const loaded = await loadItems();
    setItems(loaded);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(async (item: Item) => {
    await persistItem(item);
    setItems((prev) => [...prev, item]);
  }, []);

  const updateItemFn = useCallback(async (id: string, updates: Partial<Item>) => {
    const updated = await persistUpdate(id, updates);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    }
  }, []);

  const removeItem = useCallback(async (id: string) => {
    await persistDelete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toggleDone = useCallback(async (id: string) => {
    const updated = await persistToggle(id);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    }
  }, []);

  const addStep = useCallback(async (itemId: string, step: any) => {
    const updated = await persistAddStep(itemId, step);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    }
  }, []);

  const toggleStep = useCallback(async (itemId: string, stepId: string) => {
    const updated = await persistToggleStep(itemId, stepId);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    }
  }, []);

  const removeStep = useCallback(async (itemId: string, stepId: string) => {
    const updated = await persistDeleteStep(itemId, stepId);
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    }
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
    }),
    [items, isLoading, refresh, addItem, updateItemFn, removeItem, toggleDone, addStep, toggleStep, removeStep, getItemsByArea, getItemsByKind, getTodayItems, getActiveItems, getCompletedToday],
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
