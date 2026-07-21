import "client-only";

import { supabase } from "@/lib/supabase";
import { fromBabyRow } from "@/services/baby-service";
import { useAuthStore } from "@/store/auth-store";
import type { BabyProfile } from "@/types";
import type { BabyRow } from "@/types/database";

type LoginResult =
  | {
      success: true;
      baby: BabyProfile;
    }
  | {
      success: false;
      error: string;
    };

export async function login(username: string, passcode: string): Promise<LoginResult> {
  const { data, error } = await supabase
    .from("babies")
    .select("*")
    .or(`username.eq.${username},name.eq.${username}`)
    .eq("passcode", passcode)
    .maybeSingle();

  if (error) {
    console.error("Login lookup failed:", error);

    return {
      success: false,
      error: "Unable to login. Please try again.",
    };
  }

  if (!data) {
    return {
      success: false,
      error: "Invalid username or passcode.",
    };
  }

  const baby = fromBabyRow(data as BabyRow);

  useAuthStore.getState().setBaby(baby);

  return {
    success: true,
    baby,
  };
}
