"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { PageLoader } from "@/components/ui/PageLoader";
import { deleteBabyProfile, getBabyProfile, updateBabyProfile } from "@/services/baby-service";
import type { BabyProfile } from "@/types";

const schema = z.object({
  username: z.string().optional(),
  passcode: z.string().regex(/^[0-9]{4}$/, "Passcode must be 4 digits"),
});

type ProfileFormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<BabyProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      username: "",
      passcode: "",
    },
  });

  useEffect(() => {
    async function load() {
      if (!hasHydrated) return;

      const existingProfile = await getBabyProfile();
      if (!existingProfile) {
        router.replace("/setup");
        return;
      }

      setProfile(existingProfile);
      reset({
        username: existingProfile.username ?? "",
        passcode: existingProfile.passcode ?? "",
      });
      setIsLoaded(true);
    }

    void load();
  }, [hasHydrated, router, reset]);

  const readOnlyFields = useMemo(
    () => [
      { label: "Name", value: profile?.name ?? "" },
      { label: "Birth date", value: profile?.birthDate ?? "" },
      { label: "Birth weight", value: profile?.birthWeightKg ? `${profile.birthWeightKg} kg` : "" },
      { label: "Birth height", value: profile?.birthHeightCm ? `${profile.birthHeightCm} cm` : "" },
    ],
    [profile],
  );

  async function onSubmit(values: ProfileFormValues) {
    if (!profile?.id) return;

    const result = schema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ProfileFormValues;
        setError(field, { type: "validation", message: issue.message });
      }
      return;
    }

    try {
      await updateBabyProfile(profile.id, {
        username: result.data.username,
        passcode: result.data.passcode,
      });
      setProfile((current) =>
        current
          ? {
              ...current,
              username: result.data.username,
              passcode: result.data.passcode,
            }
          : current,
      );
      toast.success("Profile updated.");
      router.push("/");
    } catch {
      toast.error("Could not update the profile. Please try again.");
    }
  }

  async function handleResetProfile() {
    if (!profile?.id) return;
    const confirmed = window.confirm(
      "Reset profile? This will delete all baby data and measurements and return you to setup.",
    );
    if (!confirmed) return;

    setIsResetting(true);
    try {
      await deleteBabyProfile(profile.id);
      toast.success("Profile and measurements reset.");
      router.replace("/setup");
    } catch {
      toast.error("Could not reset the profile. Please try again.");
    } finally {
      setIsResetting(false);
    }
  }

  if (!hasHydrated || !isLoaded) {
    return <PageLoader label="Loading profile…" />;
  }

  return (
    <main className="flex h-full min-h-0 w-full overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col gap-6 overflow-y-auto">
        <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.32em] text-slate-400">Profile</p>
            <h1 className="mt-3 text-4xl font-semibold text-slate-900">Baby profile</h1>
            <p className="mt-2 text-sm text-slate-500">
              Review birth details and update your username or passcode.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {readOnlyFields.map((field) => (
              <div
                key={field.label}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="text-sm font-medium text-slate-500">{field.label}</p>
                <p className="mt-3 text-base font-semibold text-slate-900">{field.value || "—"}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-10 grid gap-6">
            <div className="grid gap-6 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Username</span>
                <input
                  {...register("username")}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="Nickname or handle"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Passcode</span>
                <div className="relative">
                  <input
                    type={showPasscode ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="current-password"
                    maxLength={4}
                    {...register("passcode")}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    placeholder="0000"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode((current) => !current)}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-4 text-slate-400 transition hover:text-slate-600"
                    aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                  >
                    {showPasscode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.passcode ? (
                  <p className="text-sm text-rose-600">{errors.passcode.message}</p>
                ) : null}
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => void handleResetProfile()}
                disabled={isSubmitting || isResetting}
                className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-6 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isResetting ? "Resetting..." : "Reset profile"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isResetting}
                className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSubmitting ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
