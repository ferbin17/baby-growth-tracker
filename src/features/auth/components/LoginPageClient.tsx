"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuthStore } from "@/store/auth-store";

export function LoginPageClient() {
  const router = useRouter();
  const baby = useAuthStore((state) => state.baby);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (hasHydrated && baby) {
      router.replace("/");
    }
  }, [baby, hasHydrated, router]);

  if (!hasHydrated || baby) {
    return <PageLoader label="Loading sign in…" />;
  }

  return (
    <main className="flex h-full min-h-0 w-full items-center justify-center bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
