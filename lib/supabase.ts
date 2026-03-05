import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

function isValidUrl(url: string): boolean {
  try {
    if (!url) return false;
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = isValidUrl(SUPABASE_URL) && SUPABASE_KEY.length > 10;

console.log('[supabase] URL set:', !!SUPABASE_URL, 'KEY set:', !!SUPABASE_KEY, 'configured:', isSupabaseConfigured);

let _supabase: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  _supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage:          AsyncStorage,
      autoRefreshToken: true,
      persistSession:   true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = _supabase as SupabaseClient;

export async function fetchItems(userId: string) {
  if (!_supabase) return [];
  const { data, error } = await _supabase
    .from('items')
    .select('*, steps(*, subtasks(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertItem(item: Record<string, unknown>) {
  if (!_supabase) return null;
  const { data, error } = await _supabase
    .from('items')
    .upsert(item)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteItem(id: string) {
  if (!_supabase) return;
  const { error } = await _supabase.from('items').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertStep(step: Record<string, unknown>) {
  if (!_supabase) return null;
  const { data, error } = await _supabase
    .from('steps')
    .upsert(step)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function upsertSubtask(subtask: Record<string, unknown>) {
  if (!_supabase) return null;
  const { data, error } = await _supabase
    .from('subtasks')
    .upsert(subtask)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchJourneyProgress(userId: string) {
  if (!_supabase) return [];
  const { data, error } = await _supabase
    .from('journey_progress')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}
