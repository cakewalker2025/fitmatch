import { z } from "zod";

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "must be a 6-digit hex color (e.g. #a1b2c3)");

export const garmentCategorySchema = z.enum([
  "top",
  "bottom",
  "dress",
  "outerwear",
  "footwear",
  "accessory",
]);

export const patternSchema = z.enum([
  "solid",
  "striped",
  "plaid",
  "floral",
  "polka-dot",
  "graphic",
  "textured",
  "other",
]);

export const fabricWeightSchema = z.enum(["light", "medium", "heavy"]);

export const formalitySchema = z.enum([
  "casual",
  "smart-casual",
  "business",
  "formal",
]);

export const garmentSchema = z.object({
  id: z.string(),
  category: garmentCategorySchema,
  primaryColor: hexColorSchema,
  secondaryColors: z.array(hexColorSchema),
  pattern: patternSchema,
  fabricWeight: fabricWeightSchema,
  formality: formalitySchema,
});

/** The shape returned by the vision model, before an id is assigned. */
export const garmentAttributesSchema = garmentSchema.omit({ id: true });

export const harmonyModelSchema = z.enum([
  "monochromatic",
  "analogous",
  "complementary",
  "triadic",
]);

export const confidenceSchema = z.enum(["high", "medium", "low"]);

export const outfitSchema = z.object({
  itemIds: z.array(z.string()),
  harmonyModel: harmonyModelSchema,
  colorRoles: z.object({
    dominant: z.string(),
    secondary: z.string(),
    accent: z.string(),
  }),
  reasoning: z.string(),
  confidence: confidenceSchema,
});

export const outfitStylistResponseSchema = z.object({
  outfits: z.array(outfitSchema),
  notes: z.string().optional(),
});
