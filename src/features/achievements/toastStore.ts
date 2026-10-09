import { create } from 'zustand';

export interface AchievementToastData {
  /** Unique per toast so the banner re-animates for back-to-back unlocks. */
  key: number;
  achievementId: string;
  /** How many other achievements unlocked at the same time. */
  extra: number;
}

interface ToastState {
  toast: AchievementToastData | null;
  show: (toast: AchievementToastData) => void;
  hide: (key: number) => void;
}

/** In-memory (not persisted) state for the "Achievement unlocked" banner. */
export const useAchievementToast = create<ToastState>()((set, get) => ({
  toast: null,
  show: (toast) => set({ toast }),
  hide: (key) => {
    if (get().toast?.key === key) set({ toast: null });
  },
}));
