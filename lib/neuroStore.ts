import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  mergeAdaptations,
  todayDateKey,
  DEFAULT_ADAPTATIONS,
} from '../constants/neuro';
import type {
  BaseProfileId,
  StateProfileId,
  NeuroAdaptations,
  NeuroCustomOverrides,
} from '../constants/neuro';

const KEY_BASE   = 'm3ntor_neuro_base';
const KEY_STATE  = 'm3ntor_neuro_state';
const KEY_CUSTOM = 'm3ntor_neuro_custom';

interface NeuroState {
  baseProfileId: BaseProfileId;
  stateProfileId: StateProfileId;
  customOverrides: NeuroCustomOverrides;
  adaptations: NeuroAdaptations;
  loaded: boolean;

  loadAll: () => Promise<void>;
  setBase: (id: BaseProfileId) => Promise<void>;
  setState: (id: StateProfileId) => Promise<void>;
  setCustom: (overrides: NeuroCustomOverrides) => Promise<void>;
  patchCustom: (patch: Partial<NeuroCustomOverrides>) => Promise<void>;
  resetCustom: () => Promise<void>;
  clearAll: () => Promise<void>;
}

function compute(
  base: BaseProfileId,
  state: StateProfileId,
  custom: NeuroCustomOverrides,
): NeuroAdaptations {
  return mergeAdaptations(base, state, custom);
}

export const useNeuroStore = create<NeuroState>((set, get) => ({
  baseProfileId: null,
  stateProfileId: null,
  customOverrides: {},
  adaptations: DEFAULT_ADAPTATIONS,
  loaded: false,

  loadAll: async () => {
    try {
      const [baseRaw, stateRaw, customRaw] = await Promise.all([
        AsyncStorage.getItem(KEY_BASE),
        AsyncStorage.getItem(KEY_STATE),
        AsyncStorage.getItem(KEY_CUSTOM),
      ]);

      const base = (baseRaw as BaseProfileId) ?? null;

      let stateId: StateProfileId = null;
      if (stateRaw) {
        try {
          const parsed = JSON.parse(stateRaw) as { id: StateProfileId; date: string };
          if (parsed.date === todayDateKey()) {
            stateId = parsed.id;
          } else {
            AsyncStorage.removeItem(KEY_STATE).catch(() => {});
          }
        } catch { /* malformed */ }
      }

      const custom: NeuroCustomOverrides = customRaw
        ? JSON.parse(customRaw)
        : {};

      set({
        baseProfileId: base,
        stateProfileId: stateId,
        customOverrides: custom,
        adaptations: compute(base, stateId, custom),
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },

  setBase: async (id: BaseProfileId) => {
    try {
      if (id) {
        await AsyncStorage.setItem(KEY_BASE, id);
      } else {
        await AsyncStorage.removeItem(KEY_BASE);
      }
      const { stateProfileId, customOverrides } = get();
      set({ baseProfileId: id, adaptations: compute(id, stateProfileId, customOverrides) });
    } catch (e) {
      console.error('neuroStore.setBase failed:', e);
    }
  },

  setState: async (id: StateProfileId) => {
    try {
      if (id) {
        const payload = JSON.stringify({ id, date: todayDateKey() });
        await AsyncStorage.setItem(KEY_STATE, payload);
      } else {
        await AsyncStorage.removeItem(KEY_STATE);
      }
      const { baseProfileId, customOverrides } = get();
      set({ stateProfileId: id, adaptations: compute(baseProfileId, id, customOverrides) });
    } catch (e) {
      console.error('neuroStore.setState failed:', e);
    }
  },

  setCustom: async (overrides: NeuroCustomOverrides) => {
    try {
      await AsyncStorage.setItem(KEY_CUSTOM, JSON.stringify(overrides));
      const { baseProfileId, stateProfileId } = get();
      set({ customOverrides: overrides, adaptations: compute(baseProfileId, stateProfileId, overrides) });
    } catch (e) {
      console.error('neuroStore.setCustom failed:', e);
    }
  },

  patchCustom: async (patch: Partial<NeuroCustomOverrides>) => {
    const current = get().customOverrides;
    const next = { ...current, ...patch };
    await get().setCustom(next);
  },

  resetCustom: async () => {
    try {
      await AsyncStorage.removeItem(KEY_CUSTOM);
      const { baseProfileId, stateProfileId } = get();
      set({ customOverrides: {}, adaptations: compute(baseProfileId, stateProfileId, {}) });
    } catch (e) {
      console.error('neuroStore.resetCustom failed:', e);
    }
  },

  clearAll: async () => {
    try {
      await AsyncStorage.multiRemove([KEY_BASE, KEY_STATE, KEY_CUSTOM]);
      set({
        baseProfileId: null,
        stateProfileId: null,
        customOverrides: {},
        adaptations: DEFAULT_ADAPTATIONS,
      });
    } catch (e) {
      console.error('neuroStore.clearAll failed:', e);
    }
  },
}));
