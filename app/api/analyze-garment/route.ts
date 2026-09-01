import { analyzeImage, type ImageData } from "@/lib/vision/client";
import { anthropicErrorResponse } from "@/lib/vision/apiError";
import { GARMENT_ANALYSIS_PROMPT } from "@/lib/vision/prompts/garmentAnalysis";
import { garmentAttributesSchema } from "@/lib/schemas";
import type { Garment } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

const FREE_GARMENT_LIMIT = 10;

interface AnalyzeGarmentBody {
  base64?: unknown;
  mediaType?: unknown;
}

const ALLOWED_MEDIA_TYPES: ImageData["mediaType"][] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

function isAllowedMediaType(value: string): value is ImageData["mediaType"] {
  return (ALLOWED_MEDIA_TYPES as string[]).includes(value);
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "You must be signed in to add garments." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 500 });
  }

  if (profile?.subscription_status !== "active") {
    const { count, error: countError } = await supabase
      .from("garments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      return Response.json({ error: countError.message }, { status: 500 });
    }

    if ((count ?? 0) >= FREE_GARMENT_LIMIT) {
      return Response.json(
        {
          error: `Free plan limit reached (${FREE_GARMENT_LIMIT}/${FREE_GARMENT_LIMIT} garments) — upgrade to add more.`,
        },
        { status: 403 }
      );
    }
  }

  let body: AnalyzeGarmentBody;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const { base64, mediaType } = body;

  if (typeof base64 !== "string" || base64.length === 0) {
    return Response.json(
      { error: "Missing or invalid required field: base64" },
      { status: 400 }
    );
  }

  if (typeof mediaType !== "string" || !isAllowedMediaType(mediaType)) {
    return Response.json(
      {
        error: `Missing or invalid required field: mediaType (must be one of ${ALLOWED_MEDIA_TYPES.join(", ")})`,
      },
      { status: 400 }
    );
  }

  const image: ImageData = { base64, mediaType };

  let responseText: string;
  try {
    responseText = await analyzeImage(GARMENT_ANALYSIS_PROMPT, image);
  } catch (error) {
    return anthropicErrorResponse(error);
  }

  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(responseText);
  } catch {
    return Response.json(
      {
        error: "Model did not return valid JSON",
        raw: responseText,
      },
      { status: 502 }
    );
  }

  const result = garmentAttributesSchema.safeParse(rawParsed);
  if (!result.success) {
    return Response.json(
      {
        error: "Model output did not match the expected Garment shape",
        issues: result.error.issues,
        raw: responseText,
      },
      { status: 502 }
    );
  }

  const garment: Garment = { id: crypto.randomUUID(), ...result.data };

  return Response.json(garment);
}
