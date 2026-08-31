import { GoogleGenAI } from "@google/genai";
import { OUTFIT_STYLIST_PROMPT } from "./prompts/outfitStylist";
import { outfitStylistResponseSchema } from "../schemas";
import type { Garment, Outfit, UserProfile } from "../types";

const DEFAULT_MODEL = "gemini-3.6-flash";
const DEFAULT_MAX_TOKENS = 1024;
const OUTFIT_GENERATION_MAX_TOKENS = 4096;

export interface ImageData {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

interface GeminiInlineDataPart {
  inlineData: {
    data: string;
    mimeType: ImageData["mediaType"];
  };
}

interface GeminiTextPart {
  text: string;
}

type GeminiUserContentPart = GeminiInlineDataPart | GeminiTextPart;

interface CallClaudeParams {
  systemPrompt: string;
  userContent: string | GeminiUserContentPart[];
  maxTokens?: number;
}

export async function callClaude({
  systemPrompt,
  userContent,
  maxTokens = DEFAULT_MAX_TOKENS,
}: CallClaudeParams): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: userContent,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini API response did not contain a text part");
  }

  return text;
}

export async function analyzeImage(
  systemPrompt: string,
  image: ImageData,
  userText?: string
): Promise<string> {
  return callClaude({
    systemPrompt,
    userContent: [
      {
        inlineData: {
          data: image.base64,
          mimeType: image.mediaType,
        },
      },
      {
        text: userText ?? "Analyze this image.",
      },
    ],
  });
}

export async function generateOutfits(
  wardrobe: Garment[],
  profile: UserProfile
): Promise<Outfit[]> {
  const responseText = await callClaude({
    systemPrompt: OUTFIT_STYLIST_PROMPT,
    userContent: JSON.stringify({ wardrobe, profile }),
    maxTokens: OUTFIT_GENERATION_MAX_TOKENS,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Gemini API response was not valid JSON: ${responseText}`
    );
  }

  const result = outfitStylistResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Gemini API response did not match the expected shape: ${result.error.message}`
    );
  }

  return result.data.outfits;
}
