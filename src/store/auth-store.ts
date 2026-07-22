import "client-only";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthenticatedBaby } from "@/types";

const AUTH_EXPIRY_MS = 1000 * 60 * 60 * 24 * 6; // 6 days

interface AuthStore {
  baby: AuthenticatedBaby | null;
  expiresAt: number | null;
  hasHydrated: boolean;

  setBaby: (baby: AuthenticatedBaby) => void;
  clearAuth: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      baby: null,
      expiresAt: null,
      hasHydrated: false,

      setBaby: (baby) =>
        set({
          baby,
          expiresAt: Date.now() + AUTH_EXPIRY_MS,
        }),

      clearAuth: () =>
        set({
          baby: null,
          expiresAt: null,
        }),

      setHasHydrated: (value) =>
        set({
          hasHydrated: value,
        }),
    }),
    {
      name: "baby-auth",
      skipHydration: true,

      partialize: (state) => ({
        baby: state.baby,
        expiresAt: state.expiresAt,
      }),

      onRehydrateStorage: () => (state) => {
        if (!state) return;

        if (state.expiresAt && Date.now() > state.expiresAt) {
          state.clearAuth();
        }

        state.setHasHydrated(true);
      },
    },
  ),
);
