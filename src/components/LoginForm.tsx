"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { login } from "@/services/auth-service";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";

interface LoginValues {
  username: string;
  passcode: string;
}

export function LoginForm() {
  const router = useRouter();
  const [showPasscode, setShowPasscode] = useState(false);
  const setBaby = useAuthStore((state) => state.setBaby);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginValues>({
    defaultValues: {
      username: "",
      passcode: "",
    },
  });

  async function onSubmit(values: LoginValues) {
    const result = await login(values.username, values.passcode);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setBaby(result.baby);
    toast.success("Welcome back!");
    router.push("/");
  }

  return (
    <div className="w-full rounded-4xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40">
      <div className="mb-8">
        <div className="inline-flex items-center gap-3 rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
          Baby Growth Tracker
        </div>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900">Welcome back</h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Sign in using your baby name or username and your 4-digit passcode.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Baby name or username</span>

          <input
            {...register("username")}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="e.g. Aisha"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Passcode</span>

          <div className="relative">
            <input
              type={showPasscode ? "text" : "password"}
              inputMode="numeric"
              maxLength={4}
              autoComplete="current-password"
              {...register("passcode")}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-12 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="0000"
            />

            <button
              type="button"
              onClick={() => setShowPasscode((current) => !current)}
              className="absolute inset-y-0 right-0 inline-flex items-center px-4 text-slate-400 hover:text-slate-700"
            >
              {showPasscode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:bg-slate-300"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/setup")}
          className="w-full rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Create new profile
        </button>
      </form>
    </div>
  );
}
