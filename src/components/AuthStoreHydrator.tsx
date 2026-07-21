"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

/** Hydrates persisted client session state before route guards consume it. */
export function AuthStoreHydrator() {
  useEffect(() => {
    void Promise.resolve(useAuthStore.persist.rehydrate()).finally(() => {
      useAuthStore.getState().setHasHydrated(true);
    });
  }, []);

  return null;
}
