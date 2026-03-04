import AsyncStorage from '@react-native-async-storage/async-storage';
import { Item, Step } from '@/types';

const ITEMS_KEY = '@m3ntor_items';

export async function loadItems(): Promise<Item[]> {
  const json = await AsyncStorage.getItem(ITEMS_KEY);
  if (!json) return [];
  return JSON.parse(json) as Item[];
}

export async function saveItems(items: Item[]): Promise<void> {
  await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

export async function saveItem(item: Item): Promise<void> {
  const items = await loadItems();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    items[idx] = item;
  } else {
    items.push(item);
  }
  await saveItems(items);
}

export async function updateItem(
  id: string,
  updates: Partial<Item>,
): Promise<Item | null> {
  const items = await loadItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  items[idx] = { ...items[idx], ...updates, updated_at: new Date().toISOString() };
  await saveItems(items);
  return items[idx];
}

export async function deleteItem(id: string): Promise<void> {
  const items = await loadItems();
  await saveItems(items.filter((i) => i.id !== id));
}

export async function toggleItemDone(id: string): Promise<Item | null> {
  const items = await loadItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  const item = items[idx];
  const isDone = item.status === 'done';
  items[idx] = {
    ...item,
    status: isDone ? 'active' : 'done',
    completed_at: isDone ? undefined : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await saveItems(items);
  return items[idx];
}

export async function addStepToItem(
  itemId: string,
  step: Step,
): Promise<Item | null> {
  const items = await loadItems();
  const idx = items.findIndex((i) => i.id === itemId);
  if (idx < 0) return null;
  const item = items[idx];
  const steps = item.steps ?? [];
  steps.push(step);
  items[idx] = { ...item, steps, updated_at: new Date().toISOString() };
  await saveItems(items);
  return items[idx];
}

export async function toggleStepDone(
  itemId: string,
  stepId: string,
): Promise<Item | null> {
  const items = await loadItems();
  const idx = items.findIndex((i) => i.id === itemId);
  if (idx < 0) return null;
  const item = items[idx];
  const steps = (item.steps ?? []).map((s) =>
    s.id === stepId ? { ...s, done: !s.done, status: (!s.done ? 'done' : 'todo') as Step['status'] } : s,
  );
  items[idx] = { ...item, steps, updated_at: new Date().toISOString() };
  await saveItems(items);
  return items[idx];
}

export async function deleteStep(
  itemId: string,
  stepId: string,
): Promise<Item | null> {
  const items = await loadItems();
  const idx = items.findIndex((i) => i.id === itemId);
  if (idx < 0) return null;
  const item = items[idx];
  items[idx] = {
    ...item,
    steps: (item.steps ?? []).filter((s) => s.id !== stepId),
    updated_at: new Date().toISOString(),
  };
  await saveItems(items);
  return items[idx];
}
