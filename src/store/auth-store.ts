import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BabyProfile } from "@/types";

interface AuthStore {
  baby: BabyProfile | null;
  setBaby: (baby: BabyProfile) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      baby: null,

      setBaby: (baby) =>
        set({
          baby,
        }),

      clearAuth: () =>
        set({
          baby: null,
        }),
    }),
    {
      name: "baby-auth",
    },
  ),
);
