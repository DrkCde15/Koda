import { create } from "zustand";

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  collapsedSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
}

const STORAGE_KEY = "koda.ui";

function load(): { sidebarCollapsed: boolean; collapsedSections: Record<string, boolean> } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { sidebarCollapsed: false, collapsedSections: {} };
}

export const useUiStore = create<UiState>((set) => ({
  ...load(),
  toggleSidebar: () =>
    set((s) => {
      const sidebarCollapsed = !s.sidebarCollapsed;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...load(), sidebarCollapsed }));
      return { sidebarCollapsed };
    }),
  toggleSection: (key) =>
    set((s) => {
      const collapsedSections = { ...s.collapsedSections, [key]: !s.collapsedSections[key] };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ sidebarCollapsed: s.sidebarCollapsed, collapsedSections })
      );
      return { collapsedSections };
    }),
}));
