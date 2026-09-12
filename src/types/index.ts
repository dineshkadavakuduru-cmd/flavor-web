export type IngredientCategory =
  | "protein"
  | "herb"
  | "spice"
  | "vegetable"
  | "fruit"
  | "dairy"
  | "grain"
  | "other";

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  description: string;
  color: string;
  pairingCount?: number;
}

export interface Pairing {
  id: string;
  ingredientA: string;
  ingredientB: string;
  strength: "classic" | "strong" | "experimental";
  note?: string;
}

export type ViewMode = "galaxy" | "focused";

export const CATEGORY_COLORS: Record<IngredientCategory, string> = {
  protein: "#FFB347",
  herb: "#7DD87D",
  spice: "#FF6B47",
  vegetable: "#8FBC8F",
  fruit: "#E879C8",
  dairy: "#A8D0E6",
  grain: "#F4D59E",
  other: "#C0C0C0",
};

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  protein: "Protein",
  herb: "Herbs",
  spice: "Spices",
  vegetable: "Vegetables",
  fruit: "Fruits",
  dairy: "Dairy",
  grain: "Grains",
  other: "Other",
};

export const STRENGTH_CONFIG = {
  classic: { width: 3, opacity: 1, dash: false, glow: 1.5 },
  strong: { width: 2, opacity: 0.7, dash: false, glow: 1 },
  experimental: { width: 1, opacity: 0.4, dash: true, glow: 0.5 },
} as const;
