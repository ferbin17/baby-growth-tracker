import "client-only";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BabyProfile } from "@/types";

interface AuthStore {
  baby: BabyProfile | null;
  hasHydrated: boolean;
  setBaby: (baby: BabyProfile) => void;
  clearAuth: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      baby: null,
      hasHydrated: false,

      setBaby: (baby) =>
        set({
          baby,
        }),

      clearAuth: () =>
        set({
          baby: null,
        }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "baby-auth",
      skipHydration: true,
      partialize: (state) => ({ baby: state.baby }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
