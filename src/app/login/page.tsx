"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  const router = useRouter();
  const baby = useAuthStore((state) => state.baby);

  useEffect(() => {
    if (baby) {
      router.replace("/");
    }
  }, [baby, router]);

  if (baby) {
    return null;
  }

  return (
    <main className="flex h-full min-h-0 w-full items-center justify-center bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
