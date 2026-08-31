import { OUTFIT_STYLIST_PROMPT } from "./prompts/outfitStylist";
import { outfitStylistResponseSchema } from "../schemas";
import type { Garment, Outfit, UserProfile } from "../types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";
const DEFAULT_MAX_TOKENS = 1024;
const OUTFIT_GENERATION_MAX_TOKENS = 4096;

export interface ImageData {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

interface AnthropicImageContentBlock {
  type: "image";
  source: {
    type: "base64";
    media_type: ImageData["mediaType"];
    data: string;
  };
}

interface AnthropicTextContentBlock {
  type: "text";
  text: string;
}

type AnthropicUserContentBlock =
  | AnthropicImageContentBlock
  | AnthropicTextContentBlock;

interface AnthropicResponseContentBlock {
  type: string;
  text?: string;
}

interface AnthropicMessagesResponse {
  content: AnthropicResponseContentBlock[];
  [key: string]: unknown;
}

interface CallClaudeParams {
  systemPrompt: string;
  userContent: string | AnthropicUserContentBlock[];
  maxTokens?: number;
}

export async function callClaude({
  systemPrompt,
  userContent,
  maxTokens = DEFAULT_MAX_TOKENS,
}: CallClaudeParams): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set in the environment");
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Anthropic API request failed (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as AnthropicMessagesResponse;

  if (!Array.isArray(data.content)) {
    throw new Error(
      "Anthropic API response did not contain a content array"
    );
  }

  const textBlock = data.content.find((block) => block.type === "text");

  if (!textBlock?.text) {
    throw new Error("Anthropic API response did not contain a text block");
  }

  return textBlock.text;
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
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType,
          data: image.base64,
        },
      },
      {
        type: "text",
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
      `Anthropic API response was not valid JSON: ${responseText}`
    );
  }

  const result = outfitStylistResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Anthropic API response did not match the expected shape: ${result.error.message}`
    );
  }

  return result.data.outfits;
}
