import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Item, Step, Subtask, JourneyProgress } from '@/types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

function isValidUrl(url: string): boolean {
  try {
    if (!url) return false;
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = isValidUrl(supabaseUrl) && supabaseAnonKey.length > 10;

let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export function getSupabase(): SupabaseClient | null {
  return supabase;
}

export async function fetchItems(userId: string): Promise<Item[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchItems error:', error.message);
    return [];
  }
  return (data ?? []) as Item[];
}

export async function upsertItem(item: Item): Promise<Item | null> {
  if (!supabase) return null;
  const { steps, ...row } = item;
  const { data, error } = await supabase
    .from('items')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error) {
    console.error('upsertItem error:', error.message);
    return null;
  }
  return data as Item;
}

export async function deleteItemRemote(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) {
    console.error('deleteItem error:', error.message);
    return false;
  }
  return true;
}

export async function fetchSteps(itemId: string): Promise<Step[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('steps')
    .select('*')
    .eq('item_id', itemId)
    .order('sort_order');
  if (error) {
    console.error('fetchSteps error:', error.message);
    return [];
  }
  return (data ?? []) as Step[];
}

export async function upsertStep(step: Step): Promise<Step | null> {
  if (!supabase) return null;
  const { subtasks, ...row } = step;
  const { data, error } = await supabase
    .from('steps')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error) {
    console.error('upsertStep error:', error.message);
    return null;
  }
  return data as Step;
}

export async function deleteStepRemote(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('steps').delete().eq('id', id);
  if (error) {
    console.error('deleteStep error:', error.message);
    return false;
  }
  return true;
}

export async function upsertSubtask(subtask: Subtask): Promise<Subtask | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('subtasks')
    .upsert(subtask, { onConflict: 'id' })
    .select()
    .single();
  if (error) {
    console.error('upsertSubtask error:', error.message);
    return null;
  }
  return data as Subtask;
}

export async function fetchJourneyProgress(userId: string): Promise<JourneyProgress[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('journey_progress')
    .select('*')
    .eq('user_id', userId);
  if (error) {
    console.error('fetchJourneyProgress error:', error.message);
    return [];
  }
  return (data ?? []) as JourneyProgress[];
}
