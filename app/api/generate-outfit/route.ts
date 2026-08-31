import { generateOutfits } from "@/lib/vision/client";
import { anthropicErrorResponse } from "@/lib/vision/apiError";
import type { Garment, UserProfile } from "@/lib/types";

interface GenerateOutfitBody {
  wardrobe?: unknown;
  profile?: unknown;
}

export async function POST(request: Request) {
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

  return Response.json(outfits);
}
