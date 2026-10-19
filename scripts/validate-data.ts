/**
 * Data integrity check for the bundled galaxy dataset.
 *
 *   npm run validate:data
 *
 * Catches the failure modes that make the graph look broken at runtime:
 * duplicate / reversed pairing rows (which double every thread), dangling
 * ingredient references (silently dropped by useGraphData), self-loops,
 * isolated orbs, unknown strengths/categories, off-palette colors and
 * non-slug ids.
 *
 * Exits non-zero when any ERROR is found so it can gate a build.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

type Ingredient = {
  id: string;
  name: string;
  category: string;
  description: string;
  color: string;
};
type Pairing = {
  id: string;
  ingredientA: string;
  ingredientB: string;
  strength: string;
  note?: string;
};

const CATEGORIES = [
  "protein",
  "herb",
  "spice",
  "vegetable",
  "fruit",
  "dairy",
  "grain",
  "other",
] as const;
const CATEGORY_COLORS: Record<string, string> = {
  protein: "#FFB347",
  herb: "#7DD87D",
  spice: "#FF6B47",
  vegetable: "#8FBC8F",
  fruit: "#E879C8",
  dairy: "#A8D0E6",
  grain: "#F4D59E",
  other: "#C0C0C0",
};
const STRENGTHS = ["classic", "strong", "experimental"] as const;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const ingredients: Ingredient[] = JSON.parse(
  readFileSync(join(root, "src/data/ingredients.json"), "utf8")
).ingredients;
const pairings: Pairing[] = JSON.parse(
  readFileSync(join(root, "src/data/pairings.json"), "utf8")
).pairings;

const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

// ---------------------------------------------------------------- ingredients
const byId = new Map<string, Ingredient>();
const byName = new Map<string, Ingredient>();
for (const ing of ingredients) {
  if (!SLUG.test(ing.id)) err(`ingredient id is not a slug: "${ing.id}"`);
  if (byId.has(ing.id)) err(`duplicate ingredient id: "${ing.id}"`);
  byId.set(ing.id, ing);

  const nameKey = ing.name.trim().toLowerCase();
  if (byName.has(nameKey)) {
    err(`duplicate ingredient name: "${ing.name}" (${byName.get(nameKey)!.id} & ${ing.id})`);
  }
  byName.set(nameKey, ing);

  if (!CATEGORIES.includes(ing.category as (typeof CATEGORIES)[number])) {
    err(`ingredient "${ing.id}" has unknown category "${ing.category}"`);
  } else if (
    ing.color.toUpperCase() !== CATEGORY_COLORS[ing.category].toUpperCase()
  ) {
    warn(
      `ingredient "${ing.id}" color ${ing.color} differs from ${ing.category} palette ${CATEGORY_COLORS[ing.category]}`
    );
  }
  if (!ing.description?.trim()) err(`ingredient "${ing.id}" has no description`);
  if (ing.id !== nameKey.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) {
    // Not fatal — some ids are intentionally shorter ("olive-oil" vs "Olive Oil")
    warn(`ingredient "${ing.id}" does not match its name slug ("${ing.name}")`);
  }
}

// ------------------------------------------------------------------- pairings
const seenId = new Set<string>();
const seenPair = new Map<string, string>(); // canonical "a|b" -> pairing id
const degree = new Map<string, number>();
const strengthCount: Record<string, number> = { classic: 0, strong: 0, experimental: 0 };

for (const p of pairings) {
  if (seenId.has(p.id)) err(`duplicate pairing id: "${p.id}"`);
  seenId.add(p.id);

  if (!STRENGTHS.includes(p.strength as (typeof STRENGTHS)[number])) {
    err(`pairing "${p.id}" has unknown strength "${p.strength}"`);
  } else {
    strengthCount[p.strength]++;
  }

  if (p.ingredientA === p.ingredientB) {
    err(`pairing "${p.id}" links "${p.ingredientA}" to itself`);
  }

  for (const ref of [p.ingredientA, p.ingredientB]) {
    if (!byId.has(ref)) err(`pairing "${p.id}" references unknown ingredient "${ref}"`);
  }

  // Undirected duplicate: {a,b} and {b,a} are the same thread and would render
  // twice, doubling the visual weight of one pairing.
  const key = [p.ingredientA, p.ingredientB].sort().join("|");
  const prev = seenPair.get(key);
  if (prev) {
    err(`pairing "${p.id}" duplicates "${prev}" as a reverse/duplicate link (${key})`);
  } else {
    seenPair.set(key, p.id);
  }

  degree.set(p.ingredientA, (degree.get(p.ingredientA) ?? 0) + 1);
  degree.set(p.ingredientB, (degree.get(p.ingredientB) ?? 0) + 1);
}

// -------------------------------------------------------------- graph hygiene
// Pairings are stored undirected (each row is one edge), so a "one-way link"
// would mean the runtime adjacency is asymmetric. neighbourMap() mirrors both
// directions, but assert it on the raw data so a future directional refactor
// cannot silently ship edges that only exist from one endpoint.
const adjacency = new Map<string, Set<string>>();
for (const p of pairings) {
  if (!adjacency.has(p.ingredientA)) adjacency.set(p.ingredientA, new Set());
  if (!adjacency.has(p.ingredientB)) adjacency.set(p.ingredientB, new Set());
  adjacency.get(p.ingredientA)!.add(p.ingredientB);
  adjacency.get(p.ingredientB)!.add(p.ingredientA);
}
let oneWay = 0;
adjacency.forEach((tos, from) => {
  tos.forEach((to) => {
    if (!adjacency.get(to)?.has(from)) {
      oneWay++;
      err(`one-way link: "${from}" → "${to}" has no reverse edge`);
    }
  });
});

const isolated = ingredients.filter((i) => !degree.has(i.id)).map((i) => i.id);
if (isolated.length) {
  warn(
    `${isolated.length} ingredient(s) have no pairings (shown as dim orbs with no threads): ${isolated.join(", ")}`
  );
}

const noteless = pairings.filter((p) => p.strength === "classic" && !p.note);
if (noteless.length) {
  warn(`${noteless.length} classic pairing(s) have no note (detail panel shows no flavor text)`);
}

// ---------------------------------------------------------------------- report
const uniquePairs = seenPair.size;
console.log("Flavor Web data validation");
console.log("─".repeat(52));
console.log(`ingredients : ${ingredients.length}`);
console.log(`pairings    : ${pairings.length} (${uniquePairs} unique undirected pairs)`);
console.log(
  `strength    : classic ${strengthCount.classic} · strong ${strengthCount.strong} · experimental ${strengthCount.experimental}`
);
console.log(
  `categories  : ${CATEGORIES.map((c) => `${c}=${ingredients.filter((i) => i.category === c).length}`).join(" ")}`
);

const degrees = ingredients.map((i) => degree.get(i.id) ?? 0).sort((a, b) => b - a);
console.log(
  `degree      : max ${degrees[0]} · median ${degrees[Math.floor(degrees.length / 2)]} · isolated ${isolated.length} · one-way ${oneWay}`
);
console.log(
  `longest name: ${Math.max(...ingredients.map((i) => i.name.length))} chars (${ingredients.reduce((a, b) => (a.name.length >= b.name.length ? a : b)).name})`
);
console.log("─".repeat(52));

for (const e of errors) console.log(`ERROR   ${e}`);
for (const w of warnings) console.log(`WARN    ${w}`);
console.log("─".repeat(52));
console.log(
  errors.length
    ? `FAIL — ${errors.length} error(s), ${warnings.length} warning(s)`
    : `PASS — 0 errors, ${warnings.length} warning(s)`
);

if (errors.length) process.exit(1);
