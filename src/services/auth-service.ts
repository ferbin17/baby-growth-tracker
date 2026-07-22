import "client-only";

import { supabase } from "@/lib/supabase";
import { fromBabyRow } from "@/services/baby-service";
import { useAuthStore } from "@/store/auth-store";
import type { AuthenticatedBaby, BabyProfile } from "@/types";
import type { BabyRow } from "@/types/database";

type LoginResult =
  | {
      success: true;
      baby: AuthenticatedBaby;
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
  const authenticatedBaby = toAuthenticatedBaby(baby);

  useAuthStore.getState().setBaby(authenticatedBaby);

  return {
    success: true,
    baby: authenticatedBaby,
  };
}

export function toAuthenticatedBaby(baby: BabyProfile): AuthenticatedBaby {
  const { username: _username, passcode: _passcode, ...authenticatedBaby } = baby;

  return authenticatedBaby;
}
