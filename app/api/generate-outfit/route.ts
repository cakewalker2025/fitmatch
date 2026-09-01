import { generateOutfits } from "@/lib/vision/client";
import { anthropicErrorResponse } from "@/lib/vision/apiError";
import type { Garment, UserProfile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const FREE_GENERATION_LIMIT = 1;

function currentUtcMonthStart(): string {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${month}-01`;
}

interface GenerateOutfitBody {
  wardrobe?: unknown;
  profile?: unknown;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json(
      { error: "You must be signed in to generate outfits." },
      { status: 401 }
    );
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 500 });
  }

  const isFree = profileRow?.subscription_status !== "active";
  const periodStart = currentUtcMonthStart();

  if (isFree) {
    const { data: usage, error: usageError } = await supabase
      .from("outfit_generation_usage")
      .select("generations_count")
      .eq("user_id", user.id)
      .eq("period_start", periodStart)
      .maybeSingle();

    if (usageError) {
      return Response.json({ error: usageError.message }, { status: 500 });
    }

    if ((usage?.generations_count ?? 0) >= FREE_GENERATION_LIMIT) {
      return Response.json(
        {
          error: `Free plan limit reached (${FREE_GENERATION_LIMIT}/${FREE_GENERATION_LIMIT} this month) — upgrade for unlimited.`,
        },
        { status: 403 }
      );
    }
  }

  let body: GenerateOutfitBody;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const { wardrobe, profile } = body;

  if (!Array.isArray(wardrobe)) {
    return Response.json(
      { error: "Missing or invalid required field: wardrobe (must be an array)" },
      { status: 400 }
    );
  }

  if (typeof profile !== "object" || profile === null) {
    return Response.json(
      { error: "Missing or invalid required field: profile (must be an object)" },
      { status: 400 }
    );
  }

  let outfits;
  try {
    outfits = await generateOutfits(
      wardrobe as Garment[],
      profile as UserProfile
    );
  } catch (error) {
    return anthropicErrorResponse(error);
  }

  if (isFree) {
    const admin = createAdminClient();
    const { error: incrementError } = await admin.rpc("increment_outfit_generation_usage", {
      p_user_id: user.id,
      p_period_start: periodStart,
    });

    if (incrementError) {
      console.warn("Failed to increment outfit generation usage:", incrementError.message);
    }
  }

  return Response.json(outfits);
}
