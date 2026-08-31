export type GarmentCategory =
  | "top"
  | "bottom"
  | "dress"
  | "outerwear"
  | "footwear"
  | "accessory";

export type Pattern =
  | "solid"
  | "striped"
  | "plaid"
  | "floral"
  | "polka-dot"
  | "graphic"
  | "textured"
  | "other";

export type FabricWeight = "light" | "medium" | "heavy";

export type Formality = "casual" | "smart-casual" | "business" | "formal";

export interface Garment {
  id: string;
  category: GarmentCategory;
  primaryColor: string;
  secondaryColors: string[];
  pattern: Pattern;
  fabricWeight: FabricWeight;
  formality: Formality;
}

export type SkinUndertone = "warm" | "cool" | "neutral";
export type SkinDepth = "light" | "medium" | "deep";

export interface UserProfile {
  skinUndertone: SkinUndertone;
  skinDepth: SkinDepth;
  hairColor: string;
  eyeColor: string;
  bodyShape: string;
  height: string;
  occasion: string;
  weather?: string;
}

export type HarmonyModel =
  | "monochromatic"
  | "analogous"
  | "complementary"
  | "triadic";

export type Confidence = "high" | "medium" | "low";

export interface ColorRoles {
  dominant: string;
  secondary: string;
  accent: string;
}

export interface Outfit {
  itemIds: string[];
  harmonyModel: HarmonyModel;
  colorRoles: ColorRoles;
  reasoning: string;
  confidence: Confidence;
}
