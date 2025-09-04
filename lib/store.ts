"use client";
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  devise: string;
  langue: 'fr'|'en';
  dateFrom: string; // ISO date
  dateTo: string;   // ISO date
  categories: string[];
  setRange: (from: string, to: string) => void;
  setDevise: (d: string) => void;
  addCategory: (c: string) => void;
  removeCategory: (c: string) => void;
}

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0,10);

export const useSettingsStore = create<SettingsState>()(persist((set, get) => ({
  devise: 'DA',
  langue: 'fr',
  dateFrom: iso(today),
  dateTo: iso(today),
  categories: ['Chaises','Tables','Décor','Sonorisation'],
  setRange: (from, to) => set({ dateFrom: from, dateTo: to }),
  setDevise: (d) => set({ devise: d }),
  addCategory: (c) => {
    const v = c.trim();
    if (!v) return;
    if (!get().categories.includes(v)) set({ categories: [...get().categories, v].sort() });
  },
  removeCategory: (c) => set({ categories: get().categories.filter(x => x !== c) }),
}), { name: 'azzouz-settings', storage: createJSONStorage(() => localStorage) }));
