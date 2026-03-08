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
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchDeletedItems(userId: string) {
  if (!_supabase) return [];
  const { data, error } = await _supabase
    .from('items')
    .select('*, steps(*, subtasks(*))')
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) return [];
  return data;
}

export async function softDeleteItem(id: string) {
  if (!_supabase) return;
  const { error } = await _supabase
    .from('items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function restoreDeletedItem(id: string) {
  if (!_supabase) return;
  const { error } = await _supabase
    .from('items')
    .update({ deleted_at: null })
    .eq('id', id);
  if (error) throw error;
}

export async function upsertJourneyProgress(progress: Record<string, unknown>) {
  if (!_supabase) return null;
  const { data, error } = await _supabase
    .from('journey_progress')
    .upsert(progress)
    .select()
    .single();
  if (error) throw error;
  return data;
}

const ITEM_COLUMNS = [
  'id', 'user_id', 'title', 'emoji', 'description', 'area', 'secondary_areas',
  'status', 'source', 'recurrence', 'habit_time_of_day', 'habit_duration',
  'deadline', 'priority', 'effort', 'paused_at', 'completed_at',
  'deleted_at', 'created_at', 'updated_at',
];

export async function upsertItem(item: Record<string, unknown>) {
  if (!_supabase) return null;
  const row: Record<string, unknown> = {};
  for (const key of ITEM_COLUMNS) {
    if (key in item && item[key] !== undefined) {
      row[key] = item[key];
    }
  }
  const { data, error } = await _supabase
    .from('items')
    .upsert(row)
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

const STEP_COLUMNS = [
  'id', 'item_id', 'title', 'description', 'phase', 'done', 'status',
  'priority', 'effort', 'today', 'blocked_by', 'assignees',
  'sort_order', 'created_at',
];

let _stepColumnsBlacklist: Set<string> = new Set();

export async function upsertStep(step: Record<string, unknown>) {
  if (!_supabase) return null;
  const row: Record<string, unknown> = {};
  for (const key of STEP_COLUMNS) {
    if (_stepColumnsBlacklist.has(key)) continue;
    if (key in step && step[key] !== undefined) {
      row[key] = step[key];
    }
  }
  const { data, error } = await _supabase
    .from('steps')
    .upsert(row)
    .select()
    .single();
  if (error && error.code === 'PGRST204' && error.message?.includes("column")) {
    const match = error.message.match(/the '(\w+)' column/);
    if (match) {
      _stepColumnsBlacklist.add(match[1]);
      return upsertStep(step);
    }
  }
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

export async function upsertCompletionLog(
  userId: string,
  date: string,
  entry: { done: number; skipped: number; total: number }
) {
  if (!_supabase) return null;
  const { data, error } = await _supabase
    .from('completion_logs')
    .upsert({
      user_id: userId,
      date,
      done: entry.done,
      skipped: entry.skipped,
      total: entry.total,
    }, { onConflict: 'user_id,date' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchCompletionLogs(userId: string) {
  if (!_supabase) return [];
  const { data, error } = await _supabase
    .from('completion_logs')
    .select('*')
    .eq('user_id', userId);
  if (error) return [];
  return data;
}

export async function upsertMoodEntry(
  userId: string,
  value: number,
  timestamp: string
) {
  if (!_supabase) return null;
  const { data, error } = await _supabase
    .from('mood_entries')
    .insert({
      user_id: userId,
      value,
      timestamp,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchMoodEntries(userId: string) {
  if (!_supabase) return [];
  const { data, error } = await _supabase
    .from('mood_entries')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: true });
  if (error) return [];
  return data;
}
